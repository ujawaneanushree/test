import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Copy, Clock, ArrowLeft, Mail, Trash2, LogOut, UserX, Crown, Settings, Check, X, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface Room {
  id: string;
  name: string;
  room_code: string;
  host_id: string;
  is_active: boolean;
  created_at: string;
}

interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  is_active: boolean;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

interface AccessRequest {
  id: string;
  room_id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
}

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  
  // Room settings state
  const [editedRoomName, setEditedRoomName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Access control state
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [requestMessage, setRequestMessage] = useState("");
  const [userAccessRequest, setUserAccessRequest] = useState<AccessRequest | null>(null);
  const [requestingAccess, setRequestingAccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && roomId) {
      fetchRoom();

      // Real-time subscription for room updates
      const roomChannel = supabase
        .channel(`room-${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`,
          },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              const updatedRoom = payload.new as Room;
              if (!updatedRoom.is_active) {
                toast({
                  title: "Room Closed",
                  description: "This room has been closed by the host",
                });
                navigate("/lobby");
              } else {
                setRoom(updatedRoom);
                setEditedRoomName(updatedRoom.name);
              }
            } else if (payload.eventType === 'DELETE') {
              toast({
                title: "Room Deleted",
                description: "This room has been deleted by the host",
              });
              navigate("/lobby");
            }
          }
        )
        .subscribe();

      // Real-time subscription for members
      const membersChannel = supabase
        .channel(`room-members-${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_members',
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMember = payload.new as RoomMember;
              if (newMember.is_active) {
                setMembers((prev) => [...prev, newMember]);
                // Fetch profile for new member
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("user_id, display_name, email")
                  .eq("user_id", newMember.user_id)
                  .single();
                if (profile) {
                  setProfiles((prev) => ({ ...prev, [profile.user_id]: profile }));
                }
              }
            } else if (payload.eventType === 'DELETE') {
              setMembers((prev) => prev.filter((m) => m.id !== payload.old.id));
            } else if (payload.eventType === 'UPDATE') {
              const updatedMember = payload.new as RoomMember;
              if (!updatedMember.is_active) {
                // If current user was kicked, redirect to lobby
                if (updatedMember.user_id === user.id) {
                  toast({
                    title: "Removed from Room",
                    description: "You have been removed from this room by the host",
                  });
                  navigate("/lobby");
                } else {
                  setMembers((prev) => prev.filter((m) => m.id !== updatedMember.id));
                }
              } else {
                setMembers((prev) =>
                  prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
                );
              }
            }
          }
        )
        .subscribe();

      // Real-time subscription for access requests (for host)
      const accessRequestsChannel = supabase
        .channel(`room-access-requests-${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_access_requests',
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const newRequest = payload.new as AccessRequest;
              if (newRequest.status === 'pending') {
                setAccessRequests((prev) => [...prev, newRequest]);
                // Fetch profile for requester
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("user_id, display_name, email")
                  .eq("user_id", newRequest.user_id)
                  .single();
                if (profile) {
                  setProfiles((prev) => ({ ...prev, [profile.user_id]: profile }));
                }
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedRequest = payload.new as AccessRequest;
              if (updatedRequest.user_id === user.id) {
                setUserAccessRequest(updatedRequest);
                if (updatedRequest.status === 'approved') {
                  toast({
                    title: "Access Granted!",
                    description: "Your request to join has been approved",
                  });
                  fetchRoom(); // Refresh to show room content
                } else if (updatedRequest.status === 'rejected') {
                  toast({
                    title: "Request Declined",
                    description: "Your request to join was declined by the host",
                    variant: "destructive",
                  });
                }
              }
              setAccessRequests((prev) =>
                prev.filter((r) => r.id !== updatedRequest.id || updatedRequest.status === 'pending')
              );
            } else if (payload.eventType === 'DELETE') {
              setAccessRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(roomChannel);
        supabase.removeChannel(membersChannel);
        supabase.removeChannel(accessRequestsChannel);
      };
    }
  }, [user, roomId]);

  const fetchRoom = async () => {
    if (!roomId || !user) return;

    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .eq("is_active", true)
      .single();

    if (roomError || !roomData) {
      toast({
        title: "Room Not Found",
        description: "This room doesn't exist or is no longer active",
        variant: "destructive",
      });
      navigate("/lobby");
      return;
    }

    setRoom(roomData);
    setEditedRoomName(roomData.name);

    // Check if user is a member
    const { data: memberData } = await supabase
      .from("room_members")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const isHost = roomData.host_id === user.id;
    const isMember = !!memberData;

    // Fetch members
    const { data: membersData } = await supabase
      .from("room_members")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_active", true);

    setMembers(membersData || []);

    // Fetch profiles for all members
    if (membersData && membersData.length > 0) {
      const userIds = membersData.map((m) => m.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);

      if (profilesData) {
        const profilesMap: Record<string, Profile> = {};
        profilesData.forEach((p) => {
          profilesMap[p.user_id] = p;
        });
        setProfiles(profilesMap);
      }
    }

    // If host, fetch pending access requests
    if (isHost) {
      const { data: requestsData } = await supabase
        .from("room_access_requests")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "pending");

      setAccessRequests(requestsData || []);

      // Fetch profiles for requesters
      if (requestsData && requestsData.length > 0) {
        const requesterIds = requestsData.map((r) => r.user_id);
        const { data: requesterProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", requesterIds);

        if (requesterProfiles) {
          setProfiles((prev) => {
            const newProfiles = { ...prev };
            requesterProfiles.forEach((p) => {
              newProfiles[p.user_id] = p;
            });
            return newProfiles;
          });
        }
      }
    }

    // If not member and not host, check for existing access request
    if (!isMember && !isHost) {
      const { data: existingRequest } = await supabase
        .from("room_access_requests")
        .select("*")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();

      setUserAccessRequest(existingRequest);
    }

    setLoading(false);
  };

  const copyRoomUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Room URL copied to clipboard",
    });
  };

  const copyRoomCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.room_code);
      toast({
        title: "Copied!",
        description: "Room code copied to clipboard",
      });
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !room || !inviteEmail.trim()) return;

    setSendingInvite(true);

    // Create the invitation record
    const { error } = await supabase.from("room_invitations").insert({
      room_id: room.id,
      invited_by: user.id,
      invited_email: inviteEmail.trim().toLowerCase(),
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
      setSendingInvite(false);
      return;
    }

    // Get current user's profile for the email
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    // Send the email via edge function
    try {
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        "send-invitation-email",
        {
          body: {
            invitedEmail: inviteEmail.trim().toLowerCase(),
            roomName: room.name,
            roomCode: room.room_code,
            inviterName: profile?.display_name || user.email?.split("@")[0] || "Someone",
            roomUrl: window.location.href,
          },
        }
      );

      if (emailError) {
        console.error("Email error:", emailError);
        toast({
          title: "Invitation Created",
          description: "Invitation saved but email could not be sent. User can see it in their lobby.",
        });
      } else {
        toast({
          title: "Invitation Sent!",
          description: `Invited ${inviteEmail} to join`,
        });
      }
    } catch (err) {
      console.error("Email send error:", err);
      toast({
        title: "Invitation Created",
        description: "Invitation saved but email could not be sent",
      });
    }

    setInviteEmail("");
    setInviteDialogOpen(false);
    setSendingInvite(false);
  };

  const requestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !room) return;

    setRequestingAccess(true);

    const { data, error } = await supabase
      .from("room_access_requests")
      .insert({
        room_id: room.id,
        user_id: user.id,
        message: requestMessage.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Request Already Sent",
          description: "You've already requested access to this room",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send access request",
          variant: "destructive",
        });
      }
    } else {
      setUserAccessRequest(data);
      toast({
        title: "Request Sent!",
        description: "Your request has been sent to the host",
      });
    }

    setRequestMessage("");
    setRequestingAccess(false);
  };

  const approveRequest = async (request: AccessRequest) => {
    if (!room) return;

    // Update request status
    const { error: updateError } = await supabase
      .from("room_access_requests")
      .update({ status: "approved" })
      .eq("id", request.id);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
      return;
    }

    // Add user as member
    await supabase.from("room_members").insert({
      room_id: room.id,
      user_id: request.user_id,
    });

    setAccessRequests((prev) => prev.filter((r) => r.id !== request.id));

    toast({
      title: "Request Approved",
      description: "User has been added to the room",
    });
  };

  const rejectRequest = async (request: AccessRequest) => {
    const { error } = await supabase
      .from("room_access_requests")
      .update({ status: "rejected" })
      .eq("id", request.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } else {
      setAccessRequests((prev) => prev.filter((r) => r.id !== request.id));
      toast({
        title: "Request Rejected",
        description: "The access request has been declined",
      });
    }
  };

  const saveRoomSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !editedRoomName.trim()) return;

    setSavingSettings(true);

    const { error } = await supabase
      .from("rooms")
      .update({ name: editedRoomName.trim() })
      .eq("id", room.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update room settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings Saved",
        description: "Room settings have been updated",
      });
      setSettingsDialogOpen(false);
    }

    setSavingSettings(false);
  };

  const leaveRoom = async () => {
    if (!user || !room) return;

    const { error } = await supabase
      .from("room_members")
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq("room_id", room.id)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to leave room",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Left Room",
        description: `You've left "${room.name}"`,
      });
      navigate("/lobby");
    }
  };

  const kickMember = async (memberId: string, memberUserId: string) => {
    if (!room || room.host_id !== user?.id) return;
    
    // Can't kick yourself (the host)
    if (memberUserId === user.id) return;

    const { error } = await supabase
      .from("room_members")
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq("id", memberId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Member Removed",
        description: "The member has been removed from the room",
      });
    }
  };

  const deleteRoom = async () => {
    if (!room) return;

    const { error } = await supabase.from("rooms").delete().eq("id", room.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Room Deleted",
        description: `"${room.name}" has been deleted`,
      });
      navigate("/lobby");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return null;
  }

  const isHost = room.host_id === user?.id;
  const isMember = members.some((m) => m.user_id === user?.id);

  // If user is not a member and not host, show access request UI
  if (!isMember && !isHost) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-md">
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => navigate("/lobby")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lobby
            </Button>

            <Card className="glass-card">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold mb-2">{room.name}</h1>
                <p className="text-muted-foreground mb-6">
                  You need permission from the host to join this room.
                </p>

                {userAccessRequest ? (
                  <div className="space-y-4">
                    {userAccessRequest.status === "pending" && (
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">
                          Your request is pending approval from the host.
                        </p>
                        <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-3" />
                      </div>
                    )}
                    {userAccessRequest.status === "rejected" && (
                      <div className="bg-destructive/10 rounded-lg p-4">
                        <p className="text-sm text-destructive">
                          Your request was declined by the host.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={requestAccess} className="space-y-4">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="message">Message (optional)</Label>
                      <Textarea
                        id="message"
                        placeholder="Hi! I'd like to join your room..."
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        className="bg-secondary/50 border-border"
                        rows={3}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="hero"
                      className="w-full"
                      disabled={requestingAccess}
                    >
                      {requestingAccess ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                      )}
                      Request to Join
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/lobby")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>

          {/* Pending Access Requests for Host */}
          {isHost && accessRequests.length > 0 && (
            <Card className="glass-card mb-6 border-primary/30">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Pending Join Requests ({accessRequests.length})
                </h3>
                <div className="space-y-3">
                  {accessRequests.map((request) => {
                    const profile = profiles[request.user_id];
                    return (
                      <div
                        key={request.id}
                        className="flex items-center justify-between bg-secondary/30 rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {profile?.display_name || profile?.email || "Unknown User"}
                          </p>
                          {request.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              "{request.message}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(request.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                            onClick={() => approveRequest(request)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => rejectRequest(request)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Room Header */}
          <Card className="glass-card mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
                    {room.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {members.length} member{members.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Created {format(new Date(room.created_at), "MMM d, yyyy h:mm a")}
                    </span>
                    {isHost && (
                      <span className="text-primary font-medium flex items-center gap-1">
                        <Crown className="w-4 h-4" />
                        You are the host
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Room Code */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                    <span className="font-mono text-sm font-bold tracking-wider">
                      {room.room_code}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={copyRoomCode}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Copy URL */}
                  <Button variant="outline" size="sm" onClick={copyRoomUrl}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>

                  {isHost && (
                    <>
                      {/* Settings Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSettingsDialogOpen(true)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInviteDialogOpen(true)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Invite
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive/50 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Room</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{room.name}"? This will remove all members and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-secondary">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={deleteRoom}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}

                  {!isHost && isMember && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <LogOut className="w-4 h-4 mr-2" />
                          Leave
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Leave Room</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to leave "{room.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-secondary">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={leaveRoom}>
                            Leave Room
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members List */}
          <h2 className="text-xl font-display font-semibold mb-4">Members</h2>
          <div className="grid gap-3">
            {members.map((member) => {
              const profile = profiles[member.user_id];
              const memberIsHost = member.user_id === room.host_id;
              const canKick = isHost && !memberIsHost;

              return (
                <Card key={member.id} className="glass-card animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${memberIsHost ? 'bg-primary/30' : 'bg-primary/20'}`}>
                          {memberIsHost ? (
                            <Crown className="w-5 h-5 text-primary" />
                          ) : (
                            <span className="text-primary font-semibold">
                              {profile?.display_name?.[0]?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {profile?.display_name || "Unknown User"}
                            {member.user_id === user?.id && (
                              <span className="text-muted-foreground ml-2">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Joined {format(new Date(member.joined_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {memberIsHost && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                            Host
                          </span>
                        )}
                        {canKick && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {profile?.display_name || "this member"} from the room?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-secondary">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => kickMember(member.id, member.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Invite Dialog */}
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display">Invite to {room.name}</DialogTitle>
                <DialogDescription>
                  Send an invitation email to join your room
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={sendInvitation} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-secondary/50 border-border"
                    required
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={sendingInvite}>
                  {sendingInvite ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Settings Dialog */}
          <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display">Room Settings</DialogTitle>
                <DialogDescription>
                  Manage your room settings
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={saveRoomSettings} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName">Room Name</Label>
                  <Input
                    id="roomName"
                    type="text"
                    value={editedRoomName}
                    onChange={(e) => setEditedRoomName(e.target.value)}
                    className="bg-secondary/50 border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Room Code</Label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-lg">
                    <span className="font-mono text-sm font-bold tracking-wider">
                      {room.room_code}
                    </span>
                    <span className="text-xs text-muted-foreground">(cannot be changed)</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Room URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={window.location.href}
                      className="bg-secondary/30 border-border text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={copyRoomUrl}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={savingSettings}>
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Room;

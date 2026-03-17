import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoragePanel from "@/components/StoragePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Loader2, Tv, Play, Copy, Mail, Clock, Hash, Trash2, Check, X, Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface Invitation {
  id: string;
  room_id: string;
  invited_by: string;
  invited_email: string;
  status: string;
  created_at: string;
  room?: Room;
}

const Lobby = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomMembers, setRoomMembers] = useState<Record<string, RoomMember[]>>({});
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRooms();

      // Set up real-time subscription for rooms
      const roomsChannel = supabase
        .channel('rooms-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rooms',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newRoom = payload.new as Room;
              // Only add to rooms if user is the host (they just created it)
              if (newRoom.is_active && newRoom.host_id === user?.id) {
                setRooms((prev) => [newRoom, ...prev]);
              }
            } else if (payload.eventType === 'DELETE') {
              setRooms((prev) => prev.filter((r) => r.id !== payload.old.id));
            } else if (payload.eventType === 'UPDATE') {
              const updatedRoom = payload.new as Room;
              if (!updatedRoom.is_active) {
                setRooms((prev) => prev.filter((r) => r.id !== updatedRoom.id));
              } else {
                setRooms((prev) =>
                  prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
                );
              }
            }
          }
        )
        .subscribe();

      // Set up real-time subscription for room members
      const membersChannel = supabase
        .channel('room-members-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_members',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMember = payload.new as RoomMember;
              setRoomMembers((prev) => ({
                ...prev,
                [newMember.room_id]: [...(prev[newMember.room_id] || []), newMember],
              }));
            } else if (payload.eventType === 'DELETE') {
              const oldMember = payload.old as RoomMember;
              setRoomMembers((prev) => ({
                ...prev,
                [oldMember.room_id]: (prev[oldMember.room_id] || []).filter(
                  (m) => m.id !== oldMember.id
                ),
              }));
            } else if (payload.eventType === 'UPDATE') {
              const updatedMember = payload.new as RoomMember;
              setRoomMembers((prev) => ({
                ...prev,
                [updatedMember.room_id]: (prev[updatedMember.room_id] || []).map((m) =>
                  m.id === updatedMember.id ? updatedMember : m
                ),
              }));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(roomsChannel);
        supabase.removeChannel(membersChannel);
      };
    }
  }, [user]);

  const fetchRooms = async () => {
    // Fetch rooms where user is host
    const { data: hostedRooms, error: hostedError } = await supabase
      .from("rooms")
      .select("*")
      .eq("host_id", user?.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // Fetch rooms where user is a member (but not host)
    const { data: memberRooms, error: memberError } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("user_id", user?.id)
      .eq("is_active", true);

    let joinedRooms: Room[] = [];
    if (memberRooms && memberRooms.length > 0) {
      const roomIds = memberRooms.map((m) => m.room_id);
      const { data: rooms } = await supabase
        .from("rooms")
        .select("*")
        .in("id", roomIds)
        .neq("host_id", user?.id) // Exclude hosted rooms
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      joinedRooms = rooms || [];
    }

    // Set rooms to only user's rooms
    const myRooms = [...(hostedRooms || []), ...joinedRooms];
    setRooms(myRooms);

    // Fetch members for user's rooms only
    if (myRooms.length > 0) {
      const membersPromises = myRooms.map(async (room) => {
        const { data: members } = await supabase
          .from("room_members")
          .select("*")
          .eq("room_id", room.id)
          .eq("is_active", true);
        return { roomId: room.id, members: members || [] };
      });
      
      const membersResults = await Promise.all(membersPromises);
      const membersMap: Record<string, RoomMember[]> = {};
      membersResults.forEach(({ roomId, members }) => {
        membersMap[roomId] = members;
      });
      setRoomMembers(membersMap);
    }
    
    // Fetch pending invitations for current user
    await fetchInvitations();
    setLoading(false);
  };

  const fetchInvitations = async () => {
    if (!user?.email) return;
    
    const { data: invitations, error } = await supabase
      .from("room_invitations")
      .select("*")
      .eq("invited_email", user.email.toLowerCase())
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && invitations) {
      // Fetch room details for each invitation
      const invitationsWithRooms = await Promise.all(
        invitations.map(async (inv) => {
          const { data: room } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", inv.room_id)
            .eq("is_active", true)
            .maybeSingle();
          return { ...inv, room: room || undefined };
        })
      );
      // Filter out invitations for inactive/deleted rooms
      setPendingInvitations(invitationsWithRooms.filter(inv => inv.room));
    }
  };

  const acceptInvitation = async (invitation: Invitation) => {
    if (!user || !invitation.room) return;

    // Update invitation status
    const { error: updateError } = await supabase
      .from("room_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
      return;
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("room_members")
      .select("*")
      .eq("room_id", invitation.room_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingMember) {
      // Join the room
      await supabase.from("room_members").insert({
        room_id: invitation.room_id,
        user_id: user.id,
      });
    } else if (!existingMember.is_active) {
      // Rejoin
      await supabase
        .from("room_members")
        .update({ is_active: true, left_at: null })
        .eq("id", existingMember.id);
    }

    toast({
      title: "Invitation Accepted!",
      description: `You've joined "${invitation.room?.name}"`,
    });

    setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    fetchRooms();
  };

  const declineInvitation = async (invitation: Invitation) => {
    const { error } = await supabase
      .from("room_invitations")
      .update({ status: "declined" })
      .eq("id", invitation.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to decline invitation",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Invitation Declined",
        description: "You've declined the invitation",
      });
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !roomName.trim()) return;

    setCreating(true);
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        name: roomName.trim(),
        host_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive",
      });
    } else {
      // Auto-join the room as host
      await supabase.from("room_members").insert({
        room_id: data.id,
        user_id: user.id,
      });
      
      toast({
        title: "Room Created!",
        description: `Room code: ${data.room_code}`,
      });
      setRoomName("");
      setCreateDialogOpen(false);
      // Navigate to the new room
      navigate(`/room/${data.id}`);
    }
    setCreating(false);
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;

    setJoining(true);
    
    // Find room by code
    const { data: room, error: findError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", joinCode.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (findError || !room) {
      toast({
        title: "Room Not Found",
        description: "No active room found with that code",
        variant: "destructive",
      });
      setJoining(false);
      return;
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("room_members")
      .select("*")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      if (existingMember.is_active) {
        toast({
          title: "Already Joined",
          description: "You're already a member of this room",
        });
      } else {
        // Rejoin
        await supabase
          .from("room_members")
          .update({ is_active: true, left_at: null })
          .eq("id", existingMember.id);
        toast({
          title: "Welcome Back!",
          description: `Rejoined "${room.name}"`,
        });
      }
    } else {
      // Join as new member
      await supabase.from("room_members").insert({
        room_id: room.id,
        user_id: user.id,
      });
      toast({
        title: "Joined Room!",
        description: `Welcome to "${room.name}"`,
      });
    }

    setJoinCode("");
    setJoinDialogOpen(false);
    // Navigate to the room
    navigate(`/room/${room.id}`);
    setJoining(false);
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRoom || !inviteEmail.trim()) return;

    const { error } = await supabase.from("room_invitations").insert({
      room_id: selectedRoom.id,
      invited_by: user.id,
      invited_email: inviteEmail.trim().toLowerCase(),
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Invitation Sent!",
        description: `Invited ${inviteEmail} to join "${selectedRoom.name}"`,
      });
      setInviteEmail("");
      setInviteDialogOpen(false);
    }
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Room code copied to clipboard",
    });
  };

  const deleteRoom = async (roomId: string, roomName: string) => {
    const { error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", roomId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Room Deleted",
        description: `"${roomName}" has been deleted`,
      });
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
                Welcome to the <span className="text-gradient">Lobby</span>
              </h1>
              <p className="text-muted-foreground">
                Create or join a room to start your cinema experience
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StoragePanel />
              
              <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="heroOutline" size="lg">
                    <Hash className="w-5 h-5 mr-2" />
                    Join Room
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display">Join a Room</DialogTitle>
                    <DialogDescription>
                      Enter the 6-character room code to join
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={joinRoom} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="joinCode">Room Code</Label>
                      <Input
                        id="joinCode"
                        placeholder="ABC123"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="bg-secondary/50 border-border text-center text-2xl tracking-widest font-mono"
                        maxLength={6}
                        required
                      />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={joining}>
                      {joining && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Join Room
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Room
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display">Create a New Room</DialogTitle>
                    <DialogDescription>
                      Give your room a name and invite others to join
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createRoom} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="roomName">Room Name</Label>
                      <Input
                        id="roomName"
                        placeholder="Movie Night"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="bg-secondary/50 border-border"
                        required
                      />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={creating}>
                      {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Create Room
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Invite Dialog */}
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display">Invite to {selectedRoom?.name}</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your room
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
                <Button type="submit" variant="hero" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Pending Invitations Section */}
          {pendingInvitations.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-display font-semibold">
                  Pending Invitations ({pendingInvitations.length})
                </h2>
              </div>
              <div className="grid gap-3">
                {pendingInvitations.map((invitation) => (
                  <Card
                    key={invitation.id}
                    className="glass-card border-primary/20 animate-fade-in"
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{invitation.room?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Invited {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="hero"
                            size="sm"
                            onClick={() => acceptInvitation(invitation)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => declineInvitation(invitation)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* My Rooms Section */}
              <div className="mb-8">
                <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                  <Tv className="w-5 h-5 text-primary" />
                  My Rooms ({rooms.length})
                </h2>
                {rooms.length === 0 ? (
                  <Card className="glass-card text-center py-12">
                    <CardContent>
                      <Tv className="w-12 h-12 text-primary/50 mx-auto mb-3" />
                      <h3 className="text-lg font-display font-semibold mb-2">No Rooms Yet</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        Create a room or join one to get started!
                      </p>
                      <Button variant="hero" size="sm" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Room
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {rooms.map((room, index) => {
                      const memberCount = roomMembers[room.id]?.length || 0;
                      const isHost = room.host_id === user.id;
                      
                      return (
                        <Card
                          key={room.id}
                          className="glass-card hover:border-primary/30 transition-all duration-300 animate-fade-in cursor-pointer"
                          style={{ animationDelay: `${index * 0.05}s` }}
                          onClick={() => navigate(`/room/${room.id}`)}
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Tv className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-display font-semibold text-lg">{room.name}</h3>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {format(new Date(room.created_at), 'MMM d, yyyy h:mm a')}
                                    </span>
                                    {isHost && (
                                      <span className="text-primary font-medium">Host</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
                                  <span className="font-mono text-sm font-bold tracking-wider">
                                    {room.room_code}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => copyRoomCode(room.room_code)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                {isHost && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedRoom(room);
                                        setInviteDialogOpen(true);
                                      }}
                                    >
                                      <Mail className="w-4 h-4" />
                                    </Button>
                                    
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-card border-border">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Room</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete "{room.name}"? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="bg-secondary">Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteRoom(room.id, room.name)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                                
                                <Button variant="heroOutline" size="sm" onClick={() => navigate(`/room/${room.id}`)}>
                                  <Play className="w-4 h-4 mr-2" />
                                  Open
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Lobby;
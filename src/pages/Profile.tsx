import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Calendar,
  HardDrive,
  CreditCard,
  Loader2,
  Save,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface ProfileData {
  display_name: string | null;
  email: string | null;
  created_at: string;
}

interface StorageData {
  storage_plan: string;
  storage_limit_gb: number;
  storage_used_bytes: number;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
      }

      // Fetch storage info
      const { data: storageData } = await supabase
        .from("user_storage")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (storageData) {
        setStorage({
          storage_plan: storageData.storage_plan,
          storage_limit_gb: Number(storageData.storage_limit_gb),
          storage_used_bytes: Number(storageData.storage_used_bytes),
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Use display name first, fallback to email
  const nameToUse = displayName || user?.email || "";
  const firstLetter = nameToUse.charAt(0).toUpperCase() || "U";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 sm:pt-32 pb-20 px-4 sm:px-6">
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 sm:pt-32 pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8 sm:mb-12">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 border-4 border-primary/50">
              <AvatarFallback className="bg-primary/20 text-primary text-2xl sm:text-3xl font-bold">
                {firstLetter}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-2">
              My <span className="text-gradient">Profile</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your account settings</p>
          </div>

          <div className="grid gap-4 sm:gap-6">
            {/* Profile Info */}
            <Card className="glass-card">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Account Information
                </CardTitle>
                <CardDescription className="text-sm">Update your profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-secondary/50 border-border"
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Email</Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{user?.email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Member Since</Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">
                      {profile?.created_at
                        ? format(new Date(profile.created_at), "MMMM d, yyyy")
                        : "Unknown"}
                    </span>
                  </div>
                </div>

                <Button onClick={handleSave} variant="hero" disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Storage & Subscription */}
            <Card className="glass-card">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Storage & Subscription
                </CardTitle>
                <CardDescription className="text-sm">Your current plan and usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground">Current Plan</span>
                    </div>
                    <p className="text-lg sm:text-xl font-display font-bold capitalize">
                      {storage?.storage_plan || "Free"}
                    </p>
                  </div>

                  <div className="p-3 sm:p-4 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground">Storage Limit</span>
                    </div>
                    <p className="text-lg sm:text-xl font-display font-bold">
                      {storage?.storage_limit_gb || 4} GB
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className="text-xs sm:text-sm text-muted-foreground">Storage Used</span>
                    <span className="text-xs sm:text-sm font-medium">
                      {storage ? formatBytes(storage.storage_used_bytes) : "0 Bytes"} / {storage?.storage_limit_gb || 4} GB
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${storage ? (storage.storage_used_bytes / (storage.storage_limit_gb * 1024 * 1024 * 1024)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <Link to="/subscribe">
                  <Button variant="heroOutline" className="w-full">
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade Storage Plan
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;

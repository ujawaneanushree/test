import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Home, HardDrive, CreditCard } from "lucide-react";

const UserAvatar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisplayName = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.display_name) {
        setDisplayName(data.display_name);
      }
    };

    fetchDisplayName();
  }, [user]);

  if (!user) return null;

  // Use display name first, then email as fallback
  const nameToUse = displayName || user.email || "";
  const firstLetter = nameToUse.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/50 hover:border-primary transition-colors cursor-pointer">
            <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm sm:text-base">
              {firstLetter}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border z-50">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{displayName || user.email}</p>
          {displayName && (
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={() => navigate("/lobby")}
          className="cursor-pointer"
        >
          <Home className="mr-2 h-4 w-4" />
          Lobby
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/profile")}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/lobby")}
          className="cursor-pointer"
        >
          <HardDrive className="mr-2 h-4 w-4" />
          My Storage
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/subscribe")}
          className="cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Subscription
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAvatar;

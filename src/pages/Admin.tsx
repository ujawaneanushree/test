import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  LogIn,
  MousePointerClick,
  Search,
  Eye,
  HardDrive,
  Tv,
  Loader2,
  Terminal,
  Wifi,
  Activity,
  Database,
  RefreshCw,
  Skull,
  Zap,
} from "lucide-react";
import { format, subDays } from "date-fns";

interface AnalyticsSummary {
  totalVisitors: number;
  totalLogins: number;
  totalInteractions: number;
  totalSearches: number;
  totalUsers: number;
  totalRooms: number;
  totalStorageUsed: number;
}

interface DailyStats {
  date: string;
  logins: number;
  interactions: number;
}

interface RecentUser {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

const Admin = () => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    totalVisitors: 0,
    totalLogins: 0,
    totalInteractions: 0,
    totalSearches: 0,
    totalUsers: 0,
    totalRooms: 0,
    totalStorageUsed: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  const addTerminalLog = (message: string) => {
    const timestamp = format(new Date(), "HH:mm:ss");
    setTerminalLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (adminId === "admin" && password === "admin123") {
      setIsAuthenticated(true);
      toast({
        title: "Access Granted",
        description: "Welcome to the command center.",
      });
      addTerminalLog("SYSTEM: Admin authentication successful");
      fetchAnalytics();
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid credentials.",
        variant: "destructive",
      });
      addTerminalLog("ERROR: Authentication failed - invalid credentials");
    }
    setLoading(false);
  };

  // Real-time subscription for new users, rooms, and analytics
  useEffect(() => {
    if (!isAuthenticated) return;

    addTerminalLog("SYSTEM: Initializing real-time monitoring...");

    const channel = supabase
      .channel("admin-realtime-v2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          addTerminalLog(`NEW USER: ${payload.new.email || payload.new.display_name || "Unknown"} joined the system`);
          setRecentUsers((prev) => [payload.new as RecentUser, ...prev.slice(0, 9)]);
          setAnalytics((prev) => ({ ...prev, totalUsers: prev.totalUsers + 1 }));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rooms" },
        (payload) => {
          addTerminalLog(`NEW ROOM: Room "${payload.new.name}" created`);
          setAnalytics((prev) => ({ ...prev, totalRooms: prev.totalRooms + 1 }));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "site_analytics" },
        (payload) => {
          const eventType = payload.new.event_type;
          const metadata = payload.new.metadata as Record<string, any> | null;
          
          let logMessage = `EVENT: ${eventType.toUpperCase()}`;
          if (metadata?.page) logMessage += ` - ${metadata.page}`;
          if (metadata?.action) logMessage += ` - ${metadata.action}`;
          
          addTerminalLog(logMessage);
          
          setAnalytics((prev) => ({
            ...prev,
            totalVisitors: eventType === "page_view" ? prev.totalVisitors + 1 : prev.totalVisitors,
            totalLogins: eventType === "login" ? prev.totalLogins + 1 : prev.totalLogins,
            totalInteractions: eventType === "interaction" ? prev.totalInteractions + 1 : prev.totalInteractions,
            totalSearches: eventType === "search" ? prev.totalSearches + 1 : prev.totalSearches,
          }));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          addTerminalLog("SYSTEM: Real-time connection established");
        } else if (status === "CHANNEL_ERROR") {
          addTerminalLog("ERROR: Real-time connection failed");
        }
      });

    // Blink live indicator
    const blinkInterval = setInterval(() => {
      setLiveIndicator((prev) => !prev);
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(blinkInterval);
    };
  }, [isAuthenticated]);

  const fetchAnalytics = async () => {
    setDataLoading(true);
    addTerminalLog("SYSTEM: Fetching analytics data...");
    
    try {
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: roomsCount } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true });

      const { data: analyticsData } = await supabase
        .from("site_analytics")
        .select("event_type, created_at, metadata");

      const visitors = analyticsData?.filter((e) => e.event_type === "page_view").length || 0;
      const logins = analyticsData?.filter((e) => e.event_type === "login").length || 0;
      const interactions = analyticsData?.filter((e) => e.event_type === "interaction").length || 0;
      const searches = analyticsData?.filter((e) => e.event_type === "search").length || 0;

      const { data: storageData } = await supabase
        .from("user_storage")
        .select("storage_used_bytes");

      const totalStorage = storageData?.reduce((acc, curr) => acc + (curr.storage_used_bytes || 0), 0) || 0;

      // Fetch recent users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, email, display_name, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentUsers(usersData || []);

      setAnalytics({
        totalVisitors: visitors,
        totalLogins: logins,
        totalInteractions: interactions,
        totalSearches: searches,
        totalUsers: usersCount || 0,
        totalRooms: roomsCount || 0,
        totalStorageUsed: totalStorage,
      });

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayLogins = analyticsData?.filter(
          (e) => e.event_type === "login" && e.created_at.startsWith(dateStr)
        ).length || 0;
        const dayInteractions = analyticsData?.filter(
          (e) => e.event_type === "interaction" && e.created_at.startsWith(dateStr)
        ).length || 0;
        return {
          date: format(date, "MMM d"),
          logins: dayLogins,
          interactions: dayInteractions,
        };
      }).reverse();

      setDailyStats(last7Days);
      addTerminalLog(`SYSTEM: Loaded ${usersCount || 0} users, ${roomsCount || 0} rooms, ${analyticsData?.length || 0} events`);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      addTerminalLog("ERROR: Failed to fetch analytics data");
    }
    setDataLoading(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-black to-black" />
        <div className="fixed inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,_rgba(0,255,0,0.1)_50%)] bg-[length:100%_4px]" />
        </div>
        <Header />
        <main className="relative pt-24 sm:pt-32 pb-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-md">
            <Card className="bg-black/80 border-green-500/30 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500/10 border border-green-500/50 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Skull className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-mono text-green-500 tracking-wider">
                  [ACCESS TERMINAL]
                </CardTitle>
                <CardDescription className="text-green-500/70 font-mono text-xs sm:text-sm">
                  Enter credentials to access command center
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminId" className="text-green-500 font-mono text-xs sm:text-sm">
                      ADMIN_ID:
                    </Label>
                    <Input
                      id="adminId"
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                      className="bg-black border-green-500/50 text-green-500 font-mono placeholder:text-green-500/30 focus:border-green-500"
                      placeholder="enter_admin_id"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-green-500 font-mono text-xs sm:text-sm">
                      PASSWORD:
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-black border-green-500/50 text-green-500 font-mono placeholder:text-green-500/30 focus:border-green-500"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-green-500/20 border border-green-500 text-green-500 hover:bg-green-500/30 font-mono"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {loading ? "AUTHENTICATING..." : ">> AUTHORIZE <<"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-500">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-black to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,_rgba(0,255,0,0.1)_50%)] bg-[length:100%_4px]" />
      </div>
      
      <Header />
      <main className="relative pt-24 sm:pt-32 pb-20 px-4 sm:px-6">
        <div className="container mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <Terminal className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-mono font-bold tracking-wider">
                  COMMAND_CENTER
                </h1>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-green-500/70">
                  <div className={`w-2 h-2 rounded-full ${liveIndicator ? "bg-green-500" : "bg-green-500/30"} transition-colors`} />
                  LIVE MONITORING
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                className="flex-1 sm:flex-none border-green-500/50 text-green-500 hover:bg-green-500/10 font-mono text-xs sm:text-sm"
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                REFRESH
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAuthenticated(false)}
                className="flex-1 sm:flex-none border-red-500/50 text-red-500 hover:bg-red-500/10 font-mono text-xs sm:text-sm"
              >
                DISCONNECT
              </Button>
            </div>
          </div>

          {dataLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-green-500" />
              <p className="font-mono text-green-500/70 text-sm">Loading system data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              {/* Main Stats */}
              <div className="lg:col-span-8 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  {[
                    { label: "VISITORS", value: analytics.totalVisitors, icon: Eye },
                    { label: "LOGINS", value: analytics.totalLogins, icon: LogIn },
                    { label: "ACTIONS", value: analytics.totalInteractions, icon: MousePointerClick },
                    { label: "SEARCHES", value: analytics.totalSearches, icon: Search },
                  ].map((stat) => (
                    <Card key={stat.label} className="bg-black/60 border-green-500/30 backdrop-blur-sm">
                      <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 px-3 sm:px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] sm:text-xs font-mono text-green-500/70">{stat.label}</p>
                            <p className="text-lg sm:text-2xl font-mono font-bold text-green-500">
                              {stat.value}
                            </p>
                          </div>
                          <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-green-500/50" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
                    <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 px-3 sm:px-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-500/50 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs font-mono text-green-500/70">USERS</p>
                          <p className="text-base sm:text-xl font-mono font-bold text-green-500">
                            {analytics.totalUsers}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
                    <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 px-3 sm:px-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-green-500/50 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs font-mono text-green-500/70">ROOMS</p>
                          <p className="text-base sm:text-xl font-mono font-bold text-green-500">
                            {analytics.totalRooms}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
                    <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 px-3 sm:px-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Database className="w-4 h-4 sm:w-5 sm:h-5 text-green-500/50 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs font-mono text-green-500/70">STORAGE</p>
                          <p className="text-base sm:text-xl font-mono font-bold text-green-500 truncate">
                            {formatBytes(analytics.totalStorageUsed)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Activity Chart */}
                <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
                  <CardHeader className="pb-2 px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 font-mono text-green-500 text-sm sm:text-base">
                      <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                      ACTIVITY_MATRIX
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="space-y-2 sm:space-y-3">
                      {dailyStats.map((day) => (
                        <div key={day.date} className="flex items-center gap-2 sm:gap-4">
                          <div className="w-10 sm:w-14 text-[10px] sm:text-xs font-mono text-green-500/70">
                            {day.date}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 sm:h-1.5 bg-green-500/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${Math.min((day.logins / 10) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] sm:text-xs font-mono w-4 sm:w-6 text-right">{day.logins}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 sm:h-1.5 bg-cyan-500/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-cyan-500 rounded-full transition-all"
                                  style={{ width: `${Math.min((day.interactions / 50) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] sm:text-xs font-mono w-4 sm:w-6 text-right">{day.interactions}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 space-y-4 sm:space-y-6">
                {/* Terminal */}
                <Card className="bg-black/80 border-green-500/30 backdrop-blur-sm">
                  <CardHeader className="pb-2 px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 font-mono text-green-500 text-xs sm:text-sm">
                      <Terminal className="w-3 h-3 sm:w-4 sm:h-4" />
                      LIVE_FEED
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="h-40 sm:h-48 overflow-y-auto font-mono text-[10px] sm:text-xs space-y-1 bg-black/50 rounded p-2 border border-green-500/20">
                      {terminalLogs.length === 0 ? (
                        <p className="text-green-500/50">Waiting for events...</p>
                      ) : (
                        terminalLogs.map((log, i) => (
                          <p key={i} className={`break-all ${log.includes("ERROR") ? "text-red-400" : log.includes("NEW") ? "text-cyan-400" : "text-green-500/70"}`}>
                            {log}
                          </p>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Users */}
                <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
                  <CardHeader className="pb-2 px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 font-mono text-green-500 text-xs sm:text-sm">
                      <Wifi className="w-3 h-3 sm:w-4 sm:h-4" />
                      RECENT_USERS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                      {recentUsers.length === 0 ? (
                        <p className="text-xs font-mono text-green-500/50">No users found</p>
                      ) : (
                        recentUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 sm:gap-3 p-2 rounded bg-green-500/5 border border-green-500/10"
                          >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-green-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] sm:text-xs font-mono font-bold text-green-500">
                                {(user.display_name || user.email || "U").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] sm:text-xs font-mono text-green-500 truncate">
                                {user.display_name || user.email || "Unknown"}
                              </p>
                              <p className="text-[8px] sm:text-[10px] font-mono text-green-500/50">
                                {format(new Date(user.created_at), "MMM d, HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* System Status */}
                <Card className="bg-black/60 border-green-500/30 backdrop-blur-sm">
                  <CardHeader className="pb-2 px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 font-mono text-green-500 text-xs sm:text-sm">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                      SYSTEM_STATUS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-4 sm:px-6">
                    {[
                      { label: "DATABASE", status: "ONLINE" },
                      { label: "REALTIME", status: "ACTIVE" },
                      { label: "STORAGE", status: "OPERATIONAL" },
                      { label: "AUTH", status: "SECURE" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-[10px] sm:text-xs font-mono">
                        <span className="text-green-500/70">{item.label}:</span>
                        <span className="text-green-500 flex items-center gap-1">
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;

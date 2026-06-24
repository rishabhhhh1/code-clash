import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSyncCodeforcesHandle } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const syncCf = useSyncCodeforcesHandle();

  const handleConnectCf = () => {
    if (!user) {
      setLocation("/register");
      return;
    }
    
    if (user.cfHandle) {
      syncCf.mutate({ data: { cfHandle: user.cfHandle } }, {
        onSuccess: () => {
          toast({ title: "Codeforces Synced", description: "Successfully synced data from Codeforces." });
        },
        onError: () => {
          toast({ title: "Sync Failed", description: "Could not sync Codeforces data.", variant: "destructive" });
        }
      });
    } else {
      setLocation(`/profile/${user.username}`);
      toast({ title: "Setup Required", description: "Please set your Codeforces handle in your profile first." });
    }
  };

  const navClass = (path: string) => {
    return `text-sm cursor-pointer transition-colors ${
      location === path || (path !== "/" && location.startsWith(path))
        ? "text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground"
    }`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className="flex items-center cursor-pointer select-none">
                <span className="font-bold text-xl tracking-tight text-primary">CodeClash</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/">
                <span className={navClass("/")}>Lobby</span>
              </Link>
              <Link href="/room/create">
                <span className={navClass("/room/create")}>Matchmaking</span>
              </Link>
              <Link href="/leaderboard">
                <span className={navClass("/leaderboard")}>Problems</span>
              </Link>
              <Link href="/leaderboard">
                <span className={navClass("/leaderboard")}>Rankings</span>
              </Link>
              {user?.username === "admin" && (
                <Link href="/admin">
                  <span className={navClass("/admin")}>Admin</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link href={user ? `/profile/${user.username}` : "/login"}>
              <span className="text-sm cursor-pointer text-muted-foreground hover:text-foreground hidden md:inline-block">Settings</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                <Link href={`/profile/${user.username}`}>
                  <div className="flex items-center gap-3 cursor-pointer group">
                    <Avatar className="w-8 h-8 rounded-full border border-border">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs rounded-full">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium group-hover:text-primary transition-colors hidden md:inline-block">{user.username}</span>
                  </div>
                </Link>
              </div>
            ) : (
              <Link href="/login">
                <span className="text-sm font-medium cursor-pointer text-foreground hover:text-primary transition-colors">Log In</span>
              </Link>
            )}

            <Button onClick={handleConnectCf} disabled={syncCf.isPending}>
              {syncCf.isPending ? "Syncing..." : "Connect Codeforces"}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
    </div>
  );
}

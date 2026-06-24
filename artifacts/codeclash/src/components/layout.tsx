import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Activity, Trophy, Swords, Users, Shield, Plus, LogOut } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Lobby", icon: Activity },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/friends", label: "Friends", icon: Users },
    { href: "/achievements", label: "Achievements", icon: Shield },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-mono">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <Swords className="w-8 h-8 text-primary" />
              <span className="font-bold text-xl tracking-tight text-primary">CODECLASH</span>
            </div>
          </Link>
        </div>

        <ScrollArea className="flex-1 py-6 px-4">
          <div className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-colors ${
                    location === item.href
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 px-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Play
            </p>
            <Link href="/room/create">
              <Button className="w-full justify-start gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4" />
                Create Room
              </Button>
            </Link>
          </div>
        </ScrollArea>

        {user ? (
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <Link href={`/profile/${user.username}`}>
                <div className="flex items-center gap-3 cursor-pointer">
                  <Avatar>
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary uppercase">
                      {user.username.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{user.username}</span>
                    <span className="text-xs text-muted-foreground">{user.rating} LP</span>
                  </div>
                </div>
              </Link>
            </div>
            <Button variant="outline" className="w-full text-muted-foreground" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="p-4 border-t border-border flex flex-col gap-2">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="w-full">Register</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

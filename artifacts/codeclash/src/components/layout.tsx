import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Plus } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Arena" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/friends", label: "Friends" },
    { href: "/achievements", label: "Achievements" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer select-none">
                <div className="w-4 h-4 bg-primary rounded-sm" />
                <span className="font-bold text-lg tracking-tight">CodeClash</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`text-sm cursor-pointer transition-colors ${
                      location === item.href || (item.href !== "/" && location.startsWith(item.href))
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/room/create">
                  <Button variant="outline" size="sm" className="hidden md:flex gap-2">
                    <Plus className="w-4 h-4" />
                    New Battle
                  </Button>
                </Link>
                <div className="h-4 w-px bg-border hidden md:block" />
                <Link href={`/profile/${user.username}`}>
                  <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="flex flex-col items-end hidden md:flex">
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">{user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.rating} LP</span>
                    </div>
                    <Avatar className="w-8 h-8 rounded-sm">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs rounded-sm">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </Link>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => logout()}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col">
        {children}
      </main>
    </div>
  );
}

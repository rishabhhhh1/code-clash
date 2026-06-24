import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLoginUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const loginMutation = useLoginUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { username, password } }, {
      onSuccess: (res) => {
        login(res.token);
        toast({ title: "Authenticated", description: "Welcome back." });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ 
          title: "Authentication Failed", 
          description: err.message || "Invalid credentials", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
          <p className="text-muted-foreground text-sm mt-2">Enter your credentials to access the arena.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="bg-background"
            />
          </div>
          <Button type="submit" className="w-full mt-6 group" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Authenticating..." : "Continue"}
            {!loginMutation.isPending && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </form>

        <div className="text-sm text-muted-foreground pt-6 border-t border-border">
          New to CodeClash?{" "}
          <Link href="/register">
            <span className="text-foreground font-medium hover:underline cursor-pointer">Create an account</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

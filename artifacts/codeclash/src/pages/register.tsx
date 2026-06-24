import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useRegisterUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cfHandle, setCfHandle] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const registerMutation = useRegisterUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: { username, password, cfHandle } }, {
      onSuccess: (res) => {
        login(res.token);
        toast({ title: "Account created", description: "Welcome to CodeClash." });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ 
          title: "Registration Failed", 
          description: err.message || "Could not register", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-muted-foreground text-sm mt-2">Initialize your competitive profile.</p>
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
            <Label htmlFor="cfHandle">Codeforces Handle <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input 
              id="cfHandle" 
              value={cfHandle} 
              onChange={(e) => setCfHandle(e.target.value)} 
              className="bg-background font-mono text-sm"
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
          <Button type="submit" className="w-full mt-6 group" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Processing..." : "Register"}
            {!registerMutation.isPending && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </form>

        <div className="text-sm text-muted-foreground pt-6 border-t border-border">
          Already have an account?{" "}
          <Link href="/login">
            <span className="text-foreground font-medium hover:underline cursor-pointer">Log in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

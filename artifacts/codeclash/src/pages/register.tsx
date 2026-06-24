import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useRegisterUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
        toast({ title: "Registered", description: "Welcome to CodeClash." });
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Swords className="w-12 h-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold tracking-tighter">CODECLASH</h1>
          <p className="text-muted-foreground mt-2">Initialize your profile</p>
        </div>

        <Card className="border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>Create your combat profile</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Handle (Username)</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="bg-secondary/50 font-mono"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfHandle">Codeforces Handle (Optional but recommended)</Label>
                <Input 
                  id="cfHandle" 
                  value={cfHandle} 
                  onChange={(e) => setCfHandle(e.target.value)} 
                  className="bg-secondary/50 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passkey</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="bg-secondary/50 font-mono"
                  required 
                />
              </div>
              <Button type="submit" className="w-full font-bold tracking-widest" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "PROCESSING..." : "REGISTER"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login">
                <span className="text-primary hover:underline cursor-pointer">Login</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

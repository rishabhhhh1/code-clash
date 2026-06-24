import { useState } from "react";
import { useGetFriends, getGetFriendsQueryKey, useSendFriendRequest, useRespondFriendRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Friends() {
  const { data: friends, isLoading } = useGetFriends();
  const [targetUsername, setTargetUsername] = useState("");
  
  const sendMutation = useSendFriendRequest();
  const respondMutation = useRespondFriendRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername) return;

    sendMutation.mutate({ data: { targetUsername } }, {
      onSuccess: () => {
        toast({ title: "Request sent", description: `Friend request sent to ${targetUsername}` });
        setTargetUsername("");
        queryClient.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to send", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleRespond = (friendId: number, accept: boolean) => {
    respondMutation.mutate({ friendId, data: { accepted: accept } }, {
      onSuccess: () => {
        toast({ title: accept ? "Request accepted" : "Request rejected" });
        queryClient.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
      }
    });
  };

  const pendingRequests = friends?.filter(f => f.status === 'pending') || [];
  const acceptedFriends = friends?.filter(f => f.status === 'accepted') || [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Users className="w-10 h-10 text-primary" />
        <div>
          <h1 className="text-3xl font-black tracking-tight">FRIENDS LIST</h1>
          <p className="text-muted-foreground mt-1 font-mono">Your competitive circle.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Friends ({acceptedFriends.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-muted-foreground py-4">Loading...</div>
              ) : acceptedFriends.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>You haven't added any friends yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {acceptedFriends.map(friend => (
                    <Link key={friend.id} href={`/profile/${friend.friendUsername}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/50 transition-colors cursor-pointer">
                        <Avatar>
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {friend.friendUsername.substring(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold">{friend.friendUsername}</div>
                          <div className="text-xs text-muted-foreground font-mono">{friend.friendRating} LP</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Add Friend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <Input 
                  placeholder="Enter username" 
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="font-mono bg-secondary/50"
                />
                <Button type="submit" className="w-full" disabled={!targetUsername || sendMutation.isPending}>
                  Send Request
                </Button>
              </form>
            </CardContent>
          </Card>

          {pendingRequests.length > 0 && (
            <Card className="border-accent/50">
              <CardHeader>
                <CardTitle className="text-lg">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="p-4 flex items-center justify-between bg-accent/5">
                      <div className="font-bold">{req.friendUsername}</div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="default" className="h-8 w-8 bg-green-500 hover:bg-green-600" onClick={() => handleRespond(req.friendId, true)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleRespond(req.friendId, false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

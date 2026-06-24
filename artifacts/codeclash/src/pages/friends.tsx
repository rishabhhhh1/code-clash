import { useState } from "react";
import { useGetFriends, getGetFriendsQueryKey, useSendFriendRequest, useRespondFriendRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
        toast({ title: "Request sent" });
        setTargetUsername("");
        queryClient.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleRespond = (friendshipId: number, accept: boolean) => {
    respondMutation.mutate({ friendshipId, data: { accepted: accept } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
      }
    });
  };

  const pendingRequests = friends?.filter(f => f.status === 'pending') || [];
  const acceptedFriends = friends?.filter(f => f.status === 'accepted') || [];

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-12 animate-in fade-in duration-500">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
        <p className="text-muted-foreground text-sm mt-2">Manage your competitive circle.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Directory ({acceptedFriends.length})
            </h2>
            
            <div className="border border-border bg-background divide-y divide-border">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : acceptedFriends.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No friends added yet.</div>
              ) : (
                acceptedFriends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-4">
                    <div>
                      <Link href={`/profile/${friend.friendUsername}`}>
                        <span className="font-medium hover:text-primary transition-colors cursor-pointer">
                          {friend.friendUsername}
                        </span>
                      </Link>
                      <div className="text-xs text-muted-foreground mt-1">
                        {friend.friendRank}
                      </div>
                    </div>
                    <div className="font-mono text-sm">{friend.friendRating} LP</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Add Friend</h2>
            <form onSubmit={handleSend} className="space-y-3">
              <Input 
                placeholder="Username" 
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                className="bg-background"
              />
              <Button type="submit" className="w-full" disabled={!targetUsername || sendMutation.isPending}>
                Send Request
              </Button>
            </form>
          </section>

          {pendingRequests.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Pending</h2>
              <div className="border border-border bg-background divide-y divide-border">
                {pendingRequests.map(req => (
                  <div key={req.id} className="p-4 space-y-3">
                    <div className="font-medium text-sm">{req.friendUsername}</div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleRespond(req.id, true)}>Accept</Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRespond(req.id, false)}>Decline</Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

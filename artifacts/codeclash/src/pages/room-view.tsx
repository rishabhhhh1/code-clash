import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetRoom, getGetRoomQueryKey, useJoinRoom, useSetReady, useStartBattle } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Copy, CheckCircle2, Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RoomView() {
  const [, params] = useRoute("/room/:roomCode");
  const roomCode = params?.roomCode;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: room, isLoading } = useGetRoom(roomCode!, {
    query: {
      enabled: !!roomCode,
      queryKey: getGetRoomQueryKey(roomCode!),
      refetchInterval: 3000 // Poll for updates
    }
  });

  const joinMutation = useJoinRoom();
  const readyMutation = useSetReady();
  const startMutation = useStartBattle();

  const isHost = room?.hostId === user?.id;
  const isParticipant = room?.participants?.some(p => p.userId === user?.id);
  const me = room?.participants?.find(p => p.userId === user?.id);

  // Auto-redirect when battle starts
  useEffect(() => {
    if (room?.status === 'active' && room.battleId) {
      setLocation(`/battle/${room.battleId}`);
    }
  }, [room?.status, room?.battleId, setLocation]);

  const handleJoin = () => {
    if (!roomCode) return;
    joinMutation.mutate({ data: { roomCode } }, {
      onSuccess: () => {
        toast({ title: "Joined room" });
        queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(roomCode) });
      },
      onError: (err: any) => {
        toast({ title: "Failed to join", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleReady = () => {
    readyMutation.mutate({ data: {} }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(roomCode!) });
      }
    });
  };

  const handleStart = () => {
    startMutation.mutate({ data: {} }, {
      onSuccess: (data) => {
        setLocation(`/battle/${data.id}`);
      },
      onError: (err: any) => {
        toast({ title: "Failed to start", description: err.message, variant: "destructive" });
      }
    });
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
    toast({ title: "Copied to clipboard" });
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  if (!room) return <div className="p-8 text-center text-muted-foreground">Room not found</div>;

  const allReady = room.participants?.every(p => p.isReady) && room.participants.length > 1;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Arena {room.roomCode}</h1>
            <Badge variant="outline" className="border-primary text-primary">{room.battleType.toUpperCase()}</Badge>
            <Badge>{room.difficulty.toUpperCase()}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Host: {room.hostUsername}</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copyInvite}>
            <Copy className="w-4 h-4 mr-2" /> Invite Link
          </Button>
          {!isParticipant && (
            <Button onClick={handleJoin} disabled={joinMutation.isPending}>
              {joinMutation.isPending ? "Joining..." : "Join Arena"}
            </Button>
          )}
          {isParticipant && !isHost && (
            <Button 
              variant={me?.isReady ? "secondary" : "default"} 
              onClick={handleReady}
              disabled={readyMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {me?.isReady ? "Ready" : "Click to Ready"}
            </Button>
          )}
          {isHost && (
            <Button 
              className="bg-accent hover:bg-accent/90" 
              onClick={handleStart}
              disabled={!allReady || startMutation.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Battle
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Participants ({room.participants?.length || 0}/{room.maxPlayers})</span>
            {room.status === 'starting' && <span className="text-accent animate-pulse">Battle starting soon...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {room.participants?.map((p) => (
              <div key={p.userId} className="flex items-center justify-between p-4 bg-secondary/20 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="font-mono font-bold text-lg">{p.username}</div>
                  <Badge variant="outline" className="text-xs">{p.rating} LP</Badge>
                  {p.isHost && <Badge variant="secondary" className="text-xs">HOST</Badge>}
                </div>
                <div>
                  {p.isReady ? (
                    <span className="flex items-center text-primary font-bold"><CheckCircle2 className="w-4 h-4 mr-1"/> Ready</span>
                  ) : (
                    <span className="flex items-center text-muted-foreground"><Loader2 className="w-4 h-4 mr-1 animate-spin"/> Waiting</span>
                  )}
                </div>
              </div>
            ))}
            
            {Array.from({ length: Math.max(0, room.maxPlayers - (room.participants?.length || 0)) }).map((_, i) => (
              <div key={i} className="flex items-center justify-center p-4 border border-dashed border-border rounded-lg text-muted-foreground/50">
                <Users className="w-5 h-5 mr-2" /> Empty Slot
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

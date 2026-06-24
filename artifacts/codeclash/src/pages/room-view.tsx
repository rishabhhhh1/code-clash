import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetRoom, getGetRoomQueryKey, useJoinRoom, useSetReady, useStartBattle } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, Hash } from "lucide-react";
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
      refetchInterval: 3000
    }
  });

  const joinMutation = useJoinRoom();
  const readyMutation = useSetReady();
  const startMutation = useStartBattle();

  const isHost = room?.hostId === user?.id;
  const isParticipant = room?.participants?.some(p => p.userId === user?.id);
  const me = room?.participants?.find(p => p.userId === user?.id);

  useEffect(() => {
    if (room?.status === 'active' && room.battleId) {
      setLocation(`/battle/${room.battleId}`);
    }
  }, [room?.status, room?.battleId, setLocation]);

  const handleJoin = () => {
    if (!roomCode) return;
    joinMutation.mutate({ roomCode, data: {} }, {
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
    if (!roomCode) return;
    readyMutation.mutate({ roomCode }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(roomCode!) });
      }
    });
  };

  const handleStart = () => {
    if (!roomCode) return;
    startMutation.mutate({ roomCode }, {
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

  if (isLoading) return <div className="p-8 max-w-3xl mx-auto"><Skeleton className="h-64 w-full" /></div>;
  if (!room) return <div className="p-8 text-center text-muted-foreground">Room not found</div>;

  const nonHostParticipants = room.participants?.filter(p => !p.isHost) ?? [];
  const allReady = nonHostParticipants.length > 0 && nonHostParticipants.every(p => p.isReady);

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Room <span className="font-mono text-primary">{room.roomCode}</span>
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Host: {room.hostUsername}</span>
            <span>•</span>
            <span className="uppercase">{room.battleType.replace('_', ' ')}</span>
            <span>•</span>
            <span className="capitalize">{room.difficulty}</span>
          </div>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={copyInvite} className="flex-1 sm:flex-none">
            <Copy className="w-3 h-3 mr-2" /> Invite
          </Button>
          {!isParticipant && (
            <Button size="sm" onClick={handleJoin} disabled={joinMutation.isPending} className="flex-1 sm:flex-none">
              {joinMutation.isPending ? "Joining..." : "Join"}
            </Button>
          )}
          {isParticipant && !isHost && (
            <Button 
              size="sm"
              variant={me?.isReady ? "outline" : "default"} 
              onClick={handleReady}
              disabled={readyMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              {me?.isReady ? "Ready" : "Mark Ready"}
            </Button>
          )}
          {isHost && (
            <Button 
              size="sm"
              onClick={handleStart}
              disabled={!allReady || startMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              Start Battle
            </Button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Participants ({room.participants?.length || 0}/{room.maxPlayers})
          </h2>
          {room.status === 'starting' && <span className="text-xs font-medium text-primary animate-pulse">Starting...</span>}
        </div>

        <div className="bg-background border border-border divide-y divide-border">
          {room.participants?.map((p) => (
            <div key={p.userId} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="font-mono font-medium">{p.username}</div>
                <div className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">{p.rating} LP</div>
                {p.isHost && <span className="text-[10px] uppercase tracking-wider font-bold text-primary">Host</span>}
              </div>
              <div>
                {p.isReady ? (
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3"/> Ready
                  </span>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    Waiting
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {Array.from({ length: Math.max(0, room.maxPlayers - (room.participants?.length || 0)) }).map((_, i) => (
            <div key={i} className="flex items-center p-4 text-muted-foreground/40 border-l-[3px] border-transparent">
              <span className="text-sm">Empty Slot</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

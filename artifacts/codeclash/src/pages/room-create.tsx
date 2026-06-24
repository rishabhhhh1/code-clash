import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateRoom } from "@workspace/api-client-react";
import { RoomInputBattleType, RoomInputDifficulty } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Swords } from "lucide-react";

export default function CreateRoom() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createRoomMutation = useCreateRoom();

  const [battleType, setBattleType] = useState<RoomInputBattleType>("duel");
  const [difficulty, setDifficulty] = useState<RoomInputDifficulty>("medium");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [topic, setTopic] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRoomMutation.mutate({
      data: {
        battleType,
        difficulty,
        maxPlayers,
        topic: topic || undefined,
        isPrivate,
        requireApproval
      }
    }, {
      onSuccess: (room) => {
        toast({ title: "Room Created", description: `Room ${room.roomCode} initialized.` });
        setLocation(`/room/${room.roomCode}`);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create room", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Swords className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Configure Battle</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room Parameters</CardTitle>
          <CardDescription>Set the rules of engagement.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Battle Type</Label>
                <Select value={battleType} onValueChange={(val: any) => setBattleType(val)}>
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="duel">1v1 Duel</SelectItem>
                    <SelectItem value="deathmatch">Deathmatch</SelectItem>
                    <SelectItem value="multiplayer">Free for All</SelectItem>
                    <SelectItem value="topic_battle">Topic Battle</SelectItem>
                    <SelectItem value="battle_royale">Battle Royale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(val: any) => setDifficulty(val)}>
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (800-1200)</SelectItem>
                    <SelectItem value="medium">Medium (1300-1700)</SelectItem>
                    <SelectItem value="hard">Hard (1800+)</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max Players</Label>
                <Input 
                  type="number" 
                  min={2} 
                  max={100} 
                  value={maxPlayers} 
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))} 
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label>Specific Topic (Optional)</Label>
                <Input 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)} 
                  placeholder="e.g. dp, graphs, math"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Private Room</Label>
                  <p className="text-sm text-muted-foreground">Hide from public lobby.</p>
                </div>
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Approval</Label>
                  <p className="text-sm text-muted-foreground">Manually accept participants.</p>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createRoomMutation.isPending}>
              {createRoomMutation.isPending ? "INITIALIZING..." : "CREATE ARENA"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

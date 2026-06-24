import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateRoom } from "@workspace/api-client-react";
import { RoomInputBattleType, RoomInputDifficulty } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

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
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="mb-8 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">Configure Battle</h1>
        <p className="text-muted-foreground text-sm mt-1">Set the parameters for your room.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-2">
            <Label>Battle Type</Label>
            <Select value={battleType} onValueChange={(val: any) => setBattleType(val)}>
              <SelectTrigger>
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
              <SelectTrigger>
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
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Specific Topic <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)} 
              placeholder="e.g. dp, graphs, math"
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-border">
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

        <div className="pt-6 border-t border-border flex justify-end">
          <Button type="submit" disabled={createRoomMutation.isPending} className="w-full sm:w-auto">
            {createRoomMutation.isPending ? "Creating..." : "Create Arena"}
          </Button>
        </div>
      </form>
    </div>
  );
}

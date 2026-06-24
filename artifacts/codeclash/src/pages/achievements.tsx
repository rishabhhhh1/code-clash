import { useGetAllAchievements, useGetMyAchievements } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock } from "lucide-react";

export default function Achievements() {
  const { data: allAchievements, isLoading: allLoading } = useGetAllAchievements();
  const { data: myAchievements, isLoading: myLoading } = useGetMyAchievements();

  if (allLoading || myLoading) return <div className="p-8 text-center text-muted-foreground">Loading achievements...</div>;

  const unlockedIds = new Set(myAchievements?.map(a => a.achievement.id));

  // Group achievements by category
  const grouped = allAchievements?.reduce((acc: any, ach: any) => {
    if (!acc[ach.category]) acc[ach.category] = [];
    acc[ach.category].push(ach);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-3xl font-black tracking-tight">ACHIEVEMENTS</h1>
            <p className="text-muted-foreground mt-1 font-mono">Milestones of your coding journey.</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-primary font-mono">{unlockedIds.size} / {allAchievements?.length || 0}</div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Unlocked</p>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(grouped || {}).map(([category, achievements]: [string, any]) => (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((ach: any) => {
                const isUnlocked = unlockedIds.has(ach.id);
                return (
                  <Card key={ach.id} className={`overflow-hidden transition-all ${isUnlocked ? 'border-primary/50 bg-card' : 'border-border/50 bg-secondary/10 opacity-70 grayscale'}`}>
                    <CardContent className="p-6 flex gap-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${isUnlocked ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {isUnlocked ? (
                          <span className="text-3xl">{ach.icon || '🏆'}</span>
                        ) : (
                          <Lock className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className={`font-bold ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{ach.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-tight">{ach.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

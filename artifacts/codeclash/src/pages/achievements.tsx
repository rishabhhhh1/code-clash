import { useGetAllAchievements, useGetMyAchievements } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

export default function Achievements() {
  const { user } = useAuth();
  const { data: allAchievements, isLoading: loadingAll } = useGetAllAchievements();
  const { data: myAchievements, isLoading: loadingMy } = useGetMyAchievements({ query: { enabled: !!user } });

  const isUnlocked = (achievementId: number) => {
    return myAchievements?.some((ua: any) => ua.achievement.id === achievementId);
  };

  const unlockedAt = (achievementId: number) => {
    const ua = myAchievements?.find((ua: any) => ua.achievement.id === achievementId);
    return ua ? new Date(ua.unlockedAt).toLocaleDateString() : null;
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-12 animate-in fade-in duration-500">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
        <p className="text-muted-foreground text-sm mt-2">Milestones earned in the arena.</p>
      </div>

      {(loadingAll || loadingMy) ? (
        <div className="text-center text-sm font-mono text-muted-foreground py-12">Loading achievements...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allAchievements?.map((achievement: any) => {
            const unlocked = isUnlocked(achievement.id);
            const date = unlockedAt(achievement.id);
            
            return (
              <div 
                key={achievement.id} 
                className={`border p-6 relative overflow-hidden transition-all duration-300 ${
                  unlocked 
                    ? 'border-primary bg-background shadow-sm' 
                    : 'border-border bg-secondary/20 grayscale opacity-60'
                }`}
              >
                <div className="mb-4 text-2xl">{achievement.icon}</div>
                <h3 className="font-semibold mb-1">{achievement.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{achievement.description}</p>
                
                <div className="flex items-center justify-between text-xs font-mono pt-4 border-t border-border">
                  <span className="uppercase text-muted-foreground">{achievement.category}</span>
                  {unlocked ? (
                    <span className="text-primary font-medium">{date}</span>
                  ) : (
                    <span className="text-muted-foreground">LOCKED</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

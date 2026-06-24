import { Types } from 'mongoose';
import { Achievement } from '../models/Achievement';

const ACHIEVEMENTS: Record<string, { name: string; description: string; icon: string }> = {
  first_win: { name: 'First Win', description: 'Win your first battle', icon: '🏆' },
  win_streak_3: { name: '3 Win Streak', description: 'Win 3 battles in a row', icon: '🔥' },
  win_streak_5: { name: '5 Win Streak', description: 'Win 5 battles in a row', icon: '⚡' },
  win_streak_10: { name: '10 Win Streak', description: 'Win 10 battles in a row', icon: '👑' },
  topic_master: { name: 'Topic Master', description: 'Win a topic battle', icon: '🎯' },
  battle_royale_winner: { name: 'Battle Royale Winner', description: 'Win a battle royale', icon: '🎖️' },
  arena_champion: { name: 'Arena Champion', description: 'Win an arena mode battle', icon: '🏅' },
};

async function award(userId: Types.ObjectId, type: string) {
  const def = ACHIEVEMENTS[type];
  if (!def) return;

  try {
    await Achievement.create({
      user: userId,
      type,
      name: def.name,
      description: def.description,
      icon: def.icon,
    });
  } catch {
    // duplicate achievement — ignore
  }
}

export async function grantAchievements(
  userId: Types.ObjectId,
  ctx: { isWinner: boolean; winStreak: number; mode: string; topics: string[] }
) {
  if (!ctx.isWinner) return;

  await award(userId, 'first_win');

  if (ctx.winStreak >= 3) await award(userId, 'win_streak_3');
  if (ctx.winStreak >= 5) await award(userId, 'win_streak_5');
  if (ctx.winStreak >= 10) await award(userId, 'win_streak_10');

  if (ctx.mode === 'topic_battle') await award(userId, 'topic_master');
  if (ctx.mode === 'battle_royale') await award(userId, 'battle_royale_winner');
  if (ctx.mode === 'arena') await award(userId, 'arena_champion');
}

export async function getUserAchievements(userId: string) {
  return Achievement.find({ user: userId }).sort({ earnedAt: -1 });
}

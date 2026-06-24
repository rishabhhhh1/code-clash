import { Types } from 'mongoose';

interface QueueEntry {
  userId: string;
  rating: number;
  preferredTopics: string[];
  preferredDifficulty: string;
  mode: string;
  joinedAt: Date;
}

const queue: Map<string, QueueEntry> = new Map();

export function joinQueue(
  userId: string,
  preferences: {
    rating: number;
    preferredTopics?: string[];
    preferredDifficulty?: string;
    mode?: string;
  }
): QueueEntry {
  const entry: QueueEntry = {
    userId,
    rating: preferences.rating,
    preferredTopics: preferences.preferredTopics || [],
    preferredDifficulty: preferences.preferredDifficulty || 'all',
    mode: preferences.mode || '1v1_duel',
    joinedAt: new Date(),
  };

  queue.set(userId, entry);
  return entry;
}

export function leaveQueue(userId: string): boolean {
  return queue.delete(userId);
}

export function findMatch(entry: QueueEntry): QueueEntry | null {
  const RATING_RANGE = 200;

  for (const [userId, candidate] of queue) {
    if (userId === entry.userId) continue;

    const ratingDiff = Math.abs(entry.rating - candidate.rating);
    if (ratingDiff > RATING_RANGE) continue;

    if (
      entry.preferredTopics.length > 0 &&
      candidate.preferredTopics.length > 0
    ) {
      const hasOverlap = entry.preferredTopics.some((t) =>
        candidate.preferredTopics.includes(t)
      );
      if (!hasOverlap) continue;
    }

    if (
      entry.preferredDifficulty !== 'all' &&
      candidate.preferredDifficulty !== 'all' &&
      entry.preferredDifficulty !== candidate.preferredDifficulty
    ) {
      continue;
    }

    return candidate;
  }

  return null;
}

export function getQueueStats(): {
  totalSize: number;
  entries: Array<{ userId: string; waitTime: number }>;
} {
  const now = Date.now();
  const entries = Array.from(queue.values()).map((e) => ({
    userId: e.userId,
    waitTime: Math.floor((now - e.joinedAt.getTime()) / 1000),
  }));

  return { totalSize: queue.size, entries };
}

export function isInQueue(userId: string): boolean {
  return queue.has(userId);
}

export function getEntry(userId: string): QueueEntry | undefined {
  return queue.get(userId);
}

import { getRankFromRating } from '@codeclash/shared';

const K_FACTOR = 32;
const NEW_USER_K_FACTOR = 64;
const BATTLES_FOR_STABLE = 30;

export interface EloResult {
  ratingChange: number;
  newRating: number;
  newRank: string;
}

export const calculateElo = (
  playerRating: number,
  opponentRating: number,
  playerWon: boolean,
  totalBattles: number
): EloResult => {
  // Determine K-factor based on experience
  const k = totalBattles < BATTLES_FOR_STABLE ? NEW_USER_K_FACTOR : K_FACTOR;

  // Calculate expected score
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

  // Actual score (1 for win, 0 for loss)
  const actualScore = playerWon ? 1 : 0;

  // Calculate rating change
  const ratingChange = Math.round(k * (actualScore - expectedScore));
  const newRating = Math.max(0, playerRating + ratingChange);
  const newRank = getRankFromRating(newRating);

  return {
    ratingChange,
    newRating,
    newRank,
  };
};

export const calculateMultiplayer = (
  playerRating: number,
  placement: number,
  totalPlayers: number,
  totalBattles: number
): EloResult => {
  // For multiplayer, adjust ELO based on placement
  const k = totalBattles < BATTLES_FOR_STABLE ? NEW_USER_K_FACTOR : K_FACTOR;

  // Calculate expected placement (random would be totalPlayers/2)
  const expectedPlacement = totalPlayers / 2;
  const performanceRatio = expectedPlacement / (placement + 0.5); // +0.5 for tie-breaking

  // Adjust ELO based on performance
  let ratingChange = Math.round(k * (performanceRatio - 1) * 2);

  // Cap the change
  ratingChange = Math.max(-k, Math.min(k, ratingChange));

  const newRating = Math.max(0, playerRating + ratingChange);
  const newRank = getRankFromRating(newRating);

  return {
    ratingChange,
    newRating,
    newRank,
  };
};

export const calculateAverageRating = (ratings: number[]): number => {
  if (ratings.length === 0) return 1500;
  return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
};

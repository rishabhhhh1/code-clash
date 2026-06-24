import { User } from '../models/User';
import { Battle } from '../models/Battle';

export const MATCHMAKING_RANGES = {
  1000: 500,
  1200: 600,
  1400: 700,
  1600: 800,
  1800: 1000,
  2000: 1200,
  2200: 1500,
  2400: 2000,
  2600: 2500,
  3000: 5000,
};

export const getRatingRange = (rating: number): [number, number] => {
  let range = 500;

  for (const [bracket, rangeValue] of Object.entries(MATCHMAKING_RANGES)) {
    const bracketRating = parseInt(bracket);
    if (rating >= bracketRating) {
      range = rangeValue;
    }
  }

  return [Math.max(0, rating - range), rating + range];
};

export const findMatchingOpponent = async (
  userId: string,
  userRating: number
): Promise<string | null> => {
  const [minRating, maxRating] = getRatingRange(userRating);

  // Find users in the rating range who are also searching
  const opponent = await User.findOne({
    _id: { $ne: userId },
    rating: { $gte: minRating, $lte: maxRating },
    isOnline: true,
    // In production, would also check if user is in matchmaking queue
  });

  return opponent?._id.toString() || null;
};

export const getRecommendedDifficulty = (rating: number): 'easy' | 'medium' | 'hard' => {
  if (rating < 1200) return 'easy';
  if (rating < 1800) return 'medium';
  return 'hard';
};

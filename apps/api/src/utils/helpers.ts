export const generateBattleCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

export const getRandomArray = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const calculateSolveTime = (startTime: Date): number => {
  return Math.round((Date.now() - startTime.getTime()) / 1000);
};

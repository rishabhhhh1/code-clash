import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBattleStore } from './store/battleStore';

let socket: Socket | null = null;

export const useSocket = (battleCode?: string, token?: string) => {
  const { updateLeaderboard } = useBattleStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });
    }

    socketRef.current = socket;

    if (battleCode && token) {
      socket.emit('join:battle', { battleCode, token });

      socket.on('battle:player_joined', (data) => {
        console.log('Player joined:', data);
      });

      socket.on('submission:result', (data) => {
        console.log('Submission result:', data);
        // Update leaderboard
      });

      socket.on('battle:ended', (data) => {
        console.log('Battle ended:', data);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    }

    return () => {
      if (battleCode) {
        socket?.emit('leave:battle', { battleCode });
      }
    };
  }, [battleCode, token, updateLeaderboard]);

  return socketRef.current;
};

export const emitSubmissionResult = (payload: any) => {
  if (socket) {
    socket.emit('submission:result', payload);
  }
};

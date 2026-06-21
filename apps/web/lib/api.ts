/**
 * Get the WebSocket URL for Socket.IO connections
 * In development: http://localhost:3001
 * In production: wss://your-api.up.railway.app
 */
export function getWsUrl(): string {
  // If explicitly set, use that
  if (typeof window !== 'undefined') {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (wsUrl) return wsUrl;
  }

  // In browser, derive from API URL
  if (typeof window !== 'undefined') {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Convert http(s) to ws(s)
    if (apiUrl.startsWith('https://')) {
      return apiUrl.replace('https://', 'wss://');
    } else if (apiUrl.startsWith('http://')) {
      return apiUrl.replace('http://', 'ws://');
    }
    return apiUrl;
  }

  // Server-side fallback
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
}

/**
 * Get the API URL for fetch requests
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

// API Configuration
// These values are used at runtime in the browser

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = (() => {
  const apiUrl = API_URL;
  if (apiUrl.startsWith('https://')) {
    return apiUrl.replace('https://', 'wss://');
  } else if (apiUrl.startsWith('http://')) {
    return apiUrl.replace('http://', 'ws://');
  }
  return apiUrl;
})();
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

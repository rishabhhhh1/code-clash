import { useState, useEffect } from "react";
import { getAuthToken, parseJwt, removeAuthToken, setAuthToken } from "@/lib/auth-utils";

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setUser(decoded);
      } else {
        // Expired token
        logout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const login = (newToken: string) => {
    setAuthToken(newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    removeAuthToken();
    setTokenState(null);
    setUser(null);
  };

  return {
    token,
    user,
    isAuthenticated: !!user,
    login,
    logout,
  };
}

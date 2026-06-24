export function getAuthToken(): string | null {
  return localStorage.getItem("cc_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("cc_token", token);
}

export function removeAuthToken() {
  localStorage.removeItem("cc_token");
}

export function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

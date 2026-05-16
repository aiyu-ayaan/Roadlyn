const ACCESS_TOKEN_KEY = 'roadlyn.accessToken';
const TOKEN_SCOPE_KEY = 'roadlyn.tokenScope';

export const tokenStorage = {
  getAccessToken() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string, scope?: string) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);

    if (scope) {
      window.localStorage.setItem(TOKEN_SCOPE_KEY, scope);
    }
  },
  getScope() {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.localStorage.getItem(TOKEN_SCOPE_KEY) ?? '';
  },
  clear() {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_SCOPE_KEY);
  },
};

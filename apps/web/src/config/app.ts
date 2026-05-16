export const appConfig = {
  name: 'Roadlyn',
  description: 'AI-powered learning roadmaps with dynamic provider control.',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  wsUrl:
    process.env.NEXT_PUBLIC_WS_URL ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws') ??
    'ws://localhost:3001',
};

export const protectedRoutes = ['/dashboard', '/roadmaps', '/settings', '/providers'];

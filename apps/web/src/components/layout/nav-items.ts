import {
  Compass,
  Gauge,
  KeyRound,
  Map,
  MessageSquare,
  Settings,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react';

export const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Gauge },
  { href: '/roadmaps', label: 'Roadmaps', icon: Map },
  { href: '/workspace', label: 'AI Workspace', icon: MessageSquare },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/settings/profile', label: 'Profile', icon: User },
];

export const settingsNavItems = [
  { href: '/settings/profile', label: 'Profile', icon: User },
  { href: '/settings/ai', label: 'AI Preferences', icon: Sparkles },
  { href: '/settings/providers', label: 'Provider Keys', icon: KeyRound },
  { href: '/settings/appearance', label: 'Appearance', icon: Settings },
];

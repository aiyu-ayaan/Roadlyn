import {
  Bot,
  Gauge,
  KeyRound,
  Map,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';

export const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Gauge },
  { href: '/roadmaps', label: 'Roadmaps', icon: Map },
  { href: '/roadmaps/generate', label: 'Generate', icon: Sparkles },
  { href: '/settings/ai', label: 'AI Settings', icon: Bot },
  { href: '/settings/providers', label: 'Providers', icon: KeyRound },
];

export const settingsNavItems = [
  { href: '/settings/profile', label: 'Profile', icon: User },
  { href: '/settings/ai', label: 'AI Preferences', icon: Sparkles },
  { href: '/settings/providers', label: 'Provider Keys', icon: KeyRound },
  { href: '/settings/appearance', label: 'Appearance', icon: Settings },
];

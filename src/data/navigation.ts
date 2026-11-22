import {
  House, Compass, MessageSquare, Users, CalendarDays, HeartHandshake,
  Newspaper, Sparkles, Bell, UserRound, Bookmark, type LucideIcon,
} from 'lucide-react'

export type NavItem = { label: string; path: string; icon: LucideIcon }

export const mainNavigation: NavItem[] = [
  { label: 'Home', path: '/', icon: House },
  { label: 'Discover', path: '/discover', icon: Compass },
  { label: 'Community', path: '/community', icon: MessageSquare },
  { label: 'Groups', path: '/groups', icon: Users },
  { label: 'Events', path: '/events', icon: CalendarDays },
  { label: 'Fan Projects', path: '/projects', icon: HeartHandshake },
  { label: 'LYKN Updates', path: '/updates', icon: Newspaper },
  { label: 'Memory Galaxy', path: '/memories', icon: Sparkles },
  { label: 'Messages', path: '/messages', icon: MessageSquare },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
  { label: 'My Profile', path: '/profile', icon: UserRound },
]

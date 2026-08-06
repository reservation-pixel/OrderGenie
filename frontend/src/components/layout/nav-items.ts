import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  Boxes,
  ClipboardList,
  Store,
  FileBarChart,
  Settings,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Sales', href: '/sales', icon: Receipt },
  { label: 'Item Sales', href: '/item-sales', icon: UtensilsCrossed },
  { label: 'Inventory', href: '/inventory', icon: Boxes },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList },
  { label: 'Outlets', href: '/outlets', icon: Store },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

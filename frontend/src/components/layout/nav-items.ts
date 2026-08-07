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
  ChefHat,
  Building2,
  Webhook,
  Star,
} from 'lucide-react';

export interface NavItem {
  label: string;
  /** Leaf items link here. Section items (with `children`) omit this — the header only toggles. */
  href?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Presence of `children` renders this as a collapsible section instead of a direct link. */
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Capiche',
    icon: Building2,
    children: [
      { label: 'Overview', href: '/capiche/overview', icon: LayoutDashboard },
      { label: 'Sales', href: '/capiche/sales', icon: Receipt },
      { label: 'Class A Items', href: '/capiche/class-a-items', icon: Star },
      { label: 'Inventory', href: '/capiche/inventory', icon: Boxes },
      { label: 'Purchase Orders', href: '/capiche/purchase-orders', icon: ClipboardList },
      { label: 'Sales API', href: '/capiche/sales-api', icon: Webhook, adminOnly: true },
    ],
  },
  {
    label: 'Aiko',
    icon: ChefHat,
    children: [
      { label: 'Overview', href: '/aiko/overview', icon: LayoutDashboard },
      { label: 'Sales', href: '/aiko/sales', icon: Receipt },
      { label: 'Inventory', href: '/aiko/inventory', icon: Boxes },
      { label: 'Purchase Orders', href: '/aiko/purchase-orders', icon: ClipboardList },
      { label: 'Sales API', href: '/aiko/sales-api', icon: Webhook, adminOnly: true },
    ],
  },
  { label: 'Sales', href: '/sales', icon: Receipt },
  { label: 'Item Sales', href: '/item-sales', icon: UtensilsCrossed },
  { label: 'Inventory', href: '/inventory', icon: Boxes },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList },
  { label: 'Outlets', href: '/outlets', icon: Store },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

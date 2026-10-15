import {
  Building2,
  ChartNoAxesCombined,
  Database,
  LayoutDashboard,
  PanelsTopLeft,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  /** Only implemented pages are navigable; others render as disabled placeholders. */
  isImplemented: boolean;
  isActive?: boolean;
};

export const primaryNavItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, isImplemented: true, isActive: true },
  { label: "Time & Trend Analysis", icon: ChartNoAxesCombined, isImplemented: false },
  { label: "Operator & Station Analysis", icon: Building2, isImplemented: false },
  { label: "OLAP Explorer", icon: PanelsTopLeft, isImplemented: false },
];

export const secondaryNavItems: NavItem[] = [
  { label: "Dataset Status", icon: Database, isImplemented: false },
  { label: "Settings", icon: Settings, isImplemented: false },
];

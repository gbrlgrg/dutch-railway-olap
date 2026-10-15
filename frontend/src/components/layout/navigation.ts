import {
  ChartNoAxesCombined,
  Database,
  LayoutDashboard,
  PanelsTopLeft,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type PageId = "overview" | "time-trend" | "olap-explorer";

export type NavItem = {
  id?: PageId;
  label: string;
  icon: LucideIcon;
  /** Only implemented pages are navigable; others render as disabled placeholders. */
  isImplemented: boolean;
};

export const primaryNavItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, isImplemented: true },
  { id: "time-trend", label: "Time & Trend Analysis", icon: ChartNoAxesCombined, isImplemented: true },
  { id: "olap-explorer", label: "OLAP Explorer", icon: PanelsTopLeft, isImplemented: true },
];

export const secondaryNavItems: NavItem[] = [
  { label: "Dataset Status", icon: Database, isImplemented: false },
  { label: "Settings", icon: Settings, isImplemented: false },
];

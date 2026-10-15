import { TrainFront } from "lucide-react";

import {
  primaryNavItems,
  secondaryNavItems,
  type NavItem,
  type PageId,
} from "@/components/layout/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function NavEntry({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: (page: PageId) => void;
}) {
  const Icon = item.icon;
  const base = "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm";

  if (!item.isImplemented) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, "cursor-not-allowed text-sidebar-foreground/55")}
        title="Coming soon"
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="rounded bg-sidebar-foreground/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
          Soon
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => item.id && onNavigate?.(item.id)}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        base,
        "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring text-left cursor-pointer",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-ring)]"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

/** Sidebar contents shared by the desktop sidebar and the mobile sheet. */
export function SidebarContent({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate?: (page: PageId) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
      <div className="flex items-center gap-2 px-2">
        <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <TrainFront className="size-4" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold tracking-tight text-sidebar-primary">Dutch Railway</span>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col">
        <ul className="space-y-1">
          {primaryNavItems.map((item) => (
            <li key={item.label}>
              <NavEntry
                item={item}
                isActive={item.id === activePage}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
        <Separator className="my-4 bg-sidebar-border" />
        <ul className="space-y-1">
          {secondaryNavItems.map((item) => (
            <li key={item.label}>
              <NavEntry item={item} isActive={false} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function AppSidebar({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate?: (page: PageId) => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
      <SidebarContent activePage={activePage} onNavigate={onNavigate} />
    </aside>
  );
}

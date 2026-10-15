import { Menu } from "lucide-react";

import { SidebarContent } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** Collapsible navigation for screens narrower than the `lg` breakpoint. */
export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation" />}
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>[data-slot=sheet-close]]:text-sidebar-foreground [&>[data-slot=sheet-close]]:hover:bg-sidebar-accent"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}

import { ChevronRight, CornerLeftUp, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HierarchyBreadcrumb } from "@/types/timeTrend";

type HierarchyScopeBarProps = {
  breadcrumbs: HierarchyBreadcrumb[];
  parentScopeDescription: string;
  canRollUp: boolean;
  onRollUp: () => void;
  onBreadcrumbClick: (index: number) => void;
  onReset: () => void;
};

export function HierarchyScopeBar({
  breadcrumbs,
  parentScopeDescription,
  canRollUp,
  onRollUp,
  onBreadcrumbClick,
  onReset,
}: HierarchyScopeBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
      <div className="flex flex-col gap-1.5 min-w-0">
        <nav aria-label="OLAP Hierarchy Path" className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Hierarchy:
          </span>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={crumb.periodKey} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                {isLast ? (
                  <span className="font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4">
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBreadcrumbClick(index)}
                    className="font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            );
          })}
        </nav>
        <p className="text-xs text-muted-foreground">{parentScopeDescription}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onRollUp}
          disabled={!canRollUp}
          aria-label="Roll up to previous level"
          title={canRollUp ? "Roll up one hierarchy level" : "Already at highest level (Years)"}
          className="gap-1.5 text-xs h-8"
        >
          <CornerLeftUp className="size-3.5" aria-hidden="true" />
          <span>Roll Up</span>
        </Button>

        {canRollUp && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            aria-label="Reset hierarchy to root"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Reset to Years</span>
          </Button>
        )}

        <Badge variant="outline" className="text-xs font-medium border-primary/30 bg-primary/5 text-primary">
          OLAP Roll-up / Drill-down
        </Badge>
      </div>
    </div>
  );
}

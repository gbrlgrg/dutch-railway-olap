import type { LucideIcon } from "lucide-react";

import { InfoTooltip } from "@/components/overview/ChartCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type OverviewKpiCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  definition: string;
  /** Pre-formatted comparison, e.g. "+0.3 min vs previous period". */
  comparison?: string | null;
  isLoading?: boolean;
};

export function OverviewKpiCard({ label, value, icon: Icon, definition, comparison, isLoading }: OverviewKpiCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
            <InfoTooltip label={label}>{definition}</InfoTooltip>
          </div>
          <span className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
        ) : (
          <div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
            {comparison && <p className="mt-1 text-xs text-muted-foreground tabular-nums">{comparison}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

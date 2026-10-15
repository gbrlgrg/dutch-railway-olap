import type { ReactNode } from "react";
import { Inbox, Info, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AsyncStatus = "loading" | "error" | "success";

/** Accessible "i" button that reveals a metric definition. */
export function InfoTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`About ${label}`}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <TriangleAlert className="size-6 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message ?? "This data could not be loaded."}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden="true" /> Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ message = "No data matches the selected filters." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

type ChartCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
  status: AsyncStatus;
  isEmpty: boolean;
  onRetry?: () => void;
  className?: string;
  /** Height of the loading skeleton, matching the rendered content. */
  skeletonClassName?: string;
  children: ReactNode;
};

/** Card shell that handles loading, error, and empty states uniformly. */
export function ChartCard({
  title,
  description,
  action,
  status,
  isEmpty,
  onRetry,
  className,
  skeletonClassName = "h-64",
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle>
          <h2 className="text-base font-semibold">{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent aria-busy={status === "loading"}>
        {status === "loading" ? (
          <Skeleton className={cn("w-full", skeletonClassName)} />
        ) : status === "error" ? (
          <ErrorState onRetry={onRetry} />
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

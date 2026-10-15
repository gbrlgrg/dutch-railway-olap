import { ArrowRight, ChartNoAxesCombined, PanelsTopLeft, type LucideIcon } from "lucide-react";

import type { PageId } from "@/components/layout/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ExploreLink = {
  id?: PageId;
  title: string;
  description: string;
  icon: LucideIcon;
  isImplemented: boolean;
};

const LINKS: ExploreLink[] = [
  {
    id: "time-trend",
    title: "Time & Trend Analysis",
    description: "Inspect reliability and delay trends across yearly, quarterly, monthly, and daily hierarchies.",
    icon: ChartNoAxesCombined,
    isImplemented: true,
  },
  {
    id: "olap-explorer",
    title: "OLAP Explorer",
    description: "Multi-dimensional cube analysis: choose dimensions, roll-up, drill-down, slice, dice, and pivot.",
    icon: PanelsTopLeft,
    isImplemented: true,
  },
];

type ExploreFurtherCardsProps = {
  onNavigate?: (page: PageId) => void;
};

export function ExploreFurtherCards({ onNavigate }: ExploreFurtherCardsProps) {
  return (
    <section aria-labelledby="explore-further-heading" className="space-y-3">
      <h2 id="explore-further-heading" className="text-base font-semibold">
        Explore further
      </h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {LINKS.map(({ id, title, description, icon: Icon, isImplemented }) => (
          <li key={title}>
            <Card
              size="sm"
              className={cn(
                "h-full transition-all",
                isImplemented ? "hover:border-primary/50 hover:shadow-xs cursor-pointer" : "opacity-85",
              )}
              onClick={() => {
                if (isImplemented && id && onNavigate) {
                  onNavigate(id);
                }
              }}
            >
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="flex gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md",
                      isImplemented
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{title}</h3>
                      {isImplemented ? (
                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px] uppercase">
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          Next
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </div>

                {isImplemented && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 size-8 text-muted-foreground hover:text-primary"
                    aria-label={`Open ${title}`}
                  >
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

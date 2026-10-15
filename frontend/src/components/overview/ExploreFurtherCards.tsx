import { Building2, ChartNoAxesCombined, PanelsTopLeft, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type ExploreLink = { title: string; description: string; icon: LucideIcon };

const LINKS: ExploreLink[] = [
  {
    title: "Time & Trend Analysis",
    description: "Inspect reliability at different time granularities.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Operator & Station Analysis",
    description: "Compare performance by operator and station.",
    icon: Building2,
  },
  {
    title: "OLAP Explorer",
    description: "Choose dimensions and measures for roll-up, drill-down, slice, dice, and pivot analysis.",
    icon: PanelsTopLeft,
  },
];

/** Entry points to future pages. Rendered as non-interactive until routes exist. */
export function ExploreFurtherCards() {
  return (
    <section aria-labelledby="explore-further-heading" className="space-y-3">
      <h2 id="explore-further-heading" className="text-base font-semibold">
        Explore further
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {LINKS.map(({ title, description, icon: Icon }) => (
          <li key={title}>
            <Card size="sm" className="h-full" aria-disabled="true">
              <CardContent className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium">{title}</h3>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Coming soon
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { ArrowLeft, Database, PanelsTopLeft, Sparkles } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import type { PageId } from "@/components/layout/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OlapExplorerPageProps = {
  onNavigate?: (page: PageId) => void;
};

export function OlapExplorerPage({ onNavigate }: OlapExplorerPageProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader
        title="OLAP Explorer"
        subtitle="Multi-dimensional slice, dice, roll-up, and drill-down cube explorer."
        activePage="olap-explorer"
        onNavigate={onNavigate}
        dateRange="all-data"
        onDateRangeChange={() => {}}
        onRefresh={() => {}}
        isRefreshing={false}
        dataTimestamp="2025-01-02T06:00:00Z"
        isDemoData={true}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-12 sm:px-6">
        <Card className="text-center p-8 border-dashed border-2">
          <CardHeader className="flex flex-col items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PanelsTopLeft className="size-7" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-xl font-bold">OLAP Explorer</CardTitle>
                <Badge variant="outline" className="text-xs uppercase tracking-wide border-primary/30 text-primary bg-primary/5">
                  Page 3 of 3 Planned
                </Badge>
              </div>
              <CardDescription className="text-sm max-w-md mx-auto">
                Next in development: Free-form multi-dimensional query builder supporting dimension selection (Operator, Station, Time, Service Type), pivoting, slice-and-dice, and aggregate measures.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <div className="grid sm:grid-cols-3 gap-3 text-left">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="size-3 text-primary" /> Slice & Dice
                </p>
                <p className="text-xs text-muted-foreground">Filter on arbitrary operator and station combinations.</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Database className="size-3 text-primary" /> Predefined SQL
                </p>
                <p className="text-xs text-muted-foreground">Powered by indexed PostgreSQL views and star-schema queries.</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <PanelsTopLeft className="size-3 text-primary" /> Dynamic Pivots
                </p>
                <p className="text-xs text-muted-foreground">Cross-tabulate measures across rows and columns.</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.("overview")}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="size-3.5" />
                Back to Overview
              </Button>
              <Button
                size="sm"
                onClick={() => onNavigate?.("time-trend")}
                className="gap-1.5 text-xs bg-primary text-primary-foreground"
              >
                Explore Time & Trend Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

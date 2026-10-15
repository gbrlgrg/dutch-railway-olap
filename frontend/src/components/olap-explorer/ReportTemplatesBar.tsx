import { Bookmark, Sparkles } from "lucide-react";

import { PREDEFINED_TEMPLATES } from "@/data/olapExplorerMockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportTemplatesBarProps = {
  activeTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
};

export function ReportTemplatesBar({ activeTemplateId, onSelectTemplate }: ReportTemplatesBarProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Bookmark className="size-3.5" aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Report Templates (Including Operator & Station Analysis)
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal hidden sm:inline-flex">
          One-click OLAP configurations
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 pt-1">
        {PREDEFINED_TEMPLATES.map((tmpl) => {
          const isActive = tmpl.id === activeTemplateId;
          return (
            <Button
              key={tmpl.id}
              type="button"
              variant="outline"
              onClick={() => onSelectTemplate(tmpl.id)}
              className={cn(
                "h-auto flex-col items-start gap-1 p-3 text-left transition-all relative overflow-hidden",
                isActive
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                  : "hover:border-border hover:bg-muted/50",
              )}
            >
              <div className="flex w-full items-center justify-between gap-1">
                <span className="text-xs font-semibold leading-tight">{tmpl.title}</span>
                {isActive && (
                  <Sparkles className="size-3 text-primary shrink-0" aria-hidden="true" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                {tmpl.description}
              </p>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

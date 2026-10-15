import { cn } from "@/lib/utils";
import type { Granularity } from "@/types/overview";

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

type GranularityToggleProps = {
  value: Granularity;
  onChange: (value: Granularity) => void;
};

/** Compact segmented control for chart time granularity. */
export function GranularityToggle({ value, onChange }: GranularityToggleProps) {
  return (
    <div role="group" aria-label="Chart granularity" className="inline-flex rounded-lg border bg-muted p-0.5">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

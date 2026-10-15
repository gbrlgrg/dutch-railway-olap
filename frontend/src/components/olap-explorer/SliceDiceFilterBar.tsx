import { Filter, RotateCcw } from "lucide-react";

import {
  OLAP_OPERATORS,
  OLAP_SERVICE_TYPES,
  OLAP_STATIONS,
  OLAP_YEARS,
} from "@/data/olapExplorerMockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OlapFilterState, OlapOperationBadgeType } from "@/types/olapExplorer";

type SliceDiceFilterBarProps = {
  activeBadges: OlapOperationBadgeType[];
  filters: OlapFilterState;
  onFilterChange: (dimension: keyof OlapFilterState, values: string[]) => void;
  onClearFilters: () => void;
};

export function SliceDiceFilterBar({
  activeBadges,
  filters,
  onFilterChange,
  onClearFilters,
}: SliceDiceFilterBarProps) {
  const hasActiveFilters =
    filters.years.length > 0 ||
    filters.quarters.length > 0 ||
    filters.months.length > 0 ||
    filters.operators.length > 0 ||
    filters.stations.length > 0 ||
    filters.serviceTypes.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs">
      {/* Active OLAP Operations Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Filter className="size-3 text-muted-foreground" aria-hidden="true" />
            Active OLAP Operations:
          </span>
          {activeBadges.length === 0 ? (
            <Badge variant="outline" className="text-[11px] text-muted-foreground font-normal">
              Full Cube (No Slices or Dices Applied)
            </Badge>
          ) : (
            activeBadges.map((badge) => {
              const colorClass =
                badge.type === "SLICE"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : badge.type === "DICE"
                  ? "border-blue-300 bg-blue-50 text-blue-800"
                  : "border-purple-300 bg-purple-50 text-purple-800";

              return (
                <Badge
                  key={badge.label}
                  variant="outline"
                  className={`text-[11px] font-semibold gap-1.5 py-0.5 ${colorClass}`}
                  title={badge.description}
                >
                  <span className="font-bold">{badge.type}:</span>
                  <span className="font-normal">{badge.label.replace(/^[^:]+:\s*/, "")}</span>
                </Badge>
              );
            })
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>Clear Filters</span>
          </Button>
        )}
      </div>

      {/* Slice & Dice Controls */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
        {/* Year Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Filter Year (Slice):</label>
          <Select
            value={filters.years[0] ?? "all"}
            onValueChange={(val) => onFilterChange("years", !val || val === "all" ? [] : [val])}
            items={[{ value: "all", label: "All Years" }, ...OLAP_YEARS.map((y) => ({ value: y, label: y }))]}
          >
            <SelectTrigger className="w-full bg-card h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Years</SelectItem>
              {OLAP_YEARS.map((y) => (
                <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Operator Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Filter Operator:</label>
          <Select
            value={filters.operators[0] ?? "all"}
            onValueChange={(val) => onFilterChange("operators", !val || val === "all" ? [] : [val])}
            items={[{ value: "all", label: "All Operators" }, ...OLAP_OPERATORS.map((o) => ({ value: o, label: o }))]}
          >
            <SelectTrigger className="w-full bg-card h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Operators</SelectItem>
              {OLAP_OPERATORS.map((o) => (
                <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Station Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Filter Station:</label>
          <Select
            value={filters.stations[0] ?? "all"}
            onValueChange={(val) => onFilterChange("stations", !val || val === "all" ? [] : [val])}
            items={[{ value: "all", label: "All Stations" }, ...OLAP_STATIONS.map((s) => ({ value: s, label: s }))]}
          >
            <SelectTrigger className="w-full bg-card h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Stations</SelectItem>
              {OLAP_STATIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service Type Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Filter Service Type:</label>
          <Select
            value={filters.serviceTypes[0] ?? "all"}
            onValueChange={(val) => onFilterChange("serviceTypes", !val || val === "all" ? [] : [val])}
            items={[{ value: "all", label: "All Service Types" }, ...OLAP_SERVICE_TYPES.map((st) => ({ value: st, label: st }))]}
          >
            <SelectTrigger className="w-full bg-card h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Service Types</SelectItem>
              {OLAP_SERVICE_TYPES.map((st) => (
                <SelectItem key={st} value={st} className="text-xs">{st}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

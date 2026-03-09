import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export interface SortOption {
  value: string;
  label: string;
}

interface SortState {
  key: string;
  dir: "asc" | "desc";
}

export function usePersistentSort(storageKey: string, defaultKey: string, defaultDir: "asc" | "desc" = "asc") {
  const [sort, setSort] = useState<SortState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { key: defaultKey, dir: defaultDir };
  });

  const update = useCallback((key: string, dir?: "asc" | "desc") => {
    setSort((prev) => {
      const newDir = dir ?? (prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc");
      const next = { key, dir: newDir };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  return { sortKey: sort.key, sortDir: sort.dir, setSort: update };
}

export function applySorting<T>(items: T[], key: string, dir: "asc" | "desc", accessor?: (item: T, key: string) => any): T[] {
  return [...items].sort((a, b) => {
    const valA = accessor ? accessor(a, key) : (a as any)[key] ?? "";
    const valB = accessor ? accessor(b, key) : (b as any)[key] ?? "";
    let cmp: number;
    if (typeof valA === "number" && typeof valB === "number") {
      cmp = valA - valB;
    } else {
      cmp = String(valA).localeCompare(String(valB));
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

interface SortDropdownProps {
  options: SortOption[];
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string, dir?: "asc" | "desc") => void;
}

export function SortDropdown({ options, sortKey, sortDir, onSort }: SortDropdownProps) {
  const currentLabel = options.find((o) => o.value === sortKey)?.label || "Classificar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{currentLabel}</span>
          {sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3 opacity-60" />
          ) : (
            <ArrowDown className="h-3 w-3 opacity-60" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Classificar por</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => onSort(v)}>
          {options.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-sm">
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={sortDir} onValueChange={(v) => onSort(sortKey, v as "asc" | "desc")}>
          <DropdownMenuRadioItem value="asc" className="text-sm">A → Z / Mais antigos</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc" className="text-sm">Z → A / Mais recentes</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

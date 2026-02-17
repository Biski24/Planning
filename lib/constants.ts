import { ShiftCategory } from "@/lib/types";

export const CATEGORY_META: Record<
  ShiftCategory,
  { label: string; className: string }
> = {
  VISIT: { label: "Visites", className: "bg-green-500/20 text-green-200 border-green-400/50" },
  CALL: { label: "Téléphone", className: "bg-blue-500/20 text-blue-200 border-blue-400/50" },
  LEAD: { label: "Leads", className: "bg-amber-500/20 text-amber-200 border-amber-400/50" },
  ADMIN: { label: "Administratif", className: "bg-slate-500/20 text-slate-200 border-slate-400/50" },
  ABS: { label: "Absence", className: "bg-red-500/20 text-red-200 border-red-400/50" },
  WFH: { label: "Télétravail", className: "bg-violet-500/20 text-violet-200 border-violet-400/50" },
};

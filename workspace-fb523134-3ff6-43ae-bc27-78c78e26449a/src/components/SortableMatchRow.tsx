"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NAPE_LABEL, type Match } from "@/lib/types";

interface Props {
  match: Match;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function SortableMatchRow({
  match,
  index,
  total,
  onMoveUp,
  onMoveDown,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: match.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-slate-100 transition-colors ${
        isDragging
          ? "bg-emerald-100 shadow-lg"
          : match.restWarning
          ? "bg-amber-50/70 hover:bg-amber-100/70"
          : "bg-white hover:bg-emerald-50/60"
      }`}
    >
      <td className="px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium tabular-nums">
        <span className="text-emerald-900">{match.startTime}</span>
        <span className="text-muted-foreground mx-1">→</span>
        <span className="text-emerald-900">{match.endTime}</span>
      </td>
      <td className="px-3 py-2.5 text-sm text-slate-700">{match.categoryName}</td>
      <td className="px-3 py-2.5 text-sm">
        <Badge
          variant="outline"
          className={
            match.naipe === "M"
              ? "border-sky-300 bg-sky-50 text-sky-800"
              : "border-pink-300 bg-pink-50 text-pink-800"
          }
        >
          {NAPE_LABEL[match.naipe]}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-sm text-slate-700">{match.modality}</td>
      <td className="px-3 py-2.5 text-sm font-medium text-slate-900">
        {match.teamA}
        <span className="text-muted-foreground mx-2 text-xs">×</span>
        {match.teamB}
      </td>
      <td className="px-3 py-2.5 text-center">
        {match.restWarning ? (
          <Badge
            variant="outline"
            className="border-amber-400 bg-amber-100 text-amber-900 font-medium"
            title={`Apenas ${match.restGap} jogo(s) de intervalo — ideal é ≥ 2`}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            {match.restGap} jogo(s)
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-800"
          >
            OK
          </Badge>
        )}
      </td>
      <td className="px-2 py-2.5 text-right">
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            disabled={isFirst}
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-emerald-100 hover:text-emerald-800 disabled:opacity-30"
            aria-label="Mover para cima"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            disabled={isLast}
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-emerald-100 hover:text-emerald-800 disabled:opacity-30"
            aria-label="Mover para baixo"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="h-7 w-7 inline-flex items-center justify-center rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:bg-emerald-100 hover:text-emerald-800 touch-none"
            aria-label="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

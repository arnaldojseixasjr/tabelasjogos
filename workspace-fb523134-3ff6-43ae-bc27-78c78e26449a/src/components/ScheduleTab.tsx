"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CalendarX,
  ClipboardList,
  FileDown,
  FileSpreadsheet,
  RefreshCw,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortableMatchRow } from "./SortableMatchRow";
import { generateSchedule, recalcDay, REST_IDEAL_GAP } from "@/lib/scheduler";
import { formatDateBR } from "@/lib/time-utils";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/exporters";
import type { EventDay, Match, ScheduleState } from "@/lib/types";

interface Props {
  state: ScheduleState;
  setState: (updater: (prev: ScheduleState) => ScheduleState) => void;
}

export function ScheduleTab({ state, setState }: Props) {
  const { config, days, categories, matches } = state;
  const [generating, setGenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Agrupa por dia para renderização
  const groups = useMemo(
    () =>
      days.map((day) => ({
        day,
        matches: matches.filter((m) => m.dayId === day.id),
      })),
    [days, matches]
  );

  const totalWarnings = matches.filter((m) => m.restWarning).length;

  const handleGenerate = () => {
    setGenerating(true);
    // Pequeno timeout para permitir feedback visual (spinner)
    setTimeout(() => {
      try {
        const report = generateSchedule(config, days, categories);
        setState((prev) => ({ ...prev, matches: report.matches }));
        if (report.unallocatedCount > 0) {
          console.warn(
            `[Scheduler] ${report.unallocatedCount} jogo(s) não alocado(s) por falta de tempo nos turnos.`
          );
        }
      } finally {
        setGenerating(false);
      }
    }, 80);
  };

  const handleDragEnd = (dayId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setState((prev) => {
      // Pega apenas os jogos do dia na ordem atual
      const dayMatches = prev.matches.filter((m) => m.dayId === dayId);
      const otherMatches = prev.matches.filter((m) => m.dayId !== dayId);

      const oldIndex = dayMatches.findIndex((m) => m.id === active.id);
      const newIndex = dayMatches.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(dayMatches, oldIndex, newIndex);

      // Reagrupa mantendo a ordem dos dias e a posição relativa do bloco do dia
      const newMatches: Match[] = [];
      let inserted = false;
      for (const d of prev.days) {
        if (d.id === dayId) {
          newMatches.push(...reordered);
          inserted = true;
        } else {
          newMatches.push(...prev.matches.filter((m) => m.dayId === d.id));
        }
      }
      if (!inserted) {
        newMatches.push(...reordered);
      }
      void otherMatches; // apenas para clareza — não usado pois reagrupamos por dia

      // Recalcula horários do dia inteiro
      const recalculated = recalcDay(
        dayId,
        newMatches,
        prev.days,
        prev.config.transitionMinutes
      );
      return { ...prev, matches: recalculated };
    });
  };

  const handleMoveRow = (
    dayId: string,
    matchId: string,
    direction: "up" | "down"
  ) => {
    setState((prev) => {
      const dayMatches = prev.matches.filter((m) => m.dayId === dayId);
      const idx = dayMatches.findIndex((m) => m.id === matchId);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= dayMatches.length) return prev;

      const reordered = arrayMove(dayMatches, idx, newIdx);
      const newMatches: Match[] = [];
      let inserted = false;
      for (const d of prev.days) {
        if (d.id === dayId) {
          newMatches.push(...reordered);
          inserted = true;
        } else {
          newMatches.push(...prev.matches.filter((m) => m.dayId === d.id));
        }
      }
      if (!inserted) newMatches.push(...reordered);

      const recalculated = recalcDay(
        dayId,
        newMatches,
        prev.days,
        prev.config.transitionMinutes
      );
      return { ...prev, matches: recalculated };
    });
  };

  const canGenerate =
    days.length > 0 &&
    categories.length > 0 &&
    categories.every(
      (c) =>
        c.teams.length >= 2 &&
        c.modalities.length > 0 &&
        c.naipes.length > 0
    );

  return (
    <Card className="border-emerald-100 shadow-sm">
      <CardHeader className="bg-emerald-50/60 rounded-t-lg flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <TableIcon className="h-5 w-5" />
          Grade de Jogos
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="bg-emerald-700 hover:bg-emerald-800"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {matches.length > 0 ? "Regenerar Tabela" : "Gerar Tabela"}
          </Button>

          <Button
            variant="outline"
            disabled={matches.length === 0}
            onClick={() => exportToPDF({ state })}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={matches.length === 0}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel / CSV
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToExcel({ state })}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-700" />
                Exportar .xlsx
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV({ state })}>
                <FileDown className="h-4 w-4 mr-2 text-emerald-700" />
                Exportar .csv
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Alertas e estatísticas */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-800"
          >
            {matches.length} jogo(s) agendado(s)
          </Badge>
          {totalWarnings > 0 && (
            <Badge
              variant="outline"
              className="border-amber-400 bg-amber-100 text-amber-900"
            >
              {totalWarnings} com alerta de descanso (&lt; {REST_IDEAL_GAP} jogos)
            </Badge>
          )}
          <span className="text-muted-foreground">
            Arraste as linhas (ou use as setas ↑↓) para reordenar manualmente.
            Os horários são recalculados em tempo real.
          </span>
        </div>

        {!canGenerate && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <ClipboardList className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Para gerar a grade:</strong> cadastre ao menos um dia com
                turno(s), ao menos uma categoria com 2+ equipes, modalidades e
                naipes nas abas anteriores.
              </div>
            </div>
          </div>
        )}

        {generating && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <p className="text-xs text-muted-foreground text-center">
              Processando confrontos e alocando na quadra…
            </p>
          </div>
        )}

        {!generating && matches.length === 0 && canGenerate && (
          <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/40 p-10 text-center">
            <TableIcon className="h-10 w-10 mx-auto text-emerald-400 mb-2" />
            <p className="text-sm text-muted-foreground">
              Tudo pronto para gerar a grade. Clique em <strong>Gerar Tabela</strong>.
            </p>
          </div>
        )}

        {!generating && matches.length === 0 && !canGenerate && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-10 text-center">
            <CalendarX className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-muted-foreground">
              Configure dias e categorias nas abas anteriores para liberar a geração.
            </p>
          </div>
        )}

        {!generating &&
          matches.length > 0 &&
          groups.map(({ day, matches: dayMatches }) => (
            <DayBlock
              key={day.id}
              day={day}
              matches={dayMatches}
              sensors={sensors}
              onDragEnd={(e) => handleDragEnd(day.id, e)}
              onMoveRow={(matchId, dir) => handleMoveRow(day.id, matchId, dir)}
            />
          ))}
      </CardContent>
    </Card>
  );
}

interface DayBlockProps {
  day: EventDay;
  matches: Match[];
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  onMoveRow: (matchId: string, dir: "up" | "down") => void;
}

function DayBlock({
  day,
  matches,
  sensors,
  onDragEnd,
  onMoveRow,
}: DayBlockProps) {
  if (matches.length === 0) return null;

  const dayWarnings = matches.filter((m) => m.restWarning).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">
            {day.label}
            {day.date && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {formatDateBR(day.date)}
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {day.shifts.map((s) => `${s.name} ${s.startTime}-${s.endTime}`).join("  •  ")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            {matches.length} jogos
          </Badge>
          {dayWarnings > 0 && (
            <Badge
              variant="outline"
              className="border-amber-400 bg-amber-100 text-amber-900"
            >
              {dayWarnings} alerta(s)
            </Badge>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={matches.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-50/40 hover:bg-emerald-50/40">
                  <TableHead className="w-10 text-center text-xs">#</TableHead>
                  <TableHead className="text-xs">Horário</TableHead>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-xs">Naipe</TableHead>
                  <TableHead className="text-xs">Modalidade</TableHead>
                  <TableHead className="text-xs">Confronto</TableHead>
                  <TableHead className="text-center text-xs">Descanso</TableHead>
                  <TableHead className="text-right text-xs w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m, idx) => (
                  <SortableMatchRow
                    key={m.id}
                    match={m}
                    index={idx}
                    total={matches.length}
                    onMoveUp={() => onMoveRow(m.id, "up")}
                    onMoveDown={() => onMoveRow(m.id, "down")}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </DndContext>

      {/* Linha de totalização */}
      <div className="bg-emerald-50/40 px-4 py-2 border-t border-slate-200 text-xs text-muted-foreground">
        Início do dia: <strong className="text-emerald-900">{matches[0]?.startTime}</strong>
        {" — "}Fim do dia:{" "}
        <strong className="text-emerald-900">{matches[matches.length - 1]?.endTime}</strong>
      </div>
    </div>
  );
}

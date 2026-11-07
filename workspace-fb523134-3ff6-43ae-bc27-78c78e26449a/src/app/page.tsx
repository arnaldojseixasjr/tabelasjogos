"use client";

import { useState } from "react";
import {
  CalendarDays,
  Settings2,
  Trophy,
  CalendarClock,
  CalendarX,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ConfigTab } from "@/components/ConfigTab";
import { DaysTab } from "@/components/DaysTab";
import { CategoriesTab } from "@/components/CategoriesTab";
import { ScheduleTab } from "@/components/ScheduleTab";
import { useScheduleStore } from "@/lib/useScheduleStore";
import type { Category, EventConfig, EventDay } from "@/lib/types";

export default function Home() {
  const { state, setState, reset } = useScheduleStore();
  const [tab, setTab] = useState<string>("config");

  const updateConfig = (next: EventConfig) =>
    setState((prev) => ({ ...prev, config: next }));
  const updateDays = (next: EventDay[]) =>
    setState((prev) => ({ ...prev, days: next }));
  const updateCategories = (next: Category[]) =>
    setState((prev) => ({ ...prev, categories: next }));

  // Indicadores de progresso nas abas
  const stepStatus = (ok: boolean, fallback?: boolean) =>
    ok ? "ok" : fallback ? "warn" : "todo";

  const configStatus = stepStatus(
    Boolean(state.config.institutionName && state.config.eventName),
    Boolean(state.config.institutionName || state.config.eventName)
  );
  const daysStatus = stepStatus(state.days.length > 0);
  const catStatus = stepStatus(
    state.categories.length > 0 &&
      state.categories.every(
        (c) =>
          c.teams.length >= 2 &&
          c.modalities.length > 0 &&
          c.naipes.length > 0
      ),
    state.categories.length > 0
  );
  const schedStatus = stepStatus(state.matches.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/30 via-white to-white">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-emerald-900 leading-tight">
                {state.config.eventName ||
                  "Organizador de Campeonatos Escolares"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {state.config.institutionName || "Configure sua instituição"}
                {state.config.institutionName && " • "}
                {state.matches.length > 0 && `${state.matches.length} jogos agendados`}
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Resetar</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar todos os dados?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação apaga permanentemente instituição, dias, categorias
                  e a grade de jogos atual. Não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={reset}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Resetar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-emerald-50/60 border border-emerald-100 p-1 flex flex-wrap h-auto gap-1">
            <TabsTrigger
              value="config"
              className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white flex items-center gap-2"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Configuração</span>
              <StepDot status={configStatus} />
            </TabsTrigger>
            <TabsTrigger
              value="days"
              className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white flex items-center gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Dias &amp; Turnos</span>
              <StepDot status={daysStatus} />
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Categorias</span>
              <StepDot status={catStatus} />
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white flex items-center gap-2"
            >
              <CalendarClock className="h-4 w-4" />
              <span className="hidden sm:inline">Grade de Jogos</span>
              <StepDot status={schedStatus} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-6">
            <ConfigTab config={state.config} onChange={updateConfig} />
            <NextStepButton
              onClick={() => setTab("days")}
              label="Avançar para Dias & Turnos"
            />
          </TabsContent>

          <TabsContent value="days" className="mt-6">
            <DaysTab days={state.days} onChange={updateDays} />
            <NextStepButton
              onClick={() => setTab("categories")}
              label="Avançar para Categorias"
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <CategoriesTab
              categories={state.categories}
              onChange={updateCategories}
            />
            <NextStepButton
              onClick={() => setTab("schedule")}
              label="Avançar para Grade de Jogos"
            />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <ScheduleTab state={state} setState={setState} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Rodapé */}
      <footer className="mt-auto bg-white border-t border-emerald-100 py-4">
        <div className="max-w-7xl mx-auto px-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>
            Dados salvos automaticamente no navegador (localStorage).
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Feito para professores e coordenadores escolares
          </span>
        </div>
      </footer>
    </div>
  );
}

function StepDot({ status }: { status: "ok" | "warn" | "todo" }) {
  const colors = {
    ok: "bg-emerald-500",
    warn: "bg-amber-400",
    todo: "bg-slate-300",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[status]} ml-1`}
      aria-hidden
    />
  );
}

function NextStepButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="mt-4 flex justify-end">
      <Button
        onClick={onClick}
        className="bg-emerald-700 hover:bg-emerald-800"
      >
        {label}
        <CalendarX className="ml-2 h-4 w-4 rotate-90" />
      </Button>
    </div>
  );
}

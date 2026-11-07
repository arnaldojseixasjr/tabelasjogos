"use client";

import { Building2, CalendarClock, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventConfig } from "@/lib/types";

interface Props {
  config: EventConfig;
  onChange: (next: EventConfig) => void;
}

export function ConfigTab({ config, onChange }: Props) {
  return (
    <Card className="border-emerald-100 shadow-sm">
      <CardHeader className="bg-emerald-50/60 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <Settings2 className="h-5 w-5" />
          Configuração Inicial do Evento
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="institution" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-700" />
            Instituição / Organizadora
          </Label>
          <Input
            id="institution"
            placeholder="Ex.: Colégio Estadual Dom Pedro II"
            value={config.institutionName}
            onChange={(e) =>
              onChange({ ...config, institutionName: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            Aparece no cabeçalho da grade de jogos e dos arquivos exportados.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventName" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-emerald-700" />
            Nome do Evento Esportivo
          </Label>
          <Input
            id="eventName"
            placeholder="Ex.: JIF - Jogos Interclasses 2026"
            value={config.eventName}
            onChange={(e) => onChange({ ...config, eventName: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Título do campeonato exibido em todos os documentos.
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="transition" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-emerald-700" />
            Tempo padrão de transição entre jogos (minutos)
          </Label>
          <Input
            id="transition"
            type="number"
            min={0}
            max={60}
            value={config.transitionMinutes}
            onChange={(e) =>
              onChange({
                ...config,
                transitionMinutes: Math.max(
                  0,
                  parseInt(e.target.value || "0", 10) || 0
                ),
              })
            }
            className="max-w-[180px]"
          />
          <p className="text-xs text-muted-foreground">
            Tempo de folga entre o término de um jogo e o início do próximo,
            usado para troca de equipes e aquecimento rápido.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

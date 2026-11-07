"use client";

import { CalendarDays, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { todayISO, uid } from "@/lib/time-utils";
import type { EventDay, Shift } from "@/lib/types";

interface Props {
  days: EventDay[];
  onChange: (days: EventDay[]) => void;
}

export function DaysTab({ days, onChange }: Props) {
  const addDay = () => {
    const dayNumber = days.length + 1;
    onChange([
      ...days,
      {
        id: uid("day"),
        date: todayISO(),
        label: `Dia ${dayNumber}`,
        shifts: [
          {
            id: uid("shift"),
            name: "Manhã",
            startTime: "08:00",
            endTime: "12:00",
          },
        ],
      },
    ]);
  };

  const updateDay = (id: string, patch: Partial<EventDay>) => {
    onChange(days.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDay = (id: string) => {
    onChange(days.filter((d) => d.id !== id));
  };

  const addShift = (dayId: string) => {
    onChange(
      days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              shifts: [
                ...d.shifts,
                {
                  id: uid("shift"),
                  name: d.shifts.length === 0 ? "Manhã" : "Tarde",
                  startTime: d.shifts.length === 0 ? "08:00" : "13:30",
                  endTime: d.shifts.length === 0 ? "12:00" : "17:30",
                },
              ],
            }
          : d
      )
    );
  };

  const updateShift = (dayId: string, shiftId: string, patch: Partial<Shift>) => {
    onChange(
      days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              shifts: d.shifts.map((s) =>
                s.id === shiftId ? { ...s, ...patch } : s
              ),
            }
          : d
      )
    );
  };

  const removeShift = (dayId: string, shiftId: string) => {
    onChange(
      days.map((d) =>
        d.id === dayId
          ? { ...d, shifts: d.shifts.filter((s) => s.id !== shiftId) }
          : d
      )
    );
  };

  return (
    <Card className="border-emerald-100 shadow-sm">
      <CardHeader className="bg-emerald-50/60 rounded-t-lg flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <CalendarDays className="h-5 w-5" />
          Dias e Turnos do Evento
        </CardTitle>
        <Button onClick={addDay} size="sm" className="bg-emerald-700 hover:bg-emerald-800">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Dia
        </Button>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        {days.length === 0 && (
          <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center text-sm text-muted-foreground">
            Nenhum dia cadastrado. Clique em <strong>Adicionar Dia</strong> para começar.
            Você poderá cadastrar turnos (manhã, tarde) e o sistema bloqueará
            automaticamente o intervalo entre eles (ex.: almoço).
          </div>
        )}

        {days.map((day) => (
          <div
            key={day.id}
            className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-end flex-1">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Identificação do dia
                  </Label>
                  <Input
                    placeholder="Ex.: Dia 1, Sábado, Abertura"
                    value={day.label}
                    onChange={(e) =>
                      updateDay(day.id, { label: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Data
                  </Label>
                  <Input
                    type="date"
                    value={day.date}
                    onChange={(e) =>
                      updateDay(day.id, { date: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeDay(day.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remover dia
              </Button>
            </div>

            <Separator className="my-4 bg-emerald-100" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                  <Clock className="h-4 w-4" />
                  Turnos do dia
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addShift(day.id)}
                  className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar Turno
                </Button>
              </div>

              {day.shifts.length === 0 && (
                <p className="text-xs text-muted-foreground pl-1">
                  Adicione ao menos um turno para liberar a alocação de jogos.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {day.shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-md border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                  >
                    <Input
                      placeholder="Nome do turno"
                      value={shift.name}
                      onChange={(e) =>
                        updateShift(day.id, shift.id, { name: e.target.value })
                      }
                      className="bg-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Início</Label>
                        <Input
                          type="time"
                          value={shift.startTime}
                          onChange={(e) =>
                            updateShift(day.id, shift.id, {
                              startTime: e.target.value,
                            })
                          }
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Fim</Label>
                        <Input
                          type="time"
                          value={shift.endTime}
                          onChange={(e) =>
                            updateShift(day.id, shift.id, {
                              endTime: e.target.value,
                            })
                          }
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeShift(day.id, shift.id)}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remover turno
                    </Button>
                  </div>
                ))}
              </div>

              {day.shifts.length >= 2 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  ⓘ O intervalo entre turnos (ex.: almoço) é automaticamente
                  bloqueado — nenhum jogo será alocado nesse período.
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

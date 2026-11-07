"use client";

import {
  Plus,
  Trash2,
  Users,
  Trophy,
  Dumbbell,
  ToggleLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { uid } from "@/lib/time-utils";
import type { Category, Naipe, Team, Modality } from "@/lib/types";

interface Props {
  categories: Category[];
  onChange: (categories: Category[]) => void;
}

export function CategoriesTab({ categories, onChange }: Props) {
  const addCategory = () => {
    onChange([
      ...categories,
      {
        id: uid("cat"),
        name: `Categoria ${categories.length + 1}`,
        matchDurationMinutes: 30,
        modalities: [{ id: uid("mod"), name: "Futsal" }],
        naipes: ["M", "F"],
        teams: [
          { id: uid("team"), name: "Equipe 1" },
          { id: uid("team"), name: "Equipe 2" },
        ],
      },
    ]);
  };

  const updateCategory = (id: string, patch: Partial<Category>) => {
    onChange(categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCategory = (id: string) => {
    onChange(categories.filter((c) => c.id !== id));
  };

  return (
    <Card className="border-emerald-100 shadow-sm">
      <CardHeader className="bg-emerald-50/60 rounded-t-lg flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <Trophy className="h-5 w-5" />
          Categorias, Modalidades e Turmas
        </CardTitle>
        <Button onClick={addCategory} size="sm" className="bg-emerald-700 hover:bg-emerald-800">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Categoria
        </Button>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        {categories.length === 0 && (
          <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center text-sm text-muted-foreground">
            Nenhuma categoria cadastrada. Cada categoria agrupa modalidades,
            naipes (M/F) e as turmas/equipes que disputarão os jogos.
          </div>
        )}

        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            onChange={(patch) => updateCategory(cat.id, patch)}
            onRemove={() => removeCategory(cat.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface CategoryCardProps {
  category: Category;
  onChange: (patch: Partial<Category>) => void;
  onRemove: () => void;
}

function CategoryCard({ category, onChange, onRemove }: CategoryCardProps) {
  const addTeam = () => {
    onChange({
      teams: [
        ...category.teams,
        { id: uid("team"), name: `Equipe ${category.teams.length + 1}` },
      ],
    });
  };

  const updateTeam = (id: string, name: string) => {
    onChange({
      teams: category.teams.map((t) => (t.id === id ? { ...t, name } : t)),
    });
  };

  const removeTeam = (id: string) => {
    onChange({ teams: category.teams.filter((t) => t.id !== id) });
  };

  const addModality = () => {
    onChange({
      modalities: [
        ...category.modalities,
        { id: uid("mod"), name: "Nova Modalidade" },
      ],
    });
  };

  const updateModality = (id: string, name: string) => {
    onChange({
      modalities: category.modalities.map((m) =>
        m.id === id ? { ...m, name } : m
      ),
    });
  };

  const removeModality = (id: string) => {
    onChange({
      modalities: category.modalities.filter((m) => m.id !== id),
    });
  };

  const toggleNaipe = (naipe: Naipe) => {
    const has = category.naipes.includes(naipe);
    const next = has
      ? category.naipes.filter((n) => n !== naipe)
      : [...category.naipes, naipe];
    onChange({ naipes: next });
  };

  // Pré-visualização do total de confrontos que serão gerados
  const teamCount = category.teams.length;
  const matchesPerGroup =
    teamCount >= 2 ? (teamCount * (teamCount - 1)) / 2 : 0;
  const totalPreview =
    matchesPerGroup *
    category.modalities.length *
    Math.max(1, category.naipes.length);

  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 md:grid-cols-[1fr_140px] md:items-end flex-1">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Nome da categoria
            </Label>
            <Input
              placeholder="Ex.: Sub-14, Ensino Médio"
              value={category.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Duração (min)
            </Label>
            <Input
              type="number"
              min={5}
              max={120}
              value={category.matchDurationMinutes}
              onChange={(e) =>
                onChange({
                  matchDurationMinutes: Math.max(
                    5,
                    parseInt(e.target.value || "30", 10) || 30
                  ),
                })
              }
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remover categoria
        </Button>
      </div>

      <Separator className="my-4 bg-emerald-100" />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Naipes */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <ToggleLeft className="h-4 w-4" />
            Naipes
          </Label>
          <div className="flex gap-2">
            <NaipeButton
              label="Masculino"
              active={category.naipes.includes("M")}
              onClick={() => toggleNaipe("M")}
            />
            <NaipeButton
              label="Feminino"
              active={category.naipes.includes("F")}
              onClick={() => toggleNaipe("F")}
            />
          </div>
          {category.naipes.length === 0 && (
            <p className="text-xs text-red-600">Selecione ao menos um naipe.</p>
          )}
        </div>

        {/* Modalidades */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <Dumbbell className="h-4 w-4" />
            Modalidades
          </Label>
          <div className="space-y-2">
            {category.modalities.map((m) => (
              <ModalityRow
                key={m.id}
                modality={m}
                onChange={(name) => updateModality(m.id, name)}
                onRemove={() => removeModality(m.id)}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addModality}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar modalidade
          </Button>
        </div>

        {/* Equipes */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <Users className="h-4 w-4" />
            Equipes / Turmas ({teamCount})
          </Label>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {category.teams.map((t) => (
              <TeamRow
                key={t.id}
                team={t}
                onChange={(name) => updateTeam(t.id, name)}
                onRemove={() => removeTeam(t.id)}
                canRemove={category.teams.length > 2}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addTeam}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar equipe
          </Button>
        </div>
      </div>

      <Separator className="my-4 bg-emerald-100" />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge
          variant="secondary"
          className="bg-emerald-100 text-emerald-900 border border-emerald-200"
        >
          {teamCount} equipes
        </Badge>
        <Badge
          variant="secondary"
          className="bg-emerald-100 text-emerald-900 border border-emerald-200"
        >
          {category.modalities.length} modalidades
        </Badge>
        <Badge
          variant="secondary"
          className="bg-emerald-100 text-emerald-900 border border-emerald-200"
        >
          {category.naipes.length} naipe(s)
        </Badge>
        <Badge
          variant="outline"
          className="border-amber-300 text-amber-800 bg-amber-50"
        >
          ≈ {totalPreview} confrontos a gerar
        </Badge>
      </div>
    </div>
  );
}

function NaipeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
        active
          ? "bg-emerald-700 text-white border-emerald-700"
          : "bg-white text-muted-foreground border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function ModalityRow({
  modality,
  onChange,
  onRemove,
}: {
  modality: Modality;
  onChange: (name: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={modality.name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: Futsal, Vôlei, Basquete"
        className="bg-white"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-red-600 hover:bg-red-50 px-2"
        aria-label="Remover modalidade"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function TeamRow({
  team,
  onChange,
  onRemove,
  canRemove,
}: {
  team: Team;
  onChange: (name: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={team.name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: 6º A, 7º B, Turma 101"
        className="bg-white"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={!canRemove}
        className="text-red-600 hover:bg-red-50 px-2 disabled:opacity-40"
        aria-label="Remover equipe"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

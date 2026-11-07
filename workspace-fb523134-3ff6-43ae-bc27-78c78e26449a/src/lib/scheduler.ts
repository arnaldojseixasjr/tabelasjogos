// ============================================================================
// Motor de escalonamento (Scheduler)
// Dado o estado (config, dias, categorias), gera a lista de jogos agendados
// respeitando:
//   - Disponibilidade de turnos por dia
//   - Duração por partida + tempo de transição
//   - Heurística de descanso (ideal: >= 2 jogos de intervalo entre jogos
//     consecutivos da mesma equipe)
//   - Mistura livre entre categorias/naipes/modalidades
// ============================================================================

import { generateRoundRobin, type Pairing } from "./roundRobin";
import { minutesToTime, timeToMinutes, uid } from "./time-utils";
import type {
  Category,
  EventDay,
  EventConfig,
  Match,
  Naipe,
} from "./types";

/** Descanso mínimo desejado (em número de jogos entre dois jogos da mesma equipe) */
export const REST_IDEAL_GAP = 2;

/** Combinação (categoria + naipe + modalidade) que gera um grupo de confrontos */
interface Group {
  categoryId: string;
  categoryName: string;
  naipe: Naipe;
  modality: string;
  durationMinutes: number;
  pairings: Pairing[];
}

/** Slot contíguo de tempo disponível dentro de um turno */
interface Slot {
  dayId: string;
  shiftId: string;
  shiftName: string;
  startMin: number; // minutos desde meia-noite
  endMin: number;
}

export interface SchedulerReport {
  matches: Match[];
  /** Quantidade de jogos com alerta de descanso insuficiente */
  warningCount: number;
  /** Quantidade total de jogos que NÃO puderam ser alocados (sobra de tempo) */
  unallocatedCount: number;
  /** Quantidade total gerada (antes da alocação) */
  generatedCount: number;
}

/**
 * Constrói todos os grupos (categoria + naipe + modalidade) com seus
 * respectivos confrontos gerados pelo Round Robin.
 */
function buildGroups(categories: Category[]): Group[] {
  const groups: Group[] = [];
  for (const cat of categories) {
    if (cat.teams.length < 2 || cat.modalities.length === 0) continue;
    for (const naipe of cat.naipes) {
      for (const mod of cat.modalities) {
        const pairings = generateRoundRobin(
          cat.teams.map((t) => t.name)
        );
        if (pairings.length === 0) continue;
        groups.push({
          categoryId: cat.id,
          categoryName: cat.name,
          naipe,
          modality: mod.name,
          durationMinutes: cat.matchDurationMinutes,
          pairings,
        });
      }
    }
  }
  return groups;
}

/** Constrói a lista de slots disponíveis a partir dos dias/turnos */
function buildSlots(days: EventDay[]): Slot[] {
  const slots: Slot[] = [];
  for (const day of days) {
    for (const shift of day.shifts) {
      const start = timeToMinutes(shift.startTime);
      const end = timeToMinutes(shift.endTime);
      if (end > start) {
        slots.push({
          dayId: day.id,
          shiftId: shift.id,
          shiftName: shift.name,
          startMin: start,
          endMin: end,
        });
      }
    }
  }
  // Ordena por dia (na ordem declarada) e por horário de início
  return slots;
}

/**
 * Achata os grupos em uma fila intercalada de partidas, de modo que
 * partidas do mesmo grupo não fiquem consecutivas (mistura livre).
 * Mantém deterministicidade.
 */
function interleavePairings(groups: Group[]): Array<Group & { pairing: Pairing }> {
  const queues = groups.map((g) => ({
    ...g,
    remaining: [...g.pairings],
  }));

  const flat: Array<Group & { pairing: Pairing }> = [];
  // Round-robin entre os grupos para intercalar
  let progress = true;
  while (progress) {
    progress = false;
    for (const q of queues) {
      if (q.remaining.length === 0) continue;
      const next = q.remaining.shift()!;
      flat.push({ ...q, pairing: next });
      progress = true;
    }
  }
  return flat;
}

/**
 * Calcula o "gap" de descanso para uma equipe: quantos jogos se passaram
 * entre o último jogo em que ela participou e o jogo atual no mesmo dia.
 */
function computeRestGap(
  dayMatches: Match[],
  teamName: string,
  currentIndex: number
): number {
  let lastIdx = -1;
  for (let i = 0; i < currentIndex; i++) {
    const m = dayMatches[i];
    if (m.teamA === teamName || m.teamB === teamName) {
      lastIdx = i;
    }
  }
  if (lastIdx === -1) return Number.POSITIVE_INFINITY;
  return currentIndex - lastIdx - 1;
}

/**
 * Tenta encaixar uma partida no slot dado, considerando duração + transição.
 * Retorna o horário de início (min) se couber, ou null caso contrário.
 */
function tryFit(
  slot: Slot,
  cursorMin: number,
  duration: number,
  transition: number
): number | null {
  const start = Math.max(cursorMin, slot.startMin);
  const end = start + duration;
  if (end > slot.endMin) return null;
  void transition; // transição já é aplicada entre jogos pelo cursor do slot
  return start;
}

/**
 * Ponto de entrada do motor de escalonamento.
 * Recebe o estado completo e devolve o relatório com a grade de jogos.
 */
export function generateSchedule(
  config: EventConfig,
  days: EventDay[],
  categories: Category[]
): SchedulerReport {
  const transition = Math.max(0, Math.floor(config.transitionMinutes || 0));
  const groups = buildGroups(categories);
  const slots = buildSlots(days);

  const totalGenerated = groups.reduce(
    (acc, g) => acc + g.pairings.length,
    0
  );

  if (groups.length === 0 || slots.length === 0) {
    return {
      matches: [],
      warningCount: 0,
      unallocatedCount: totalGenerated,
      generatedCount: totalGenerated,
    };
  }

  const flat = interleavePairings(groups);

  // Agrupa slots por dia e ordena por ordem cronológica declarada.
  const slotsByDay = new Map<string, Slot[]>();
  for (const s of slots) {
    const arr = slotsByDay.get(s.dayId) ?? [];
    arr.push(s);
    slotsByDay.set(s.dayId, arr);
  }

  // Estado de cursor por slot (qual o próximo minuto livre)
  const slotCursor = new Map<string, number>();
  for (const s of slots) {
    slotCursor.set(`${s.dayId}__${s.shiftId}`, s.startMin);
  }

  // Distribuição simples: alocamos as partidas em ordem intercalada,
  // percorrendo os dias/slots sequencialmente. Quando um slot se esgota,
  // passamos ao próximo. Quando todos os slots de um dia se esgotam,
  // a partida sobrante é marcada como não alocada.
  const matches: Match[] = [];
  const matchesPerDay = new Map<string, Match[]>();
  let unallocated = 0;

  // Para permitir que uma partida "pule" para o próximo slot quando o
  // descanso não estiver ideal, fazemos uma busca: percorremos os slots
  // em ordem, e para cada slot verificamos se encaixa. Se encaixa e o
  // descanso está OK, alocamos. Se encaixa mas descanso está ruim,
  // lembramos como fallback e seguimos adiante; se nenhum melhor for
  // encontrado, voltamos ao fallback.
  for (const item of flat) {
    const { pairing, durationMinutes, categoryId, categoryName, naipe, modality } =
      item;

    let placed = false;
    let fallback: { slot: Slot; startMin: number } | null = null;

    // Percore os dias na ordem declarada
    for (const day of days) {
      const daySlots = slotsByDay.get(day.id) ?? [];
      const dayMatches = matchesPerDay.get(day.id) ?? [];

      for (const slot of daySlots) {
        const cursor = slotCursor.get(`${slot.dayId}__${slot.shiftId}`)!;
        const startMin = tryFit(slot, cursor, durationMinutes, transition);
        if (startMin === null) continue;

        // Simula a inserção na lista de partidas do dia para medir o gap
        const simIdx = dayMatches.length;
        const gapA = computeRestGap(dayMatches, pairing.teamA, simIdx);
        const gapB = computeRestGap(dayMatches, pairing.teamB, simIdx);
        const gap = Math.min(gapA, gapB);

        if (gap >= REST_IDEAL_GAP || simIdx === 0) {
          // Encaixe ideal — aloca imediatamente
          commitMatch(
            matches,
            matchesPerDay,
            slotCursor,
            slot,
            day,
            startMin,
            durationMinutes,
            transition,
            pairing,
            categoryId,
            categoryName,
            naipe,
            modality,
            gap
          );
          placed = true;
          break;
        } else if (!fallback) {
          // Guarda como fallback — descanso insuficiente, mas cabe no tempo
          fallback = { slot, startMin };
        }
        // Se nem ideal nem primeiro fallback, continua procurando
      }

      if (placed) break;
    }

    if (!placed && fallback) {
      // Usa o fallback — sinaliza alerta de descanso
      const day = days.find((d) => d.id === fallback!.slot.dayId)!;
      const dayMatches = matchesPerDay.get(day.id) ?? [];
      const simIdx = dayMatches.length;
      const gapA = computeRestGap(dayMatches, pairing.teamA, simIdx);
      const gapB = computeRestGap(dayMatches, pairing.teamB, simIdx);
      const gap = Math.min(gapA, gapB);
      commitMatch(
        matches,
        matchesPerDay,
        slotCursor,
        fallback.slot,
        day,
        fallback.startMin,
        durationMinutes,
        transition,
        pairing,
        categoryId,
        categoryName,
        naipe,
        modality,
        gap
      );
      placed = true;
    }

    if (!placed) {
      unallocated += 1;
    }
  }

  const warningCount = matches.filter((m) => m.restWarning).length;

  return {
    matches,
    warningCount,
    unallocatedCount: unallocated,
    generatedCount: totalGenerated,
  };
}

/** Efetiva a alocação de uma partida em um slot */
function commitMatch(
  matches: Match[],
  matchesPerDay: Map<string, Match[]>,
  slotCursor: Map<string, number>,
  slot: Slot,
  day: EventDay,
  startMin: number,
  duration: number,
  transition: number,
  pairing: Pairing,
  categoryId: string,
  categoryName: string,
  naipe: Naipe,
  modality: string,
  gap: number
): void {
  const endMin = startMin + duration;
  const startTime = minutesToTime(startMin);
  const endTime = minutesToTime(endMin);

  const match: Match = {
    id: uid("match"),
    dayId: day.id,
    shiftId: slot.shiftId,
    categoryId,
    categoryName,
    naipe,
    modality,
    teamA: pairing.teamA,
    teamB: pairing.teamB,
    durationMinutes: duration,
    startTime,
    endTime,
    restGap: Number.isFinite(gap) ? gap : 99,
    restWarning: Number.isFinite(gap) ? gap < REST_IDEAL_GAP : false,
  };

  matches.push(match);
  const arr = matchesPerDay.get(day.id) ?? [];
  arr.push(match);
  matchesPerDay.set(day.id, arr);

  // Avança o cursor do slot: partida + transição
  slotCursor.set(
    `${slot.dayId}__${slot.shiftId}`,
    endMin + transition
  );
}

// ----------------------------------------------------------------------------
// Recálculo de horários após reordenação manual (drag-and-drop)
// ----------------------------------------------------------------------------

/**
 * Recalcula os horários de início/término de TODOS os jogos de um dia,
 * mantendo a ordem atual do array dentro do dia.
 * Também recalcula o restGap e o restWarning de cada partida.
 *
 * @param dayId dia a recalcular
 * @param allMatches todos os jogos (será retornado um novo array com os jogos
 *   do dia atualizados)
 * @param days lista de dias (para saber os turnos)
 * @param transitionMinutes tempo de transição entre jogos
 */
export function recalcDay(
  dayId: string,
  allMatches: Match[],
  days: EventDay[],
  transitionMinutes: number
): Match[] {
  const day = days.find((d) => d.id === dayId);
  if (!day) return allMatches;

  // Jogos do dia na ordem atual
  const dayMatches = allMatches
    .filter((m) => m.dayId === dayId)
    .sort((a, b) => {
      // Preserva a ordem do array; como filter preserva ordem de inserção,
      // basta comparar pelo índice original.
      const ia = allMatches.indexOf(a);
      const ib = allMatches.indexOf(b);
      return ia - ib;
    });

  // Cursor por turno
  const cursor = new Map<string, number>();
  for (const s of day.shifts) {
    cursor.set(s.id, timeToMinutes(s.startTime));
  }

  // Mapeamento de turno por id para saber fim
  const shiftById = new Map(day.shifts.map((s) => [s.id, s]));

  // Vamos alocar sequencialmente por turno na ordem declarada,
  // preservando a ordem original dentro do dia (que já foi ajustada pelo
  // drag-and-drop). Como a ordem é controlada externamente, precisamos
  // atribuir horários na ordem em que aparecem no array, respeitando o
  // turno de cada um.
  const updated: Match[] = [];

  for (const m of dayMatches) {
    const shift = shiftById.get(m.shiftId);
    if (!shift) {
      updated.push(m);
      continue;
    }
    const startMin = Math.max(
      cursor.get(shift.id) ?? timeToMinutes(shift.startTime),
      timeToMinutes(shift.startTime)
    );
    const endMin = startMin + m.durationMinutes;
    const startTime = minutesToTime(startMin);
    const endTime = minutesToTime(endMin);

    // Recalcula gap considerando a ordem atual
    const currentIdxInDay = updated.length;
    let lastIdx = -1;
    for (let i = 0; i < currentIdxInDay; i++) {
      const um = updated[i];
      if (um.teamA === m.teamA || um.teamA === m.teamB ||
          um.teamB === m.teamA || um.teamB === m.teamB) {
        lastIdx = i;
      }
    }
    const gap = lastIdx === -1 ? Number.POSITIVE_INFINITY : currentIdxInDay - lastIdx - 1;

    const updatedMatch: Match = {
      ...m,
      startTime,
      endTime,
      restGap: Number.isFinite(gap) ? gap : 99,
      restWarning: Number.isFinite(gap) ? gap < REST_IDEAL_GAP : false,
    };
    updated.push(updatedMatch);
    cursor.set(shift.id, endMin + transitionMinutes);
  }

  // Substitui os jogos do dia no array global preservando ordem dos outros
  const result: Match[] = [];
  let dayPushed = false;
  for (const m of allMatches) {
    if (m.dayId === dayId) {
      if (!dayPushed) {
        result.push(...updated);
        dayPushed = true;
      }
      // skip — já inseridos
    } else {
      result.push(m);
    }
  }
  if (!dayPushed) {
    result.push(...updated);
  }
  return result;
}

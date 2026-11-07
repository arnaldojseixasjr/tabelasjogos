// ============================================================================
// Tipos de domínio do sistema de organização de campeonatos escolares
// ============================================================================

export type Naipe = "M" | "F";

export const NAPE_LABEL: Record<Naipe, string> = {
  M: "Masculino",
  F: "Feminino",
};

/** Configuração geral do evento esportivo */
export interface EventConfig {
  institutionName: string;
  eventName: string;
  /** Tempo padrão de transição entre jogos, em minutos */
  transitionMinutes: number;
}

/** Um turno dentro de um dia (ex.: Manhã, Tarde) */
export interface Shift {
  id: string;
  name: string;
  startTime: string; // formato "HH:MM"
  endTime: string; // formato "HH:MM"
}

/** Um dia de evento, com um ou mais turnos */
export interface EventDay {
  id: string;
  date: string; // ISO yyyy-mm-dd
  label: string; // ex.: "Dia 1"
  shifts: Shift[];
}

/** Equipe/turma participante dentro de uma categoria */
export interface Team {
  id: string;
  name: string;
}

/** Modalidade disputada (ex.: Futsal, Vôlei) */
export interface Modality {
  id: string;
  name: string;
}

/** Categoria esportiva (ex.: Sub-14, Ensino Médio) */
export interface Category {
  id: string;
  name: string;
  /** Duração de cada partida em minutos */
  matchDurationMinutes: number;
  modalities: Modality[];
  naipes: Naipe[];
  teams: Team[];
}

/** Um confronto gerado/agendado */
export interface Match {
  id: string;
  dayId: string;
  shiftId: string;
  categoryId: string;
  categoryName: string;
  naipe: Naipe;
  modality: string;
  teamA: string;
  teamB: string;
  /** Duração em minutos (herdada da categoria) */
  durationMinutes: number;
  /** Horário de início calculado, formato "HH:MM" */
  startTime: string;
  /** Horário de término calculado, formato "HH:MM" */
  endTime: string;
  /**
   * Quantidade de jogos entre o jogo atual e o jogo mais recente
   * anterior de uma mesma equipe no mesmo dia. Ideal >= 2.
   */
  restGap: number;
  /** TRUE quando o restGap é insuficiente (< 2) — exibir badge de alerta */
  restWarning: boolean;
}

/** Estado completo da aplicação persistido em localStorage */
export interface ScheduleState {
  config: EventConfig;
  days: EventDay[];
  categories: Category[];
  /** Lista ordenada de jogos por dia (a ordem dentro do array importa) */
  matches: Match[];
}

export const INITIAL_STATE: ScheduleState = {
  config: {
    institutionName: "",
    eventName: "",
    transitionMinutes: 10,
  },
  days: [],
  categories: [],
  matches: [],
};

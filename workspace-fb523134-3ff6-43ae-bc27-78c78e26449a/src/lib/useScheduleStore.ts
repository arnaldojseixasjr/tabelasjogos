// ============================================================================
// Hook customizado de estado com persistência automática em localStorage.
// Usa apenas React Hooks (useState + useEffect), conforme requisitado.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_STATE, type ScheduleState } from "./types";

const STORAGE_KEY = "campeonato-escolar-state-v1";

/** Lê o estado salvo do localStorage (ou retorna o estado inicial) */
function loadState(): ScheduleState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<ScheduleState>;
    return {
      config: { ...INITIAL_STATE.config, ...(parsed.config ?? {}) },
      days: parsed.days ?? [],
      categories: parsed.categories ?? [],
      matches: parsed.matches ?? [],
    };
  } catch {
    return INITIAL_STATE;
  }
}

export interface UseScheduleStore {
  state: ScheduleState;
  setState: (updater: (prev: ScheduleState) => ScheduleState) => void;
  /** Substitui integralmente o estado */
  replace: (next: ScheduleState) => void;
  /** Limpa tudo (reseta para o estado inicial) */
  reset: () => void;
}

/**
 * Hook principal de estado. Persiste automaticamente no localStorage sempre
 * que o estado muda (debounce simples via useEffect).
 */
export function useScheduleStore(): UseScheduleStore {
  const [state, setStateInternal] = useState<ScheduleState>(() => loadState());
  const isFirstRun = useRef(true);

  // Persistência automática
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return; // não persiste na primeira execução para evitar sobrescrever
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // silencioso: localStorage cheio ou indisponível
    }
  }, [state]);

  const setState = useCallback(
    (updater: (prev: ScheduleState) => ScheduleState) => {
      setStateInternal((prev) => updater(prev));
    },
    []
  );

  const replace = useCallback((next: ScheduleState) => {
    setStateInternal(next);
  }, []);

  const reset = useCallback(() => {
    setStateInternal(INITIAL_STATE);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // silencioso
    }
  }, []);

  return { state, setState, replace, reset };
}

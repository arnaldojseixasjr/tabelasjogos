// ============================================================================
// Funções utilitárias de tempo (string <-> minutos) e geração de IDs
// ============================================================================

/** Gera um ID único curto (suficiente para uso local) */
export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Converte "HH:MM" para minutos desde meia-noite */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** Converte minutos desde meia-noite para "HH:MM" */
export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Soma minutos a um horário "HH:MM" */
export function addMinutes(hhmm: string, minutes: number): string {
  return minutesToTime(timeToMinutes(hhmm) + minutes);
}

/** Formata uma data ISO (yyyy-mm-dd) para dd/mm/yyyy */
export function formatDateBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Hoje em ISO (yyyy-mm-dd), no fuso local */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

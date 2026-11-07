// ============================================================================
// Algoritmo Round Robin (método do círculo) — Todos contra Todos
// Gera todos os confrontos únicos entre as equipes de um grupo.
// ============================================================================

export interface Pairing {
  teamA: string;
  teamB: string;
}

/**
 * Gera a lista de todos os confrontos únicos (ida) entre as equipes.
 * Para N equipes, retorna N*(N-1)/2 partidas.
 *
 * Usa o método do círculo, que distribui bem os confrontos por rodada,
 * facilitando o escalonamento com descanso entre jogos.
 *
 * @param teamNames lista com pelo menos 2 nomes distintos
 * @returns lista de Pairing { teamA, teamB }
 */
export function generateRoundRobin(teamNames: string[]): Pairing[] {
  const clean = teamNames.filter((n) => n && n.trim().length > 0);
  if (clean.length < 2) return [];

  // Se ímpar, adiciona "bye" para o método do círculo funcionar.
  const teams = [...clean];
  let addedBye = false;
  if (teams.length % 2 !== 0) {
    teams.push("__BYE__");
    addedBye = true;
  }

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  const pairings: Pairing[] = [];

  // Array fixo, exceto o primeiro elemento.
  // O primeiro elemento fica fixo; os outros rotacionam.
  const arr = [...teams];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home === "__BYE__" || away === "__BYE__") continue;
      // Alterna mando para distribuir melhor visualmente
      if (r % 2 === 0) {
        pairings.push({ teamA: home, teamB: away });
      } else {
        pairings.push({ teamA: away, teamB: home });
      }
    }
    // Rotaciona: fixo no índice 0, o resto gira para a direita
    const last = arr.pop()!;
    arr.splice(1, 0, last);
  }

  // Embaralha levemente para evitar agrupamento de mesma rodada
  // (mantém deterministicidade usando seed simples baseada em tamanho)
  shuffleSeeded(pairings, clean.length);

  void addedBye; // sem uso posterior — apenas evita warning
  return pairings;
}

/**
 * Fisher–Yates com seed determinístico (mesma entrada => mesma saída),
 * para que o escalonamento seja reproduzível a cada "Gerar Tabela".
 */
function shuffleSeeded<T>(arr: T[], seed: number): void {
  let s = (seed * 9301 + 49297) % 233280;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

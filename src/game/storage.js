const BEST_SCORE_KEY = "eldoria.bestScore.v2";

export function readBestScore(storage = globalThis.localStorage) {
  try {
    const value = Number.parseInt(storage?.getItem(BEST_SCORE_KEY) ?? "0", 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score, storage = globalThis.localStorage) {
  const safeScore = Math.max(0, Math.floor(Number(score) || 0));
  const bestScore = Math.max(readBestScore(storage), safeScore);

  try {
    storage?.setItem(BEST_SCORE_KEY, String(bestScore));
  } catch {
    // O jogo continua funcional quando o armazenamento está indisponível.
  }

  return bestScore;
}

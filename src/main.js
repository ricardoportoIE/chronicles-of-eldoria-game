import { AudioManager } from "./game/AudioManager.js";
import { CanvasGame } from "./game/CanvasGame.js";
import { InputController } from "./game/InputController.js";
import { loadGameAssets } from "./game/AssetLoader.js";
import { readBestScore, saveBestScore } from "./game/storage.js";

const byId = (id) => document.getElementById(id);
const app = byId("app");
const canvas = byId("gameCanvas");
const audio = new AudioManager();
let game;
let levelBannerTimer;

function formatNumber(number) {
  return Math.floor(number).toString().padStart(6, "0");
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function toRoman(number) {
  const values = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remainder = number;
  return values.reduce((roman, [value, numeral]) => {
    while (remainder >= value) {
      roman += numeral;
      remainder -= value;
    }
    return roman;
  }, "");
}

function setGameState(state) {
  app.dataset.gameState = state;
  byId("pauseButton").disabled = !["playing", "paused"].includes(state);
  byId("pauseButton").setAttribute("aria-label", state === "paused" ? "Retomar jogo" : "Pausar jogo");
}

function updateHud(snapshot) {
  const life = Math.max(0, Math.round(snapshot.life));
  byId("lifeFill").style.width = `${life}%`;
  byId("lifeValue").textContent = life;
  document.querySelector(".life-bar").setAttribute("aria-valuenow", life);
  byId("scoreValue").textContent = formatNumber(snapshot.score);
  byId("timeValue").textContent = formatTime(snapshot.elapsed);
  byId("levelValue").textContent = toRoman(snapshot.difficulty.level);
  byId("shotValue").textContent = snapshot.canShoot ? "PRONTA" : "RECARREGANDO";
  byId("shotValue").style.color = snapshot.canShoot ? "#7fdf97" : "#d6a15a";
}

function announceLevel(level) {
  clearTimeout(levelBannerTimer);
  byId("levelBannerValue").textContent = toRoman(level);
  byId("levelBanner").classList.remove("is-visible");
  requestAnimationFrame(() => byId("levelBanner").classList.add("is-visible"));
  byId("liveStatus").textContent = `Capítulo ${level}. A tempestade ficou mais forte.`;
  levelBannerTimer = setTimeout(() => byId("levelBanner").classList.remove("is-visible"), 2100);
}

function finishGame(snapshot) {
  const previousBest = readBestScore();
  const best = saveBestScore(snapshot.score);
  byId("finalScore").textContent = formatNumber(snapshot.score);
  byId("bestScore").textContent = formatNumber(best);
  byId("finalMessage").textContent = snapshot.score > previousBest
    ? "Um novo recorde foi gravado nos salões de Eldoria."
    : "Eldoria se lembrará da sua resistência.";
  setGameState("gameover");
  byId("restartButton").focus();
}

function startGame() {
  setGameState("playing");
  game.start();
  canvas.focus({ preventScroll: true });
}

function togglePause(forcePause) {
  if (!game) return;
  const state = game.togglePause(forcePause);
  if (state === "paused") {
    setGameState("paused");
    byId("resumeButton").focus();
  } else if (state === "playing") {
    setGameState("playing");
    canvas.focus({ preventScroll: true });
  }
}

function bindInterface(input) {
  byId("startButton").addEventListener("click", startGame);
  byId("restartButton").addEventListener("click", startGame);
  byId("pauseRestartButton").addEventListener("click", startGame);
  byId("resumeButton").addEventListener("click", () => togglePause(false));
  byId("pauseButton").addEventListener("click", () => togglePause());

  byId("soundButton").addEventListener("click", () => {
    const muted = audio.toggleMuted();
    byId("soundButton").querySelector("span").textContent = muted ? "×" : "♫";
    byId("soundButton").setAttribute("aria-label", muted ? "Ativar som" : "Desativar som");
  });

  byId("fullscreenButton").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      byId("liveStatus").textContent = "Tela cheia não está disponível neste navegador.";
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && app.dataset.gameState === "playing") togglePause(true);
  });

  document.querySelectorAll("[data-key]").forEach((button) => {
    const release = () => {
      input.setVirtualKey(button.dataset.key, false);
      button.classList.remove("is-active");
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      input.setVirtualKey(button.dataset.key, true);
      button.classList.add("is-active");
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });
}

async function initialize() {
  setGameState("loading");
  byId("bestScore").textContent = formatNumber(readBestScore());

  try {
    const assets = await loadGameAssets((progress) => {
      byId("loadingFill").style.width = `${Math.round(progress * 100)}%`;
    });
    const input = new InputController({ onPause: () => togglePause() });
    game = new CanvasGame({
      canvas,
      assets,
      audio,
      input,
      onUpdate: updateHud,
      onGameOver: finishGame,
      onLevel: announceLevel,
    });
    bindInterface(input);
    game.draw();
    setGameState("ready");
    byId("startButton").focus();

    import("./realmMark.js")
      .then(({ mountRealmMark }) => mountRealmMark(byId("realmMark")))
      .catch(() => {});
  } catch (error) {
    console.error(error);
    byId("loadingOverlay").innerHTML = `
      <div class="modal-card">
        <h2>As runas não despertaram</h2>
        <p>Recarregue a página para tentar abrir Eldoria novamente.</p>
      </div>`;
  }
}

initialize();

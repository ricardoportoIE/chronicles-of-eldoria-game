const CONTROL_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  " ",
  "p",
  "escape",
]);

export class InputController {
  constructor({ onPause = () => {} } = {}) {
    this.keys = new Set();
    this.onPause = onPause;
    this.abortController = new AbortController();
    const options = { signal: this.abortController.signal };

    window.addEventListener("keydown", (event) => this.handleKeyDown(event), options);
    window.addEventListener("keyup", (event) => this.handleKeyUp(event), options);
    window.addEventListener("blur", () => this.keys.clear(), options);
  }

  normalize(key) {
    return key.length === 1 && key !== " " ? key.toLowerCase() : key.toLowerCase();
  }

  handleKeyDown(event) {
    const key = this.normalize(event.key);
    if (!CONTROL_KEYS.has(key)) return;
    event.preventDefault();
    this.keys.add(key);
    if (!event.repeat && (key === "p" || key === "escape")) this.onPause();
  }

  handleKeyUp(event) {
    this.keys.delete(this.normalize(event.key));
  }

  setVirtualKey(key, pressed) {
    const normalized = this.normalize(key);
    if (pressed) this.keys.add(normalized);
    else this.keys.delete(normalized);
  }

  getMovement() {
    const horizontal =
      Number(this.keys.has("d") || this.keys.has("arrowright")) -
      Number(this.keys.has("a") || this.keys.has("arrowleft"));
    const vertical =
      Number(this.keys.has("s") || this.keys.has("arrowdown")) -
      Number(this.keys.has("w") || this.keys.has("arrowup"));
    const magnitude = Math.hypot(horizontal, vertical) || 1;
    return { x: horizontal / magnitude, y: vertical / magnitude };
  }

  get shooting() {
    return this.keys.has(" ");
  }

  destroy() {
    this.abortController.abort();
    this.keys.clear();
  }
}

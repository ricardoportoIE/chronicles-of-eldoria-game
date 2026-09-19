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

export function getTouchVector(
  deltaX,
  deltaY,
  { deadZone = 8, maxDistance = 32 } = {},
) {
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= deadZone) {
    return { x: 0, y: 0, knobX: 0, knobY: 0 };
  }

  const directionX = deltaX / distance;
  const directionY = deltaY / distance;
  const strength = Math.min(
    1,
    (distance - deadZone) / Math.max(1, maxDistance - deadZone),
  );
  const knobDistance = Math.min(distance, maxDistance);

  return {
    x: directionX * strength,
    y: directionY * strength,
    knobX: directionX * knobDistance,
    knobY: directionY * knobDistance,
  };
}

export class InputController {
  constructor({ onPause = () => {}, onTouchJoystick = () => {} } = {}) {
    this.keys = new Set();
    this.onPause = onPause;
    this.onTouchJoystick = onTouchJoystick;
    this.touchMovement = { x: 0, y: 0 };
    this.activeTouchPointer = null;
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
    if (horizontal || vertical) {
      const magnitude = Math.hypot(horizontal, vertical);
      return { x: horizontal / magnitude, y: vertical / magnitude };
    }
    return this.touchMovement;
  }

  get shooting() {
    return this.keys.has(" ");
  }

  bindTouchSurface(element) {
    const options = { signal: this.abortController.signal };
    let origin = { x: 0, y: 0 };

    const getPosition = (event) => {
      const rect = element.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const updateTouch = (event) => {
      if (event.pointerId !== this.activeTouchPointer) return;
      event.preventDefault();
      const position = getPosition(event);
      const movement = getTouchVector(
        position.x - origin.x,
        position.y - origin.y,
      );
      this.touchMovement = { x: movement.x, y: movement.y };
      this.onTouchJoystick({ active: true, origin, ...movement });
    };

    const releaseTouch = (event) => {
      if (event.pointerId !== this.activeTouchPointer) return;
      this.activeTouchPointer = null;
      this.touchMovement = { x: 0, y: 0 };
      this.onTouchJoystick({ active: false });
    };

    element.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType === "mouse" || this.activeTouchPointer !== null) {
          return;
        }
        event.preventDefault();
        this.activeTouchPointer = event.pointerId;
        origin = getPosition(event);
        try {
          element.setPointerCapture?.(event.pointerId);
        } catch {
          // Synthetic events and some WebViews do not support pointer capture.
        }
        this.touchMovement = { x: 0, y: 0 };
        this.onTouchJoystick({
          active: true,
          origin,
          x: 0,
          y: 0,
          knobX: 0,
          knobY: 0,
        });
      },
      options,
    );
    element.addEventListener("pointermove", updateTouch, options);
    element.addEventListener("pointerup", releaseTouch, options);
    element.addEventListener("pointercancel", releaseTouch, options);
    element.addEventListener("lostpointercapture", releaseTouch, options);
    element.addEventListener("contextmenu", (event) => event.preventDefault(), options);
  }

  destroy() {
    this.abortController.abort();
    this.keys.clear();
    this.touchMovement = { x: 0, y: 0 };
  }
}

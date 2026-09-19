// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { InputController, getTouchVector } from "./InputController.js";

function pointerEvent(type, properties = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, properties);
  return event;
}

afterEach(() => vi.restoreAllMocks());

describe("InputController", () => {
  it("calcula zona morta, força progressiva e distância mínima segura", () => {
    expect(getTouchVector(8, 0)).toEqual({ x: 0, y: 0, knobX: 0, knobY: 0 });
    expect(getTouchVector(9, 0, { deadZone: 8, maxDistance: 8 })).toEqual({
      x: 1,
      y: 0,
      knobX: 8,
      knobY: 0,
    });
  });

  it("normaliza teclado, previne ações do navegador e pausa uma vez", () => {
    const onPause = vi.fn();
    const input = new InputController({ onPause });
    const ignored = new KeyboardEvent("keydown", { key: "q", cancelable: true });
    window.dispatchEvent(ignored);
    expect(ignored.defaultPrevented).toBe(false);

    const down = new KeyboardEvent("keydown", { key: "D", cancelable: true });
    window.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(input.getMovement()).toEqual({ x: 1, y: 0 });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
    expect(input.getMovement().x).toBeCloseTo(Math.SQRT1_2);
    expect(input.getMovement().y).toBeCloseTo(-Math.SQRT1_2);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "P" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", repeat: true }));
    expect(onPause).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "d" }));
    window.dispatchEvent(new Event("blur"));
    expect(input.getMovement()).toEqual({ x: 0, y: 0 });
    input.destroy();
  });

  it("combina botões virtuais, disparo e movimento touch", () => {
    const input = new InputController();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "p" }));
    input.setVirtualKey(" ", true);
    input.setVirtualKey("ArrowLeft", true);
    expect(input.shooting).toBe(true);
    expect(input.getMovement()).toEqual({ x: -1, y: 0 });
    input.setVirtualKey(" ", false);
    input.setVirtualKey("ArrowLeft", false);
    expect(input.shooting).toBe(false);
    const surface = document.createElement("div");
    surface.getBoundingClientRect = () => ({ left: 0, top: 0 });
    input.bindTouchSurface(surface);
    surface.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 4, pointerType: "touch", clientX: 1, clientY: 1,
    }));
    input.destroy();
  });

  it("opera joystick de ponteiro e bloqueia menu de pressão longa", () => {
    const joystick = vi.fn();
    const input = new InputController({ onTouchJoystick: joystick });
    const surface = document.createElement("div");
    surface.getBoundingClientRect = () => ({ left: 10, top: 20 });
    surface.setPointerCapture = vi.fn();
    input.bindTouchSurface(surface);

    surface.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 1, pointerType: "mouse", clientX: 20, clientY: 30,
    }));
    expect(joystick).not.toHaveBeenCalled();

    const down = pointerEvent("pointerdown", {
      pointerId: 7, pointerType: "touch", clientX: 30, clientY: 50,
    });
    surface.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(surface.setPointerCapture).toHaveBeenCalledWith(7);

    surface.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 8, pointerType: "touch", clientX: 30, clientY: 50,
    }));
    surface.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 8, pointerType: "touch", clientX: 90, clientY: 50,
    }));
    surface.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 7, pointerType: "touch", clientX: 62, clientY: 50,
    }));
    expect(input.getMovement()).toEqual({ x: 1, y: 0 });

    surface.dispatchEvent(pointerEvent("pointerup", { pointerId: 8 }));
    expect(input.getMovement()).toEqual({ x: 1, y: 0 });
    surface.dispatchEvent(pointerEvent("pointercancel", { pointerId: 7 }));
    expect(input.getMovement()).toEqual({ x: 0, y: 0 });

    const menu = new Event("contextmenu", { bubbles: true, cancelable: true });
    surface.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
    input.destroy();
  });

  it("tolera WebView sem captura e solta no lostpointercapture", () => {
    const input = new InputController();
    const surface = document.createElement("div");
    surface.getBoundingClientRect = () => ({ left: 0, top: 0 });
    surface.setPointerCapture = () => { throw new Error("indisponível"); };
    input.bindTouchSurface(surface);
    surface.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 3, pointerType: "pen", clientX: 1, clientY: 1,
    }));
    surface.dispatchEvent(pointerEvent("lostpointercapture", { pointerId: 3 }));
    expect(input.activeTouchPointer).toBeNull();
    input.destroy();
  });
});

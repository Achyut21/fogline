"use client";

// "Always 2D" from Settings, per device (localStorage): the fog draws as the flat fill layer even
// when the GPU could run the shader. Storage can be blocked, and then the map picks for itself.

const key = "fogline-map-2d";
const event = "fogline-map-2d";

export function readForce2d(): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch (e) {
    if (e instanceof DOMException) return false;
    throw e;
  }
}

export function writeForce2d(on: boolean) {
  try {
    if (on) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch (e) {
    if (!(e instanceof DOMException)) throw e;
  }
  window.dispatchEvent(new Event(event));
}

export function subscribeForce2d(change: () => void) {
  window.addEventListener(event, change);
  window.addEventListener("storage", change);
  return () => {
    window.removeEventListener(event, change);
    window.removeEventListener("storage", change);
  };
}

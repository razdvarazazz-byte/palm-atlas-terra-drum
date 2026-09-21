import { useSyncExternalStore } from "react";

export type UiMode = "phone" | "pc";

const KEY = "pulse:ui-mode";
const listeners = new Set<() => void>();

function detectDefault(): UiMode {
  if (typeof window === "undefined") return "phone";
  const fine = window.matchMedia("(pointer: fine)").matches;
  const wide = window.matchMedia("(min-width: 860px)").matches;
  return fine && wide ? "pc" : "phone";
}

function read(): UiMode {
  if (typeof localStorage === "undefined") return "phone";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "phone" || v === "pc") return v;
  } catch {
    /* private mode */
  }
  return detectDefault();
}

let current: UiMode = "phone";

function apply(mode: UiMode) {
  current = mode;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.ui = mode;
  }
  listeners.forEach((fn) => fn());
}

export function getUiMode(): UiMode {
  return current;
}

export function setUiMode(mode: UiMode) {
  apply(mode);
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* quota */
  }
}

export function bootUiMode() {
  if (typeof document === "undefined") return;
  apply(read());
}

export function useUiMode(): UiMode {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getUiMode,
    () => "phone" as UiMode,
  );
}

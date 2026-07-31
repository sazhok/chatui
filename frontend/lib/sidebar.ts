export type SidebarState = "expanded" | "collapsed";

export const SIDEBAR_STORAGE_KEY = "chatui-sidebar";

// Same-tab notifications: the native "storage" event only fires in *other* tabs.
const SIDEBAR_EVENT = "chatui-sidebar-change";

/**
 * Products open in separate browser tabs, so the panel state can't be carried
 * over in memory - localStorage is the source of truth, read back on every
 * load and shared live between open tabs.
 */
export function subscribeSidebar(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_EVENT, onChange);
  };
}

export function getSidebarState(): SidebarState {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed" ? "collapsed" : "expanded";
}

/** Pre-hydration default; the inline script in app/layout.tsx matches it. */
export function getSidebarServerState(): SidebarState {
  return "expanded";
}

export function setSidebarState(next: SidebarState): void {
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next);
  document.documentElement.setAttribute("data-sidebar", next);
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

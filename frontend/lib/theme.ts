export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "chatui-theme";

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

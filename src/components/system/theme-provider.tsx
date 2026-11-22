"use client";

import { ThemeProvider as Provider, useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { themeColor } from "@/styles/theme-color";

// The meta tags carry media queries for the OS setting (D-051). Only a manual Day or Night
// override has to rewrite them, so the browser chrome matches the app.
function ThemeColorSync() {
  const { theme, resolvedTheme } = useTheme();
  useEffect(() => {
    if (!theme) return;
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      const dark = theme === "system" ? meta.media.includes("dark") : resolvedTheme === "dark";
      meta.content = dark ? themeColor.night : themeColor.day;
    }
  }, [theme, resolvedTheme]);
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <Provider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeColorSync />
      {children}
    </Provider>
  );
}

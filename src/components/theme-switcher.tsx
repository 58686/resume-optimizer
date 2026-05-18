"use client";

import { useEffect, useState } from "react";

const themes = [
  { id: "sunrise", name: "暖阳", colorClass: "bg-orange-300" },
  { id: "aurora", name: "极光", colorClass: "bg-indigo-500" },
  { id: "emerald", name: "松林", colorClass: "bg-emerald-500" },
  { id: "sunset", name: "晚霞", colorClass: "bg-rose-400" }
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState("sunrise");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("ui-theme") || "sunrise";
    setCurrentTheme(saved);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-[108px] animate-pulse rounded-full bg-[rgba(118,82,58,0.08)]" />;
  }

  function handleThemeChange(themeId: string) {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("ui-theme", themeId);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-[rgba(118,82,58,0.14)] bg-white/60 p-1 shadow-sm">
      {themes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => handleThemeChange(theme.id)}
          title={theme.name}
          className={`h-6 w-6 rounded-full transition-all duration-300 ${theme.colorClass} ${
            currentTheme === theme.id
              ? "scale-110 shadow-[0_0_10px_currentColor] ring-2 ring-white/70 ring-offset-2 ring-offset-[var(--surface-bg)]"
              : "opacity-40 hover:scale-110 hover:opacity-100"
          }`}
          aria-label={`切换到 ${theme.name}`}
        />
      ))}
    </div>
  );
}

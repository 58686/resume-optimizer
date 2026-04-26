"use client";

import { useEffect, useState } from "react";

const themes = [
  { id: "aurora", name: "星际极光", colorClass: "bg-indigo-500" },
  { id: "cyberpunk", name: "赛博霓虹", colorClass: "bg-pink-500" },
  { id: "emerald", name: "翡翠之城", colorClass: "bg-emerald-500" },
  { id: "sunset", name: "日落熔岩", colorClass: "bg-amber-500" }
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState("aurora");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("ui-theme") || "aurora";
    setCurrentTheme(saved);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-[104px] animate-pulse rounded-full bg-zinc-800/50" />;
  }

  function handleThemeChange(themeId: string) {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("ui-theme", themeId);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 p-1">
      {themes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => handleThemeChange(theme.id)}
          title={theme.name}
          className={`h-6 w-6 rounded-full transition-all duration-300 ${theme.colorClass} ${
            currentTheme === theme.id
              ? "scale-110 shadow-[0_0_10px_currentColor] ring-2 ring-white/20 ring-offset-2 ring-offset-[var(--surface-bg)]"
              : "opacity-40 hover:scale-110 hover:opacity-100"
          }`}
          aria-label={`切换到 ${theme.name}`}
        />
      ))}
    </div>
  );
}

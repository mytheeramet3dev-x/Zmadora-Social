"use client";

import { useTheme } from "next-themes";
import { CheckIcon, LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const themes = [
    {
      id: "light",
      name: "Light Mode",
      description: "Clean, crisp, high-contrast daytime interface",
      icon: SunIcon,
      accentColor: "from-amber-400 to-orange-500",
      previewBg: "bg-white border-zinc-200 text-zinc-900",
      previewPost: "bg-zinc-100 border-zinc-200",
    },
    {
      id: "dark",
      name: "Dark Mode",
      description: "Deep, sleek, low-glare nighttime interface",
      icon: MoonIcon,
      accentColor: "from-indigo-400 to-violet-500",
      previewBg: "bg-zinc-950 border-zinc-800 text-zinc-100",
      previewPost: "bg-zinc-900 border-zinc-800",
    },
    {
      id: "system",
      name: "System Default",
      description: "Automatically matches your operating system preference",
      icon: LaptopIcon,
      accentColor: "from-sky-400 to-cyan-500",
      previewBg: "bg-gradient-to-br from-white to-zinc-900 border-border text-foreground",
      previewPost: "bg-muted/40 border-border",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Appearance & Theme</h3>
        <p className="text-xs text-muted-foreground">
          Customize how Zmadora looks and feels on your current device.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {themes.map((t) => {
          const isSelected = theme === t.id;
          const Icon = t.icon;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border bg-card/40 hover:border-border/80 hover:bg-muted/30"
              }`}
            >
              {/* Miniature UI Card Preview */}
              <div
                className={`mb-4 w-full h-24 rounded-xl border p-2 flex flex-col justify-between overflow-hidden ${t.previewBg}`}
              >
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-400/80" />
                  <div className="h-2 w-2 rounded-full bg-amber-400/80" />
                  <div className="h-2 w-2 rounded-full bg-emerald-400/80" />
                </div>
                <div className={`rounded-md p-1.5 border text-[9px] ${t.previewPost}`}>
                  <div className="h-1.5 w-12 rounded bg-current opacity-40 mb-1" />
                  <div className="h-1 w-20 rounded bg-current opacity-20" />
                </div>
              </div>

              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${t.accentColor} text-white shadow-sm`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold">{t.name}</span>
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                {t.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { SettingsPage } from "@/components/pages/SettingsPage";
import { useTheme } from "next-themes";

export default function DashboardSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsPage
      isDarkMode={theme === "dark"}
      setIsDarkMode={(dark) => setTheme(dark ? "dark" : "light")}
    />
  );
}

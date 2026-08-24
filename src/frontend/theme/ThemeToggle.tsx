import { Moon, Sun } from "lucide-react";
import { useTheme } from "./use-theme";

type ThemeToggleProps = {
  compact?: boolean;
};

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " theme-toggle--compact" : ""}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb">
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </span>
      </span>

      {!compact && (
        <span className="theme-toggle__label">
          {isDark ? "Dark mode" : "Light mode"}
        </span>
      )}
    </button>
  );
}

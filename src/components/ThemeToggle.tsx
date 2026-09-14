import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "default" | "icon";
}

export function ThemeToggle({ className, showLabel = false, size = "sm" }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? size : "icon"}
      onClick={toggleTheme}
      className={cn(
        "relative h-8 border-border/80 bg-surface/80 font-mono text-xs transition-all duration-200 hover:border-neon/40 hover:bg-neon/10 hover:text-neon",
        showLabel ? "gap-2 px-2.5" : "w-8",
        className,
      )}
      title={`Switch to ${isDark ? "light" : "dark"} theme (currently ${theme})`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <div className="relative size-3.5 flex items-center justify-center">
        <Sun
          className={cn(
            "size-3.5 transition-all duration-300 transform",
            isDark
              ? "rotate-90 scale-0 opacity-0 absolute"
              : "rotate-0 scale-100 opacity-100 text-amber-500",
          )}
        />
        <Moon
          className={cn(
            "size-3.5 transition-all duration-300 transform",
            isDark
              ? "rotate-0 scale-100 opacity-100 text-neon"
              : "-rotate-90 scale-0 opacity-0 absolute",
          )}
        />
      </div>

      {showLabel && (
        <span className="font-mono text-[11px] text-foreground transition-colors group-hover:text-neon">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
    </Button>
  );
}

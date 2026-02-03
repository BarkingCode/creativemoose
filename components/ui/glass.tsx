/**
 * Glass Component
 *
 * Provides a glassmorphism effect wrapper for UI elements.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassProps {
  children: ReactNode;
  className?: string;
}

export function Glass({ children, className }: GlassProps) {
  return (
    <div className={cn("backdrop-blur-md bg-white/10 rounded-2xl", className)}>
      {children}
    </div>
  );
}

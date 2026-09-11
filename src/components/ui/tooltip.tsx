import type { ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return children;
}

export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <span className="contents" title={content}>
      {children}
    </span>
  );
}

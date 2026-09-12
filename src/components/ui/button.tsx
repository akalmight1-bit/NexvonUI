import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "icon" | "chip";
type Size = "md" | "icon";

const styles: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:opacity-90 px-4 py-2.5 rounded-md text-sm font-medium",
  ghost: "bg-transparent text-muted hover:text-fg hover:bg-fg/6 px-3 py-2 rounded-md text-sm font-medium",
  icon: "grid size-11 place-items-center rounded-md text-muted hover:text-fg hover:bg-fg/8",
  chip: "rounded-full border border-border bg-elevated px-3.5 py-2 text-sm text-fg hover:border-fg/30",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  staticScale?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "ghost", size, staticScale, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-[transform,background-color,color,opacity,border-color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40",
        !staticScale && "active:not-disabled:scale-[0.96]",
        styles[variant],
        size === "icon" && "size-11 p-0",
        className,
      )}
      {...props}
    />
  );
});

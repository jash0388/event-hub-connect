import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cyberButtonVariants = cva(
  "relative inline-flex items-center justify-center font-display font-semibold uppercase tracking-wider transition-all duration-300 overflow-hidden group",
  {
    variants: {
      variant: {
        primary: [
          "bg-primary/10 text-primary border border-primary",
          "hover:bg-primary hover:text-primary-foreground",
          "box-glow-green hover:shadow-[0_0_30px_hsl(var(--neon-green)/0.5)]",
        ],
        secondary: [
          "bg-secondary/10 text-secondary border border-secondary",
          "hover:bg-secondary hover:text-secondary-foreground",
          "box-glow-cyan hover:shadow-[0_0_30px_hsl(var(--neon-cyan)/0.5)]",
        ],
        accent: [
          "bg-accent/10 text-accent border border-accent",
          "hover:bg-accent hover:text-accent-foreground",
          "box-glow-magenta hover:shadow-[0_0_30px_hsl(var(--neon-magenta)/0.5)]",
        ],
        ghost: [
          "bg-transparent text-foreground border border-muted",
          "hover:border-primary hover:text-primary",
        ],
        outline: [
          "bg-transparent border-gradient text-foreground",
          "hover:bg-muted/20",
        ],
      },
      size: {
        sm: "px-4 py-2 text-xs",
        md: "px-6 py-3 text-sm",
        lg: "px-8 py-4 text-base",
        xl: "px-10 py-5 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface CyberButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof cyberButtonVariants> {
  glitch?: boolean;
}

const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant, size, glitch, children, ...props }, ref) => {
    return (
      <button
        className={cn(cyberButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <span className={cn("relative z-10", glitch && "glitch")}>
          {children}
        </span>
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </button>
    );
  }
);
CyberButton.displayName = "CyberButton";

export { CyberButton, cyberButtonVariants };

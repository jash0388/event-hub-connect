import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cyberCardVariants = cva(
  "relative overflow-hidden transition-all duration-500",
  {
    variants: {
      variant: {
        default: [
          "bg-card/80 backdrop-blur-sm border border-border",
          "hover:border-primary/50",
        ],
        glowing: [
          "bg-card/80 backdrop-blur-sm border-gradient",
          "hover:shadow-[0_0_40px_hsl(var(--neon-green)/0.2)]",
        ],
        terminal: [
          "bg-background border border-primary/30",
          "before:absolute before:top-0 before:left-0 before:right-0 before:h-8 before:bg-primary/10",
          "before:border-b before:border-primary/30",
        ],
        hologram: [
          "bg-gradient-to-br from-card via-card/50 to-card",
          "border border-secondary/30",
          "shadow-[0_0_20px_hsl(var(--neon-cyan)/0.1)]",
        ],
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
);

export interface CyberCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cyberCardVariants> {
  scanlines?: boolean;
}

const CyberCard = React.forwardRef<HTMLDivElement, CyberCardProps>(
  ({ className, variant, padding, scanlines, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          cyberCardVariants({ variant, padding, className }),
          scanlines && "scanlines"
        )}
        ref={ref}
        {...props}
      >
        {children}
        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/50" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/50" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/50" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/50" />
      </div>
    );
  }
);
CyberCard.displayName = "CyberCard";

export { CyberCard, cyberCardVariants };

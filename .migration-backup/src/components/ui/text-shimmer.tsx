import { cn } from "@/lib/utils";

interface TextShimmerProps {
  children: string;
  className?: string;
  duration?: number;
}

export function TextShimmer({
  children,
  className,
  duration = 1.5,
}: TextShimmerProps) {
  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, hsl(221 83% 53%) 0%, hsl(217 91% 60%) 30%, hsl(222 47% 11%) 60%, hsl(221 83% 53%) 100%)",
        backgroundSize: "200% auto",
        animation: `shimmer-text ${duration}s linear infinite`,
        WebkitBackgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}

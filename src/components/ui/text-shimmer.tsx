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
          "linear-gradient(90deg, hsl(20 14% 10%) 0%, hsl(355 78% 56%) 30%, hsl(199 89% 48%) 60%, hsl(20 14% 10%) 100%)",
        backgroundSize: "200% auto",
        animation: `shimmer-text ${duration}s linear infinite`,
        WebkitBackgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}

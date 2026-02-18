import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface SlideButtonProps {
    children: ReactNode;
    onClick?: () => void;
    variant?: "default" | "outline" | "secondary" | "ghost";
    className?: string;
    fullWidth?: boolean;
}

export function SlideButton({
    children,
    onClick,
    variant = "default",
    className = "",
    fullWidth = false
}: SlideButtonProps) {
    const baseClasses = variant === "default"
        ? "bg-primary text-primary-foreground hover:bg-primary/90"
        : "";

    return (
        <Button
            variant={variant}
            size="lg"
            className={`group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] ${fullWidth ? 'w-full' : ''} ${className}`}
            onClick={onClick}
        >
            <span className="mr-8 transition-opacity duration-300 group-hover:opacity-0 flex items-center">
                {children}
            </span>
            <span className="absolute right-1 top-1 bottom-1 rounded-sm z-10 grid w-8 place-items-center transition-all duration-300 bg-white/20 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95">
                <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" className="text-white" />
            </span>
        </Button>
    );
}

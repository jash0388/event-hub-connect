import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl',
                'bg-white/70 backdrop-blur-xl',
                'border border-white/20 shadow-xl',
                'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:to-transparent before:pointer-events-none',
                hover && 'transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-white/30',
                className
            )}
        >
            {children}
        </div>
    );
}

interface GlowCardProps {
    children: ReactNode;
    className?: string;
    glowColor?: 'primary' | 'blue' | 'purple' | 'amber';
}

const glowColors = {
    primary: 'shadow-primary/25 shadow-[0_0_40px_-10px]',
    blue: 'shadow-blue-500/25 shadow-[0_0_40px_-10px]',
    purple: 'shadow-purple-500/25 shadow-[0_0_40px_-10px]',
    amber: 'shadow-amber-500/25 shadow-[0_0_40px_-10px]',
};

export function GlowCard({ children, className, glowColor = 'primary' }: GlowCardProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl',
                'bg-white dark:bg-gray-900',
                'border border-gray-100 dark:border-gray-800',
                'shadow-xl',
                glowColors[glowColor],
                'transition-all duration-300 hover:scale-[1.02]',
                className
            )}
        >
            {/* Glow effect */}
            <div className={cn(
                'absolute -top-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-30',
                glowColor === 'primary' && 'bg-primary',
                glowColor === 'blue' && 'bg-blue-500',
                glowColor === 'purple' && 'bg-purple-500',
                glowColor === 'amber' && 'bg-amber-500',
            )} />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

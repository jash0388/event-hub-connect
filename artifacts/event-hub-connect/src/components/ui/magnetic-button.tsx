import { ReactNode, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MagneticButtonProps {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
}

export function MagneticButton({ children, onClick, className }: MagneticButtonProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;

        setPosition({
            x: distanceX * 0.3,
            y: distanceY * 0.3,
        });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
        setIsHovered(false);
    };

    return (
        <button
            ref={buttonRef}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className={cn(
                'relative px-6 py-3 rounded-xl font-medium transition-all duration-300',
                'bg-primary text-white shadow-lg shadow-primary/25',
                'hover:shadow-xl hover:shadow-primary/30',
                'active:scale-95',
                className
            )}
            style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${isHovered ? 1.05 : 1})`,
            }}
        >
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
        </button>
    );
}

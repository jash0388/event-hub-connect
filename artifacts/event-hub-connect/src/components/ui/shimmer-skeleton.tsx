import { cn } from '@/lib/utils';

interface ShimmerSkeletonProps {
    className?: string;
    variant?: 'circle' | 'rect' | 'text';
}

export function ShimmerSkeleton({ className, variant = 'rect' }: ShimmerSkeletonProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden bg-gray-200 dark:bg-gray-700',
                variant === 'circle' && 'rounded-full',
                variant === 'rect' && 'rounded-lg',
                variant === 'text' && 'rounded h-4',
                'animate-pulse',
                className
            )}
        >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
        </div>
    );
}

export function EventCardSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <ShimmerSkeleton className="h-48 w-full mb-4" variant="rect" />
            <ShimmerSkeleton className="h-6 w-3/4 mb-2" variant="text" />
            <ShimmerSkeleton className="h-4 w-1/2 mb-4" variant="text" />
            <div className="flex gap-2">
                <ShimmerSkeleton className="h-8 w-20" variant="rect" />
                <ShimmerSkeleton className="h-8 w-20" variant="rect" />
            </div>
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <ShimmerSkeleton className="h-20 w-20" variant="circle" />
                <div className="space-y-2 flex-1">
                    <ShimmerSkeleton className="h-6 w-32" variant="text" />
                    <ShimmerSkeleton className="h-4 w-48" variant="text" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <ShimmerSkeleton key={i} className="h-24" variant="rect" />
                ))}
            </div>
        </div>
    );
}

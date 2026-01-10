import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface FloatingLogButtonProps {
    onClick: () => void;
    isOpen: boolean;
}

export function FloatingLogButton({ onClick, isOpen }: FloatingLogButtonProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Fade in after mounting to prevent flicker
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (isOpen) return null;

    return (
        <div className={cn(
            "fixed bottom-0 right-8 z-30 transition-transform duration-500 ease-in-out",
            isVisible ? "translate-y-0" : "translate-y-full"
        )}>
            <Button
                variant="secondary"
                size="sm"
                className="rounded-t-lg rounded-b-none border-t border-x border-border/50 shadow-lg px-6 h-8 hover:h-9 transition-all gap-2 text-xs font-medium bg-background/80 backdrop-blur-md"
                onClick={onClick}
            >
                <ChevronUp size={14} className="animate-bounce" />
                SYSTEM LOGS
            </Button>
        </div>
    );
}

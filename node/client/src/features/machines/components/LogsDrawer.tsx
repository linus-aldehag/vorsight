import { useRef, useEffect } from 'react';
import { MachineLogs } from '@/features/machines/components/MachineLogs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface LogsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    machineId: string;
}

export function LogsDrawer({ isOpen, onClose, machineId }: LogsDrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement;
            // Prevent closing when interacting with portals (like dropdowns)
            const isInsidePortal = target.closest('[data-radix-portal]') ||
                target.closest('[role="menu"]') ||
                target.closest('[role="listbox"]');

            if (drawerRef.current && !drawerRef.current.contains(target) && !isInsidePortal && isOpen) {
                // Update last viewed time when closing via click outside
                localStorage.setItem('lastLogsViewed', new Date().toISOString());
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    return (
        <div
            ref={drawerRef}
            className={cn(
                "fixed bottom-0 left-0 right-0 border-t border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] transition-all duration-300 ease-in-out z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.2)] flex flex-col",
                isOpen ? "h-[60vh] sm:h-[500px]" : "h-0 overflow-hidden border-t-0"
            )}
        >
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)] flex-shrink-0">
                <span className="text-sm font-semibold">System Logs</span>
                <Button variant="ghost" size="sm" onClick={() => {
                    localStorage.setItem('lastLogsViewed', new Date().toISOString());
                    onClose();
                }} className="h-6 w-6 p-0 hover:bg-muted/50 rounded-full">
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-hidden">
                {/* Only render content when opening/open to save resources, or keep mounted? 
                    Keep mounted to preserve state/scroll is usually better for logs. */}
                <MachineLogs
                    machineId={machineId}
                    className="h-full"
                    minimal={true}
                    lastViewedTimestamp={isOpen ? undefined : new Date(localStorage.getItem('lastLogsViewed') || 0).getTime()}
                />
            </div>
        </div>
    );
}

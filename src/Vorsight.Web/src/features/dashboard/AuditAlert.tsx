import { useState, useEffect } from 'react';
import type { AuditReport } from '../../api/client';
import { Button } from '../../components/ui/button';
import { XCircle, AlertTriangle } from 'lucide-react';

interface AuditAlertProps {
    audit: AuditReport | null;
}

export function AuditAlert({ audit }: AuditAlertProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!audit) return;

        if (audit.passed) {
            setVisible(false);
            return;
        }

        const lastDismissed = localStorage.getItem('audit_dismissed_at');
        if (lastDismissed) {
            const dismissedTime = new Date(lastDismissed).getTime();
            const auditTime = new Date(audit.timestamp).getTime();

            if (auditTime > dismissedTime) {
                setVisible(true);
            } else {
                setVisible(false);
            }
        } else {
            setVisible(true);
        }
    }, [audit]);

    if (!visible || !audit || audit.warnings.length === 0) return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs font-mono p-4">
            <div className="flex items-center gap-2 text-success opacity-50">
                <div className="w-2 h-2 bg-success rounded-full" />
                SYSTEM STATUS: NORMAL
            </div>
            <div className="mt-2 text-[10px] opacity-40">All systems operational</div>
        </div>
    );

    const handleDismiss = () => {
        localStorage.setItem('audit_dismissed_at', audit.timestamp);
        setVisible(false);
    };

    // Helper to highlight specific event IDs
    const formatWarning = (warning: string) => {
        // Simple regex to check for 4720 or 4728
        // Assuming warning string contains the ID
        const isCritical = warning.includes('4720') || warning.includes('4728');
        return (
            <span className={isCritical ? "text-warning animate-pulse" : "text-destructive"}>
                {isCritical && <AlertTriangle className="inline w-3 h-3 mr-1 mb-0.5" />}
                {warning}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full bg-black/40 text-xs font-mono p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-destructive/20 text-destructive">
                <span className="font-bold flex items-center gap-2">
                    <XCircle size={14} />
                    AUDIT ALERT
                </span>
                <span className="opacity-50">{new Date(audit.timestamp).toLocaleTimeString()}</span>
            </div>

            <ul className="space-y-2 flex-1 overflow-y-auto min-h-0">
                {audit.warnings.map((w, i) => (
                    <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground select-none opacity-50">[{String(i).padStart(3, '0')}]</span>
                        {formatWarning(w)}
                    </li>
                ))}
            </ul>

            <div className="mt-4 flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                >
                    ACKNOWLEDGE
                </Button>
            </div>
        </div>
    );
}

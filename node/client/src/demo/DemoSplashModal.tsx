import { useState } from 'react';
import { Gamepad2, CheckCircle2, Shield, Monitor, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoSplashModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    onQuickLogin?: () => void;
}

export function DemoSplashModal({ isOpen = true, onClose, onQuickLogin }: DemoSplashModalProps) {
    const [show, setShow] = useState(isOpen);

    const handleClose = () => {
        setShow(false);
        if (onClose) onClose();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-surface border border-primary/30 rounded-xl p-6 shadow-2xl space-y-6">
                {onClose && (
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <Gamepad2 size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-wide text-foreground">
                            Interactive Demo Server
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Vorsight Client Standalone Preview
                        </p>
                    </div>
                </div>

                {/* Info List */}
                <div className="space-y-3 text-sm text-muted-foreground bg-background/50 p-4 rounded-lg border border-border/50">
                    <div className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
                        <span><strong>No Backend Required:</strong> Simulates real-time agent telemetry, screenshots, and security audits 100% inside your browser.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <Monitor size={16} className="text-primary shrink-0 mt-0.5" />
                        <span><strong>Interactive Devices:</strong> Switch between Living Room Gaming PC, Kids Study PC, Kitchen Hub, and Streaming Box.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <Shield size={16} className="text-warning shrink-0 mt-0.5" />
                        <span><strong>Any Passphrase Works:</strong> Enter any passphrase (or click Quick Demo Login) to enter the dashboard.</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                    {onQuickLogin ? (
                        <Button
                            onClick={() => {
                                handleClose();
                                onQuickLogin();
                            }}
                            className="flex-1 bg-primary text-primary-foreground font-semibold hover:opacity-90"
                        >
                            <Gamepad2 size={16} className="mr-2" />
                            Quick Demo Login
                        </Button>
                    ) : (
                        <Button
                            onClick={handleClose}
                            className="flex-1 bg-primary text-primary-foreground font-semibold"
                        >
                            Explore Live Demo
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

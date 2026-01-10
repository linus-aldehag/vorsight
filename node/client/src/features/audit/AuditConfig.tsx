import { type AgentSettings } from '@/api/client';
import { ToggleField } from '@/components/common/form-fields/ToggleField';
import { Shield } from 'lucide-react';

interface AuditConfigProps {
    settings: AgentSettings;
    onUpdate: (settings: Partial<AgentSettings>) => void;
}

export function AuditConfig({ settings, onUpdate }: AuditConfigProps) {
    const isEnabled = settings.isAuditEnabled;

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                Configure which Windows Event Logs are monitored for security events.
                Changes take effect immediately on the agent.
            </p>

            <div className={`space-y-1 ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>

                <ToggleField
                    label="Security Log"
                    description="Detects user account changes, group membership modifications, and audit tampering. (Recommended: On)"
                    checked={settings.auditLogSecurityEnabled ?? true}
                    onCheckedChange={(checked) => onUpdate({ auditLogSecurityEnabled: checked })}
                    disabled={!isEnabled}
                />

                <ToggleField
                    label="System Log"
                    description="Detects service installations, start type changes, and other systemic modifications."
                    checked={settings.auditLogSystemEnabled ?? true}
                    onCheckedChange={(checked) => onUpdate({ auditLogSystemEnabled: checked })}
                    disabled={!isEnabled}
                    divided
                />

                <ToggleField
                    label="Application Log"
                    description="Monitors for critical application errors and warnings."
                    checked={settings.auditLogApplicationEnabled ?? true}
                    onCheckedChange={(checked) => onUpdate({ auditLogApplicationEnabled: checked })}
                    disabled={!isEnabled}
                    divided
                />

            </div>

            {!isEnabled && (
                <div className="flex items-center justify-center p-4 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Audit monitoring is currently disabled. Enable it above to configure filters.
                </div>
            )}
        </div>
    );
}

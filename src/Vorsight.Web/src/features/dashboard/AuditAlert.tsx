import { Alert, Button, Group, Text, Box } from '@mantine/core';
import { useState, useEffect } from 'react';
import type { AuditReport } from '../../api/client';

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
        // Show if never dismissed OR if the new audit is fresher than the dismissal
        // Actually, logic: dismissing hides it until a NEW problem appears?
        // Or simpler: Dismiss hides it for 1 hour?
        // Let's do: Dismiss hides THIS specific timestamp (or just hides until next refresh for simplicity?)
        // Better: Dismiss stores the timestamp of the audit. If new audit > dismissed timestamp, show again. 

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

    if (!visible || !audit || audit.warnings.length === 0) return null;

    const handleDismiss = () => {
        localStorage.setItem('audit_dismissed_at', audit.timestamp);
        setVisible(false);
    };

    return (
        <Box mb="md">
            <Alert variant="filled" color="red" title="System Audit Warning" withCloseButton onClose={handleDismiss}>
                <Text size="sm" mb="xs">The following issues were detected:</Text>
                <ul>
                    {audit.warnings.map((w, i) => (
                        <li key={i}><Text size="sm">{w}</Text></li>
                    ))}
                </ul>
                <Group justify="flex-end" mt="md">
                    <Button variant="white" color="red" size="xs" onClick={handleDismiss}>
                        Dismiss
                    </Button>
                </Group>
            </Alert>
        </Box>
    );
}

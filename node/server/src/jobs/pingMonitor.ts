import { prisma } from '../db/database';
import ping from 'ping';
import schedule from 'node-schedule';

export async function checkOfflineMachines() {
    try {
        // Get machines that haven't connected in the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const offlineMachines = await prisma.machine.findMany({
            where: {
                OR: [
                    { lastSeen: null },
                    { lastSeen: { lt: twoMinutesAgo } }
                ]
            },
            select: {
                id: true,
                name: true,
                ipAddress: true,
                hostname: true,
                lastSeen: true
            }
        });

        if (offlineMachines.length === 0) {
            return; // Silent when all machines connected
        }

        for (const machine of offlineMachines) {
            const target = machine.ipAddress || machine.hostname;

            if (!target) {
                continue;
            }

            try {
                const result = await ping.promise.probe(target, {
                    timeout: 3,
                    extra: ['-n', '1']
                });

                // Get previous state to preserve existing settings
                const prevState = await prisma.machineState.findUnique({
                    where: { machineId: machine.id },
                    select: { healthStatus: true, settings: true }
                });

                // Store ping result in machine_state with timestamp
                const pingStatus = result.alive ? 'reachable' : 'unreachable';
                const pingTime = result.alive ? (result.time as unknown as number) : null;
                const now = new Date(); // Use Date object for Prisma

                // Update machine_state with dedicated ping columns
                // We no longer merge into the settings blob to avoid race conditions with user settings edits
                await prisma.machineState.upsert({
                    where: { machineId: machine.id },
                    create: {
                        machineId: machine.id,
                        healthStatus: pingStatus,
                        lastPingTime: now,
                        lastPingSuccess: result.alive ? now : undefined,
                        pingLatency: pingTime ? Math.round(pingTime) : null,
                        settings: prevState?.settings ?? "{}", // Preserve or init
                        updatedAt: now
                    },
                    update: {
                        healthStatus: pingStatus,
                        lastPingTime: now,
                        // Only update lastPingSuccess if alive
                        ...(result.alive ? { lastPingSuccess: now } : {}),
                        pingLatency: pingTime ? Math.round(pingTime) : null,
                        updatedAt: now
                    }
                });

            } catch (error: any) {
                console.error(`[Ping Monitor] Error checking ${machine.name}:`, error.message);
            }
        }

    } catch (error) {
        console.error('[Ping Monitor] Error:', error);
    }
}

// Schedule ping checks every 5 minutes
export function schedulePingMonitor() {
    // Run every 5 minutes
    schedule.scheduleJob('*/5 * * * *', async () => {
        try {
            await checkOfflineMachines();
        } catch (error) {
            console.error('[Ping Monitor] Scheduled check error:', error);
        }
    });

    console.log('[Ping Monitor] Scheduled to run every 5 minutes');

    // Run immediately on startup
    setTimeout(() => checkOfflineMachines(), 10000); // Wait 10s after startup
}

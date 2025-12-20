import { useEffect, useState } from 'react';
import { Title, Paper, Group, Text, Switch, Stack, Button, Loader, Alert, Divider, NumberInput, Collapse, TextInput } from '@mantine/core';
import { IconDeviceFloppy, IconAlertCircle } from '@tabler/icons-react';
import { VorsightApi, type AccessSchedule, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';

export function ScheduleManager() {
    const { selectedMachine } = useMachine();
    const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
    const [agentSettings, setAgentSettings] = useState<AgentSettings>({
        screenshotIntervalSeconds: 60,
        pingIntervalSeconds: 30,
        isMonitoringEnabled: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Feature toggles
    const [screenshotEnabled, setScreenshotEnabled] = useState(true);
    const [activityTrackingEnabled, setActivityTrackingEnabled] = useState(true);
    const [scheduleEnforcementEnabled, setScheduleEnforcementEnabled] = useState(true);

    useEffect(() => {
        if (selectedMachine) {
            loadData();
        }
    }, [selectedMachine]);

    const loadData = async () => {
        try {
            // Load schedule (optional, may not exist)
            try {
                const scheduleData = await VorsightApi.getSchedule(selectedMachine?.id);
                setSchedule(scheduleData || createDefaultSchedule());
            } catch (err) {
                console.warn('No schedule found, using defaults', err);
                setSchedule(createDefaultSchedule());
            }

            // Load agent settings from API
            const settings = await VorsightApi.getSettings(selectedMachine?.id);
            setAgentSettings(settings);

            // Initialize feature toggles based on settings
            setScreenshotEnabled(settings.screenshotIntervalSeconds > 0);
            setActivityTrackingEnabled(settings.pingIntervalSeconds > 0);
            setScheduleEnforcementEnabled(schedule?.isActive ?? true);
        } catch (err) {
            console.error('Failed to load agent settings', err);
            setError('Failed to load agent settings. Using defaults.');
        } finally {
            setLoading(false);
        }
    };

    const createDefaultSchedule = (): AccessSchedule => ({
        scheduleId: '',
        childUsername: 'child',
        isActive: true,
        allowedTimeWindows: [],
        dailyTimeLimitMinutes: 120,
        weekendBonusMinutes: 60,
        createdUtc: new Date().toISOString(),
        modifiedUtc: new Date().toISOString()
    });

    const handleSave = async () => {
        if (!schedule) return;
        setSaving(true);
        setError(null);
        try {
            if (!selectedMachine) {
                setError('No machine selected');
                return;
            }

            // Update schedule with enforcement toggle
            const updatedSchedule = { ...schedule, isActive: scheduleEnforcementEnabled };
            await VorsightApi.saveSchedule(selectedMachine.id, updatedSchedule);

            // Update agent settings based on feature toggles
            const updatedSettings = {
                ...agentSettings,
                screenshotIntervalSeconds: screenshotEnabled ? agentSettings.screenshotIntervalSeconds : 0,
                pingIntervalSeconds: activityTrackingEnabled ? agentSettings.pingIntervalSeconds : 0,
                isMonitoringEnabled: screenshotEnabled || activityTrackingEnabled
            };
            await VorsightApi.saveSettings(selectedMachine.id, updatedSettings);
        } catch (err) {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // Helper functions for time window management
    const getStartTime = (sched: AccessSchedule): string => {
        if (sched.allowedTimeWindows && sched.allowedTimeWindows.length > 0) {
            const window = sched.allowedTimeWindows[0];
            return window.startTime || '08:00';
        }
        return '08:00';
    };

    const getEndTime = (sched: AccessSchedule): string => {
        if (sched.allowedTimeWindows && sched.allowedTimeWindows.length > 0) {
            const window = sched.allowedTimeWindows[0];
            return window.endTime || '22:00';
        }
        return '22:00';
    };

    const updateStartTime = (time: string) => {
        if (!schedule) return;
        const endTime = getEndTime(schedule);
        setSchedule({
            ...schedule,
            allowedTimeWindows: [{
                dayOfWeek: 0, // 0 = Sunday, applies to all days
                startTime: time,
                endTime: endTime
            }]
        });
    };

    const updateEndTime = (time: string) => {
        if (!schedule) return;
        const startTime = getStartTime(schedule);
        setSchedule({
            ...schedule,
            allowedTimeWindows: [{
                dayOfWeek: 0, // 0 = Sunday, applies to all days
                startTime: startTime,
                endTime: time
            }]
        });
    };

    if (loading) return <Loader />;

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={3}>Settings</Title>
                <Button
                    leftSection={<IconDeviceFloppy size={16} />}
                    loading={saving}
                    onClick={handleSave}
                >
                    Save Changes
                </Button>
            </Group>

            {error && (
                <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
                    {error}
                </Alert>
            )}

            {schedule && (
                <Stack>
                    {/* Screenshot Monitoring Section */}
                    <Paper p="md" withBorder>
                        <Group justify="space-between" mb="md">
                            <div>
                                <Title order={4}>Screenshot Monitoring</Title>
                                <Text size="sm" c="dimmed">
                                    Automatically capture screenshots at regular intervals
                                </Text>
                            </div>
                            <Switch
                                size="lg"
                                checked={screenshotEnabled}
                                onChange={(e) => setScreenshotEnabled(e.currentTarget.checked)}
                            />
                        </Group>

                        <Collapse in={screenshotEnabled}>
                            <Stack gap="xs">
                                <Text size="sm" fw={500}>Screenshot Interval (seconds)</Text>
                                <NumberInput
                                    value={agentSettings.screenshotIntervalSeconds}
                                    onChange={(val) => setAgentSettings({ ...agentSettings, screenshotIntervalSeconds: typeof val === 'number' ? val : 60 })}
                                    min={10}
                                    max={600}
                                    step={10}
                                    disabled={!screenshotEnabled}
                                />
                                <Text size="xs" c="dimmed">How often to capture screenshots (10-600s)</Text>
                            </Stack>
                        </Collapse>
                    </Paper>

                    <Divider />

                    {/* Activity Tracking Section */}
                    <Paper p="md" withBorder>
                        <Group justify="space-between" mb="md">
                            <div>
                                <Title order={4}>Activity Tracking</Title>
                                <Text size="sm" c="dimmed">
                                    Monitor active windows and send status updates
                                </Text>
                            </div>
                            <Switch
                                size="lg"
                                checked={activityTrackingEnabled}
                                onChange={(e) => setActivityTrackingEnabled(e.currentTarget.checked)}
                            />
                        </Group>

                        <Collapse in={activityTrackingEnabled}>
                            <Stack gap="xs">
                                <Text size="sm" fw={500}>Status Ping Interval (seconds)</Text>
                                <NumberInput
                                    value={agentSettings.pingIntervalSeconds}
                                    onChange={(val) => setAgentSettings({ ...agentSettings, pingIntervalSeconds: typeof val === 'number' ? val : 30 })}
                                    min={5}
                                    max={300}
                                    step={5}
                                    disabled={!activityTrackingEnabled}
                                />
                                <Text size="xs" c="dimmed">How often to send heartbeat (5-300s)</Text>
                            </Stack>
                        </Collapse>
                    </Paper>

                    <Divider />

                    {/* Schedule Enforcement Section */}
                    <Paper p="md" withBorder>
                        <Group justify="space-between" mb="md">
                            <div>
                                <Title order={4}>Schedule Enforcement</Title>
                                <Text size="sm" c="dimmed">
                                    Restrict access to specific time windows
                                </Text>
                            </div>
                            <Switch
                                size="lg"
                                checked={scheduleEnforcementEnabled}
                                onChange={(e) => setScheduleEnforcementEnabled(e.currentTarget.checked)}
                            />
                        </Group>

                        <Collapse in={scheduleEnforcementEnabled}>
                            <Stack gap="md">
                                <Text size="sm" c="dimmed">
                                    Define the time window when access is allowed (e.g., 08:00 to 20:00).
                                    Outside these hours, the user will be logged off.
                                </Text>

                                <Group>
                                    <Stack gap="xs">
                                        <Text size="sm">Start Time (24h)</Text>
                                        <TextInput
                                            placeholder="HH:MM (e.g., 08:00)"
                                            value={getStartTime(schedule)}
                                            onChange={(e) => updateStartTime(e.target.value)}
                                            disabled={!scheduleEnforcementEnabled}
                                            styles={{ input: { fontFamily: 'monospace' } }}
                                        />
                                    </Stack>

                                    <Stack gap="xs">
                                        <Text size="sm">End Time (24h)</Text>
                                        <TextInput
                                            placeholder="HH:MM (e.g., 20:00)"
                                            value={getEndTime(schedule)}
                                            onChange={(e) => updateEndTime(e.target.value)}
                                            disabled={!scheduleEnforcementEnabled}
                                            styles={{ input: { fontFamily: 'monospace' } }}
                                        />
                                    </Stack>
                                </Group>
                            </Stack>
                        </Collapse>
                    </Paper>
                </Stack>
            )}
        </Stack>
    );
}

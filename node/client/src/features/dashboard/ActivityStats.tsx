import { useEffect, useState, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { VorsightApi, type ActivitySummary } from '@/api/client';
import { useMachine } from '@/context/MachineContext';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, ReferenceLine } from 'recharts';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StatRow } from './components/StatRow';
import { cn } from '@/lib/utils';

export const ActivityStats = memo(function ActivityStats({ isDisabled = false }: { isDisabled?: boolean }) {
    const { selectedMachine } = useMachine();
    const [summary, setSummary] = useState<ActivitySummary | null>(null);

    useEffect(() => {
        if (selectedMachine) {
            fetchSummary();
            const interval = setInterval(fetchSummary, 30000);
            return () => clearInterval(interval);
        }
    }, [selectedMachine]);

    const fetchSummary = async () => {
        if (!selectedMachine) return;

        try {
            const data = await VorsightApi.getActivitySummary(selectedMachine.id);
            setSummary(data);
        } catch (err) {
            console.error("Failed to fetch activity summary", err);
        }
    };

    if (!summary) return null;

    // Get current hour
    const currentHour = new Date().getHours();

    // Transform timeline for Recharts - sorting explicitly 0-23
    const chartData = Array.from({ length: 24 }).map((_, i) => {
        const hour = i;
        const stat = summary.timeline.find(t => t.hour === hour);
        return {
            hour: hour,
            minutes: stat ? stat.activeMinutes : 0,
            label: `${hour}:00`
        };
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Activity Timeline */}
            <Card variant="glass" className={cn("flex flex-col h-full", isDisabled && "opacity-40")}>
                <SectionHeader
                    title="Activity Timeline"
                    description="24 Hour Cycle"
                    rightContent={
                        <>
                            <div className="text-2xl font-bold text-primary">{summary.totalActiveHours}h</div>
                            <div className="text-xs text-muted-foreground">TOTAL ACTIVE</div>
                        </>
                    }
                />
                <CardContent className="pb-4 flex-1 min-h-0">
                    <div className="w-full h-full min-h-[120px]">
                        <ResponsiveContainer width="100%" height={160} minWidth={0}>
                            <BarChart data={chartData}>
                                <XAxis
                                    dataKey="label"
                                    stroke="#888888"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={5}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', backdropFilter: 'blur(var(--glass-blur))' }}
                                    labelStyle={{ color: '#888' }}
                                    cursor={{ fill: 'transparent' }}
                                    formatter={(value: number | undefined) => {
                                        if (value === undefined) return ['0 minutes', 'Active Time'];
                                        const mins = Math.floor(value);
                                        if (mins < 60) return [mins === 1 ? '1 minute' : `${mins} minutes`, 'Active Time'];
                                        const hours = Math.floor(mins / 60);
                                        const remainingMins = mins % 60;
                                        return remainingMins > 0
                                            ? [`${hours}h ${remainingMins}m`, 'Active Time']
                                            : [`${hours}h`, 'Active Time'];
                                    }}
                                />
                                <Bar
                                    dataKey="minutes"
                                    fill="var(--color-primary)" // Use theme color
                                    radius={[2, 2, 0, 0]}
                                    barSize={8}
                                />
                                <ReferenceLine
                                    x={`${currentHour}:00`}
                                    stroke="var(--color-primary)"
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    label={{
                                        value: 'NOW',
                                        position: 'top',
                                        fill: 'var(--color-primary)',
                                        fontSize: 10,
                                        fontWeight: 'bold'
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Top Applications */}
            <Card variant="glass" className={cn("flex flex-col h-full", isDisabled && "opacity-40")}>
                <SectionHeader
                    title="Top Processes"
                    description="Focus Distribution"
                />
                <CardContent className="flex-1 overflow-auto">
                    <div className="space-y-4">
                        {summary.topApps.length > 0 ? summary.topApps.map((app, index) => (
                            <StatRow
                                key={index}
                                label={app.name}
                                value={`${app.percentage}%`}
                                percentage={app.percentage}
                            />
                        )) : (
                            <div className="text-center text-xs text-muted-foreground italic py-4">No activity recorded</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});


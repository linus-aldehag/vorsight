import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { VorsightApi, type ActivitySummary } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

export function ActivityStats() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Activity Timeline */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg tracking-wide text-primary">ACTIVITY TIMELINE</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">24 Hour Cycle</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{summary.totalActiveHours}h</div>
                            <div className="text-xs text-muted-foreground">TOTAL ACTIVE</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pb-4">
                    <div className="w-full min-h-[200px]">
                        <ResponsiveContainer width="100%" height={200} minHeight={200}>
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
                                    contentStyle={{ backgroundColor: '#0D1117', border: '1px solid #333' }}
                                    labelStyle={{ color: '#888888' }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Bar
                                    dataKey="minutes"
                                    fill="#00D1FF"
                                    radius={[2, 2, 0, 0]}
                                    barSize={8}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Top Applications */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg tracking-wide text-primary">TOP PROCESSES</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Focus Distribution</p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {summary.topApps.length > 0 ? summary.topApps.map((app, index) => (
                            <div key={index} className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span className="truncate max-w-[70%]">{app.name}</span>
                                    <span>{app.percentage}%</span>
                                </div>
                                <Progress value={app.percentage} className="h-1.5 bg-secondary" />
                            </div>
                        )) : (
                            <div className="text-center text-xs text-muted-foreground italic py-4">No activity recorded</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

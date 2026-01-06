import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, ReferenceArea, ReferenceLine } from 'recharts';

interface Usage24HourChartProps {
    machineId: string;
    allowedStart: string; // HH:MM format
    allowedEnd: string;   // HH:MM format
}

interface ActivitySession {
    startTime: number;
    endTime: number;
    durationSeconds: number;
    processName?: string;
    activeWindow?: string;
}

export function Usage24HourChart({ machineId, allowedStart, allowedEnd }: Usage24HourChartProps) {
    const [hourlyData, setHourlyData] = useState<{ hour: number; usage: number; allowed: boolean }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsageData();
        const interval = setInterval(loadUsageData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [machineId, allowedStart, allowedEnd]);

    const loadUsageData = async () => {
        try {
            // Get activity sessions for the last 24 hours
            const hoursAgo = 24;
            const token = localStorage.getItem('auth_token');
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`/api/activity/sessions?machineId=${machineId}&hoursAgo=${hoursAgo}`, { headers });
            if (!res.ok) throw new Error('Failed to load activity');
            const sessions: ActivitySession[] = await res.json();

            // Initialize 24 hours with zero usage
            const hours = Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                usage: 0,
                allowed: isHourAllowed(i, allowedStart, allowedEnd)
            }));

            // Aggregate usage by hour
            sessions.forEach((session: ActivitySession) => {
                const hour = new Date(session.startTime * 1000).getHours();
                hours[hour].usage += session.durationSeconds / 3600; // Convert to hours
            });

            setHourlyData(hours);
        } catch (err) {
            console.error('Failed to load usage data', err);
        } finally {
            setLoading(false);
        }
    };

    const isHourAllowed = (hour: number, start: string, end: string): boolean => {
        const [startHour] = start.split(':').map(Number);
        const [endHour] = end.split(':').map(Number);

        if (startHour <= endHour) {
            return hour >= startHour && hour < endHour;
        } else {
            // Crosses midnight
            return hour >= startHour || hour < endHour;
        }
    };

    if (loading) {
        return <div className="h-32 flex items-center justify-center text-sm text-muted-foreground animate-pulse">Loading usage data...</div>;
    }

    const [startHour] = allowedStart.split(':').map(Number);
    const [endHour] = allowedEnd.split(':').map(Number);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs text-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                    <span>Activity</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))', opacity: 0.7 }} />
                    <span>Allowed Hours</span>
                </div>
            </div>

            <div className="relative bg-card border border-border rounded-lg p-3 overflow-hidden" style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                        <XAxis
                            dataKey="hour"
                            tickFormatter={(hour) => hour % 6 === 0 ? `${hour.toString().padStart(2, '0')}:00` : ''}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickLine={false}
                            interval={0}
                        />

                        {/* Allowed hours shaded background */}
                        {startHour <= endHour ? (
                            <ReferenceArea
                                x1={startHour}
                                x2={endHour}
                                fill="hsl(var(--chart-2))"
                                fillOpacity={0.15}
                                strokeOpacity={0}
                            />
                        ) : (
                            <>
                                {/* Before midnight */}
                                <ReferenceArea
                                    x1={startHour}
                                    x2={23}
                                    fill="hsl(var(--chart-2))"
                                    fillOpacity={0.15}
                                    strokeOpacity={0}
                                />
                                {/* After midnight */}
                                <ReferenceArea
                                    x1={0}
                                    x2={endHour}
                                    fill="hsl(var(--chart-2))"
                                    fillOpacity={0.15}
                                    strokeOpacity={0}
                                />
                            </>
                        )}

                        {/* Boundary lines for allowed window */}
                        <ReferenceLine
                            x={startHour}
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                        />
                        <ReferenceLine
                            x={endHour}
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                        />

                        {/* Actual usage bars */}
                        <Bar
                            dataKey="usage"
                            maxBarSize={12}
                            radius={[2, 2, 0, 0]}
                        >
                            {hourlyData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.usage > 0 ? 'hsl(var(--primary))' : 'transparent'}
                                    opacity={0.8}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

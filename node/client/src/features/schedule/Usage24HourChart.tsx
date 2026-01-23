import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, ReferenceArea, ReferenceLine } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import api from '../../lib/axios';

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
    const { theme } = useTheme();

    useEffect(() => {
        loadUsageData();
        const interval = setInterval(loadUsageData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [machineId, allowedStart, allowedEnd]);

    const loadUsageData = async () => {
        try {
            // Get activity sessions for the last 24 hours
            const hoursAgo = 24;
            const res = await api.get(`/activity/sessions?machineId=${machineId}&hoursAgo=${hoursAgo}`);
            const sessions: ActivitySession[] = res.data;

            // Initialize 24 hours with zero usage
            const hours = Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                usage: 0,
                allowed: isHourAllowed(i, allowedStart, allowedEnd)
            }));

            // Aggregate usage by hour with time splitting
            sessions.forEach((session: ActivitySession) => {
                const start = session.startTime * 1000;
                const end = session.endTime * 1000;

                let current = start;
                while (current < end) {
                    const currentHourStart = new Date(current);
                    currentHourStart.setMinutes(0, 0, 0);

                    const nextHourStart = new Date(currentHourStart);
                    nextHourStart.setHours(nextHourStart.getHours() + 1);

                    const hour = currentHourStart.getHours();
                    const segmentEnd = Math.min(end, nextHourStart.getTime());
                    const durationInHour = (segmentEnd - current) / 1000; // seconds

                    if (hours[hour]) {
                        hours[hour].usage += durationInHour / 3600;
                    }

                    current = segmentEnd;
                }
            });

            // Cap usage at 1.0 (100%) to handle any potential slight overlaps
            hours.forEach(h => {
                if (h.usage > 1) h.usage = 1;
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

    // Use theme colors
    const activityColor = theme.colors.primary;
    const allowedColor = theme.colors.accent;
    const labelColor = theme.colors.mutedForeground;
    const borderColor = theme.colors.border;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs text-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: activityColor }} />
                    <span>Activity</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: allowedColor }} />
                    <span>Allowed Hours</span>
                </div>
            </div>

            <div className="w-full bg-card border border-border rounded-lg p-3" style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height={120} minWidth={0}>
                    <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                        <XAxis
                            dataKey="hour"
                            tickFormatter={(hour) => hour % 6 === 0 ? `${hour.toString().padStart(2, '0')}:00` : ''}
                            tick={{ fill: labelColor, fontSize: 10 }}
                            axisLine={{ stroke: borderColor }}
                            tickLine={false}
                            interval={0}
                        />

                        {/* Allowed hours shaded background */}
                        {startHour <= endHour ? (
                            <ReferenceArea
                                x1={startHour}
                                x2={endHour}
                                fill={allowedColor}
                                fillOpacity={0.4}
                                strokeOpacity={0}
                            />
                        ) : (
                            <>
                                {/* Before midnight */}
                                <ReferenceArea
                                    x1={startHour}
                                    x2={23}
                                    fill={allowedColor}
                                    fillOpacity={0.4}
                                    strokeOpacity={0}
                                />
                                {/* After midnight */}
                                <ReferenceArea
                                    x1={0}
                                    x2={endHour}
                                    fill={allowedColor}
                                    fillOpacity={0.4}
                                    strokeOpacity={0}
                                />
                            </>
                        )}

                        {/* Boundary lines for allowed window */}
                        <ReferenceLine
                            x={startHour}
                            stroke={allowedColor}
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            strokeOpacity={0.8}
                            label={{
                                value: `Start: ${allowedStart}`,
                                position: 'top',
                                fill: allowedColor,
                                fontSize: 10,
                                dy: -10
                            }}
                        />
                        <ReferenceLine
                            x={endHour}
                            stroke={allowedColor}
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            strokeOpacity={0.8}
                            label={{
                                value: `End: ${allowedEnd}`,
                                position: 'top',
                                fill: allowedColor,
                                fontSize: 10,
                                dy: -10
                            }}
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
                                    fill={entry.usage > 0 ? activityColor : 'transparent'}
                                    opacity={0.9}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

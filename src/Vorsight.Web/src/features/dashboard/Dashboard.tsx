import { type StatusResponse } from '../../api/client';
import { HealthStats } from './HealthStats';
import { ActivityStats } from './ActivityStats';
import { ActivityMonitor } from './ActivityMonitor';
import { AuditAlert } from './AuditAlert';
import { SystemControls } from '../controls/SystemControls';
import { ScreenshotViewer } from './ScreenshotViewer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

interface DashboardProps {
    status: StatusResponse;
}

export function Dashboard({ status }: DashboardProps) {
    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Top Section: Main grid */}
            <div className="grid grid-cols-12 gap-6">
                {/* Main View (Left/Center) */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    {/* Row 1: Health & Current Activity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {status.health && <HealthStats health={status.health} uptime={status.uptime} />}
                        <ActivityMonitor activity={status.activity} />
                    </div>
                    {/* Row 2: Timeline & Top Apps (Side-by-side via ActivityStats grid) */}
                    <ActivityStats />
                </div>

                {/* Side Panel (Right) */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    {/* Visual Feed Thumbnail */}
                    <div className="flex-none h-48 lg:h-56">
                        <ScreenshotViewer />
                    </div>

                    {/* System Controls */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg tracking-wide text-primary">SYSTEM CONTROL</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SystemControls />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom Section: Full-width Audit Log */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm tracking-wide text-primary">AUDIT LOG</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <AuditAlert />
                </CardContent>
            </Card>
        </div>
    );
}

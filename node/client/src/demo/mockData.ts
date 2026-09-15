import type { Machine } from '@/context/MachineContext';
import type { AgentSettings, ActivitySummary, PaginatedScreenshots } from '@/api/types';
import type { AuditEvent } from '@/hooks/useAudit';

export const INITIAL_MACHINES: Machine[] = [
    {
        id: 'machine-gaming-01',
        name: 'Living-Room-Gaming-Rig',
        displayName: 'Living Room Gaming PC (Win 11)',
        hostname: 'GAMING-RIG-WIN11',
        ipAddress: '192.168.1.105',
        isOnline: true,
        connectionStatus: 'online',
        pingStatus: 'Reachable',
        pingLatency: 12,
        statusText: 'Active - Roblox & Minecraft Session',
        lastSeen: new Date().toISOString(),
        status: 'active'
    },
    {
        id: 'machine-kids-02',
        name: 'Kids-Study-PC',
        displayName: 'Kids Study & Gaming Desktop',
        hostname: 'KIDS-DESKTOP-WIN11',
        ipAddress: '192.168.1.112',
        isOnline: true,
        connectionStatus: 'online',
        pingStatus: 'Reachable',
        pingLatency: 18,
        statusText: 'Active - Homework & Scratch Coding',
        lastSeen: new Date().toISOString(),
        status: 'active'
    },
    {
        id: 'machine-family-03',
        name: 'Kitchen-Family-Hub',
        displayName: 'Kitchen Family Terminal',
        hostname: 'FAMILY-HUB-LINUX',
        ipAddress: '10.0.1.20',
        isOnline: false,
        connectionStatus: 'offline',
        pingStatus: 'Unreachable',
        statusText: 'Offline',
        lastSeen: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        status: 'active'
    },
    {
        id: 'machine-pending-04',
        name: 'Bedroom-Smart-TV-Box',
        displayName: 'Bedroom Streaming Box',
        hostname: 'SMART-BOX-TV',
        ipAddress: '192.168.1.189',
        isOnline: false,
        connectionStatus: 'offline',
        statusText: 'Awaiting Adoption',
        lastSeen: null,
        status: 'pending'
    }
];

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
    screenshots: {
        enabled: true,
        intervalSeconds: 120,
        filterDuplicates: true
    },
    activity: {
        enabled: true,
        intervalSeconds: 15
    },
    audit: {
        enabled: true,
        filters: {
            security: true,
            system: true,
            application: false
        }
    },
    accessControl: {
        enabled: false,
        scheduleMode: 'simple',
        violationAction: 'logoff',
        schedule: []
    }
};

export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
    {
        id: 1,
        machineId: 'machine-gaming-01',
        eventId: '4624',
        eventType: 'Security',
        username: 'Alex_Gamer',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        details: 'User Alex_Gamer successfully logged on to Living Room Gaming PC (PIN Logon)',
        sourceLogName: 'Security',
        isFlagged: false,
        acknowledged: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    {
        id: 2,
        machineId: 'machine-gaming-01',
        eventId: '7045',
        eventType: 'System',
        username: 'SYSTEM',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        details: 'Parental control schedule check completed: Screen time active (2h remaining)',
        sourceLogName: 'System',
        isFlagged: true,
        acknowledged: false,
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    },
    {
        id: 3,
        machineId: 'machine-kids-02',
        eventId: '1102',
        eventType: 'Security',
        username: 'Kids_Play',
        timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        details: 'Windows Firewall rule updated: Allowed Minecraft LAN server port 25565',
        sourceLogName: 'Security',
        isFlagged: true,
        acknowledged: false,
        createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString()
    },
    {
        id: 4,
        machineId: 'machine-kids-02',
        eventId: '4625',
        eventType: 'Security',
        username: 'Kids_Play',
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        details: 'Web filter rule triggered: Content category filter active during study hours',
        sourceLogName: 'Security',
        isFlagged: true,
        acknowledged: false,
        createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    },
    {
        id: 5,
        machineId: 'machine-family-03',
        eventId: '4624',
        eventType: 'Security',
        username: 'Mom_Home',
        timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        details: 'User Mom_Home logged on to Kitchen Family Terminal',
        sourceLogName: 'Security',
        isFlagged: false,
        acknowledged: true,
        createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString()
    }
];

export const INITIAL_MOCK_LOGS = [
    { id: 1, timestamp: new Date(Date.now() - 60000).toISOString(), level: 'info', message: 'Vorsight Agent Host service running (v1.6.0)', source: 'AgentHost' },
    { id: 2, timestamp: new Date(Date.now() - 180000).toISOString(), level: 'info', message: 'Screenshot capture service active', source: 'ScreenshotService' },
    { id: 3, timestamp: new Date(Date.now() - 360000).toISOString(), level: 'info', message: 'Screen time schedule monitoring active', source: 'AccessControl' }
];

export const DEFAULT_CLEANUP_SETTINGS = {
    activityRetentionDays: 90,
    screenshotRetentionDays: 30,
    auditRetentionDays: 180,
    heartbeatRetentionHours: 48,
    deleteDriveFiles: true,
    lastCleanupRun: new Date(Date.now() - 86400000).toISOString()
};

// --- Per-Machine Data Generators ---

export function generateMockActivitySummary(machineId: string): ActivitySummary {
    if (machineId === 'machine-kids-02') {
        return {
            totalActiveHours: 3.2,
            timeline: [
                { hour: 9, activeMinutes: 15 },
                { hour: 10, activeMinutes: 40 },
                { hour: 11, activeMinutes: 50 },
                { hour: 14, activeMinutes: 45 },
                { hour: 15, activeMinutes: 30 }
            ],
            topApps: [
                { name: 'Scratch Coding Studio', percentage: 40 },
                { name: 'YouTube Kids', percentage: 35 },
                { name: 'Tynker Kids', percentage: 15 },
                { name: 'Math Practice App', percentage: 10 }
            ],
            lastActive: new Date().toISOString()
        };
    }

    if (machineId === 'machine-family-03') {
        return {
            totalActiveHours: 2.1,
            timeline: [
                { hour: 7, activeMinutes: 25 },
                { hour: 8, activeMinutes: 35 },
                { hour: 17, activeMinutes: 40 },
                { hour: 18, activeMinutes: 20 }
            ],
            topApps: [
                { name: 'Paprika Recipe Manager', percentage: 45 },
                { name: 'Spotify Family', percentage: 30 },
                { name: 'Family Calendar', percentage: 15 },
                { name: 'Weather Hub', percentage: 10 }
            ],
            lastActive: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        };
    }

    // Default for Gaming Rig (machine-gaming-01)
    return {
        totalActiveHours: 5.8,
        timeline: [
            { hour: 10, activeMinutes: 45 },
            { hour: 11, activeMinutes: 55 },
            { hour: 12, activeMinutes: 20 },
            { hour: 13, activeMinutes: 50 },
            { hour: 14, activeMinutes: 60 },
            { hour: 15, activeMinutes: 55 },
            { hour: 16, activeMinutes: 40 }
        ],
        topApps: [
            { name: 'Minecraft', percentage: 45 },
            { name: 'Roblox', percentage: 25 },
            { name: 'Discord (Gaming)', percentage: 18 },
            { name: 'Steam (Cyberpunk)', percentage: 12 }
        ],
        lastActive: new Date().toISOString()
    };
}

// SVG Placeholders tailored for each device type
const MINECRAFT_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="100%" height="100%" fill="%231e293b"/><rect x="40" y="40" width="880" height="60" rx="10" fill="%23334155"/><text x="70" y="78" fill="%234ade80" font-family="sans-serif" font-size="22" font-weight="bold">Minecraft 1.20 - Family Creative Realm</text><rect x="40" y="120" width="600" height="380" rx="10" fill="%230284c7"/><rect x="660" y="120" width="260" height="380" rx="10" fill="%230f172a"/><text x="680" y="160" fill="%2338bdf8" font-family="sans-serif" font-size="16" font-weight="bold">Players Online</text><text x="680" y="200" fill="%23f8fafc" font-family="sans-serif" font-size="14">🎮 Alex_Gamer (Host)</text><text x="680" y="230" fill="%23f8fafc" font-family="sans-serif" font-size="14">🎮 Kids_Play</text><rect x="680" y="320" width="220" height="150" rx="8" fill="%231e293b"/><text x="695" y="350" fill="%23e2e8f0" font-family="sans-serif" font-size="13">FPS: 144 | Ping: 12ms</text></svg>';
const ROBLOX_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="100%" height="100%" fill="%2318181b"/><rect x="40" y="40" width="880" height="60" rx="10" fill="%2327272a"/><text x="70" y="78" fill="%23f43f5e" font-family="sans-serif" font-size="22" font-weight="bold">Roblox - Pet Simulator 99</text><rect x="40" y="120" width="880" height="380" rx="10" fill="%2327272a"/><circle cx="480" cy="300" r="100" fill="%23e11d48"/><text x="390" y="308" fill="%23ffffff" font-family="sans-serif" font-size="24" font-weight="bold">ROBLOX GAME</text></svg>';
const SCRATCH_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="100%" height="100%" fill="%234c1d95"/><rect x="40" y="40" width="880" height="60" rx="10" fill="%235b21b6"/><text x="70" y="78" fill="%23fbbf24" font-family="sans-serif" font-size="22" font-weight="bold">Scratch 3.0 - Kids Block Coding Studio</text><rect x="40" y="120" width="500" height="380" rx="10" fill="%236d28d9"/><rect x="560" y="120" width="360" height="380" rx="10" fill="%23312e81"/><text x="590" y="160" fill="%23fbbf24" font-family="sans-serif" font-size="16" font-weight="bold">Code Blocks: Motion &amp; Sounds</text></svg>';
const YOUTUBE_KIDS_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="100%" height="100%" fill="%237f1d1d"/><rect x="40" y="40" width="880" height="60" rx="10" fill="%23991b1b"/><text x="70" y="78" fill="%23ffffff" font-family="sans-serif" font-size="22" font-weight="bold">YouTube Kids - Science Experiments</text><rect x="40" y="120" width="880" height="380" rx="10" fill="%23b91c1c"/><text x="360" y="300" fill="%23ffffff" font-family="sans-serif" font-size="28" font-weight="bold">▶ Educational Science Video</text></svg>';
const RECIPES_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="100%" height="100%" fill="%23064e3b"/><rect x="40" y="40" width="880" height="60" rx="10" fill="%23047857"/><text x="70" y="78" fill="%23a7f3d0" font-family="sans-serif" font-size="22" font-weight="bold">Paprika Recipes - Weekly Dinner Planner</text><rect x="40" y="120" width="880" height="380" rx="10" fill="%23065f46"/><text x="70" y="160" fill="%23ecfdf5" font-family="sans-serif" font-size="18">Monday: Homemade Pizza Night</text><text x="70" y="200" fill="%23ecfdf5" font-family="sans-serif" font-size="18">Tuesday: Spaghetti &amp; Salad</text></svg>';
const DISNEY_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="100%" height="100%" fill="%23090d16"/><rect x="40" y="40" width="880" height="60" rx="10" fill="%23111827"/><text x="70" y="78" fill="%2338bdf8" font-family="sans-serif" font-size="22" font-weight="bold">Disney+ - Movie Night Stream</text><rect x="40" y="120" width="880" height="380" rx="10" fill="%231e1b4b"/><text x="360" y="300" fill="%23818cf8" font-family="sans-serif" font-size="28" font-weight="bold">▶ Playing 4K HDR</text></svg>';

export function generateMockScreenshots(machineId: string): PaginatedScreenshots {
    if (machineId === 'machine-kids-02') {
        return {
            screenshots: [
                {
                    id: 'sc-kids-1',
                    name: 'screenshot_scratch_coding.png',
                    createdTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                    webViewLink: SCRATCH_SVG,
                    thumbnailLink: SCRATCH_SVG
                },
                {
                    id: 'sc-kids-2',
                    name: 'screenshot_youtube_kids.png',
                    createdTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
                    webViewLink: YOUTUBE_KIDS_SVG,
                    thumbnailLink: YOUTUBE_KIDS_SVG
                }
            ],
            hasMore: false,
            cursor: null
        };
    }

    if (machineId === 'machine-family-03') {
        return {
            screenshots: [
                {
                    id: 'sc-family-1',
                    name: 'screenshot_kitchen_recipes.png',
                    createdTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
                    webViewLink: RECIPES_SVG,
                    thumbnailLink: RECIPES_SVG
                }
            ],
            hasMore: false,
            cursor: null
        };
    }

    // Default for Gaming Rig (machine-gaming-01)
    return {
        screenshots: [
            {
                id: 'sc-1',
                name: 'screenshot_minecraft_world.png',
                createdTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
                webViewLink: MINECRAFT_SVG,
                thumbnailLink: MINECRAFT_SVG
            },
            {
                id: 'sc-2',
                name: 'screenshot_roblox_game.png',
                createdTime: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
                webViewLink: ROBLOX_SVG,
                thumbnailLink: ROBLOX_SVG
            },
            {
                id: 'sc-3',
                name: 'screenshot_disney_stream.png',
                createdTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
                webViewLink: DISNEY_SVG,
                thumbnailLink: DISNEY_SVG
            }
        ],
        hasMore: false,
        cursor: null
    };
}

export function generateMockActivityLogs(machineId: string, limit: number = 100, offset: number = 0) {
    if (offset >= 200) return [];
    const baseTime = Date.now() - offset * 120000;

    let apps = [
        { window: 'Minecraft 1.20.4 - Family Creative Realm', process: 'Minecraft.exe', user: 'Alex_Gamer' },
        { window: 'Roblox Player - Pet Simulator 99', process: 'RobloxPlayerBeta.exe', user: 'Kids_Play' },
        { window: 'Discord - #minecraft-squad', process: 'Discord.exe', user: 'Alex_Gamer' },
        { window: 'Steam - Cyberpunk 2077', process: 'steam.exe', user: 'Alex_Gamer' }
    ];

    if (machineId === 'machine-kids-02') {
        apps = [
            { window: 'Scratch 3.0 - Kids Block Coding Studio', process: 'chrome.exe', user: 'Kids_Play' },
            { window: 'YouTube Kids - Lego Stop Motion Animation', process: 'chrome.exe', user: 'Kids_Play' },
            { window: 'Tynker - Kids Coding Practice', process: 'msedge.exe', user: 'Kids_Play' },
            { window: 'Khan Academy Kids - Math Adventure', process: 'chrome.exe', user: 'Kids_Play' }
        ];
    } else if (machineId === 'machine-family-03') {
        apps = [
            { window: 'Paprika Recipe Manager - Dinner Recipes', process: 'Paprika.exe', user: 'Mom_Home' },
            { window: 'Spotify Family - Cooking Playlist', process: 'Spotify.exe', user: 'Mom_Home' },
            { window: 'Google Calendar - Family Schedule', process: 'chrome.exe', user: 'Mom_Home' },
            { window: 'Local Weather & News Hub', process: 'browser.exe', user: 'Mom_Home' }
        ];
    }

    const logs = [];
    const count = Math.min(limit, 20);
    for (let i = 0; i < count; i++) {
        const app = apps[i % apps.length];
        logs.push({
            id: offset + i + 1,
            machine_id: machineId,
            timestamp: new Date(baseTime - i * 180000).toISOString(),
            active_window: app.window,
            process_name: app.process,
            duration: Math.floor(60 + (i * 43) % 900),
            username: app.user
        });
    }
    return logs;
}

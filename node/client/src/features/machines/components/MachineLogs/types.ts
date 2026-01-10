export interface LogEntry {
    id: number;
    timestamp: string;
    level: string;
    message: string;
    exception?: string;
    sourceContext?: string;
}

export type LogLevel = 'all' | 'information' | 'warning' | 'error';

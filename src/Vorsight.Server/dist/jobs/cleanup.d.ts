interface CleanupStats {
    activityDeleted: number;
    screenshotsDeleted: number;
    auditsDeleted: number;
}
export declare function performCleanup(): Promise<CleanupStats>;
export declare function scheduleCleanup(): void;
export {};
//# sourceMappingURL=cleanup.d.ts.map
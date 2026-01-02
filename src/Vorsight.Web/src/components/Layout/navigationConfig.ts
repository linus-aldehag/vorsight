export interface NavigationTab {
    id: string;
    label: string;
    icon: 'dashboard' | 'activity' | 'gallery' | 'audit' | 'control';
    title: string;
}

export const navigationTabs: NavigationTab[] = [
    {
        id: 'dashboard',
        label: 'DASHBOARD',
        icon: 'dashboard',
        title: 'Dashboard'
    },
    {
        id: 'activity',
        label: 'ACTIVITY',
        icon: 'activity',
        title: 'Activity'
    },
    {
        id: 'gallery',
        label: 'SCREENSHOTS',
        icon: 'gallery',
        title: 'Screenshots'
    },
    {
        id: 'audit',
        label: 'AUDIT',
        icon: 'audit',
        title: 'Audit'
    },
    {
        id: 'control',
        label: 'ACCESS CONTROL',
        icon: 'control',
        title: 'Access Control'
    }
];

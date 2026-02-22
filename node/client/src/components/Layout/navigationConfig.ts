import { LayoutDashboard, Activity as ActivityIcon, ImageIcon, Shield, Lock, Settings } from 'lucide-react';

export type NavigationIcon = 'dashboard' | 'activity' | 'gallery' | 'audit' | 'control' | 'settings';

export interface NavigationTab {
    id: string;
    label: string;
    icon: NavigationIcon;
    title: string;
}

export const iconMap: Record<NavigationIcon, any> = {
    dashboard: LayoutDashboard,
    activity: ActivityIcon,
    gallery: ImageIcon,
    audit: Shield,
    control: Lock,
    settings: Settings
};

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
    },
    {
        id: 'features',
        label: 'FEATURES',
        icon: 'settings',
        title: 'Features'
    }
];

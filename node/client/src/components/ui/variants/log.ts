import { cva } from 'class-variance-authority';

export const logRowVariants = cva(
    "text-xs border-b-border/40 transition-colors",
    {
        variants: {
            level: {
                default: "hover:bg-muted/50",
                information: "hover:bg-muted/50",
                warning: "bg-amber-500/5 hover:bg-amber-500/10",
                error: "bg-red-500/5 hover:bg-red-500/10",
                fatal: "bg-red-500/10 hover:bg-red-500/20",
                // Mappings for Audit Events (can map to colors)
                success: "bg-green-500/5 hover:bg-green-500/10",
                flagged: "bg-destructive/10 hover:bg-destructive/20 border-l-2 border-l-destructive",
            },
        },
        defaultVariants: {
            level: "default",
        },
    }
);

export const toolbarControlVariants = cva(
    "h-8 bg-background/50 border rounded text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary/50",
    {
        variants: {
            variant: {
                default: "",
                search: "w-[200px] px-2.5",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export const auditCardVariants = cva(
    "flex flex-col gap-2 p-3 rounded-lg border transition-colors",
    {
        variants: {
            variant: {
                default: "bg-muted/10 border-border/20 hover:bg-muted/20", // Fallback
                flagged: "bg-destructive/10 border-destructive/20 hover:bg-destructive/15 text-destructive", // Flagged/Security alert
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const logToggleVariants = cva(
    "h-7 text-xs px-2.5 transition-all transition-colors duration-200",
    {
        variants: {
            level: {
                information: "hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400",
                warning: "hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400",
                error: "hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400",
            },
            active: {
                true: "",
                false: "text-muted-foreground hover:text-foreground bg-transparent",
            },
        },
        compoundVariants: [
            {
                level: "information",
                active: true,
                class: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
            },
            {
                level: "warning",
                active: true,
                class: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
            },
            {
                level: "error",
                active: true,
                class: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
            },
        ],
        defaultVariants: {
            level: "information",
            active: false,
        },
    }
);

interface LogFilterToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof logToggleVariants> {
    level: "information" | "warning" | "error";
    isActive: boolean;
    onToggle: () => void;
    label?: string;
}

export function LogFilterToggle({ level, isActive, onToggle, label, className, ...props }: LogFilterToggleProps) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(logToggleVariants({ level, active: isActive }), className)}
            {...props}
        >
            {label || level.charAt(0).toUpperCase() + level.slice(1)}
        </Button>
    );
}

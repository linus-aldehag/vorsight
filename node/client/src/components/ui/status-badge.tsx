import { type HTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, AlertTriangle, type LucideIcon } from "lucide-react"

const statusBadgeVariants = cva(
    "flex items-center gap-2 transition-opacity",
    {
        variants: {
            status: {
                online: "text-success",
                unstable: "text-warning",
                reachable: "text-warning",
                offline: "text-muted-foreground",
                warning: "text-warning",
                error: "text-destructive",
            },
        },
        defaultVariants: {
            status: "offline",
        },
    }
)

const dotVariants = cva("relative inline-flex rounded-full h-3 w-3", {
    variants: {
        status: {
            online: "bg-success",
            unstable: "bg-warning",
            reachable: "bg-warning",
            offline: "bg-muted",
            warning: "bg-warning",
            error: "bg-destructive",
        },
        pulse: {
            true: "animate-none", // Base dot doesn't animate, the outer one does
            false: "",
        },
    },
    defaultVariants: {
        status: "offline",
        pulse: false,
    },
})

const pulseVariants = cva(
    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
    {
        variants: {
            status: {
                online: "bg-success",
                unstable: "bg-warning",
                reachable: "bg-warning",
                offline: "bg-muted",
                warning: "bg-warning",
                error: "bg-destructive",
            },
        },
        defaultVariants: {
            status: "offline",
        },
    }
)

const badgeVariants = cva("text-xs font-mono border-current flex items-center gap-1", {
    variants: {
        status: {
            online: "text-success border-success/50",
            unstable: "text-warning border-warning/50",
            reachable: "text-warning border-warning/50",
            offline: "text-muted-foreground border-muted",
            warning: "text-warning border-warning/50",
            error: "text-destructive border-destructive/50",
        },
    },
    defaultVariants: {
        status: "offline",
    },
})

export type StatusValue = "online" | "unstable" | "reachable" | "offline" | "warning" | "error"

export interface StatusBadgeProps
    extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
    status: StatusValue
    statusText?: string
    showPulse?: boolean
    pulseOpacity?: number
    icon?: LucideIcon
}

export function StatusBadge({
    className,
    status,
    statusText,
    showPulse,
    pulseOpacity,
    icon: Icon,
    onClick,
    ...props
}: StatusBadgeProps) {
    const shouldPulse = showPulse ?? (status !== "offline" && status !== "reachable")

    const DisplayIcon = Icon || (status === "error" ? AlertCircle : status === "warning" ? AlertTriangle : undefined)

    const label = status === "error" ? "ATTENTION" : status.toUpperCase()

    return (
        <div
            className={cn(statusBadgeVariants({ status }), onClick && "cursor-pointer hover:opacity-80", className)}
            onClick={onClick}
            {...props}
        >
            <span className="relative flex h-3 w-3 shrink-0">
                {shouldPulse && (
                    <span
                        className={cn(pulseVariants({ status }))}
                        style={{ opacity: pulseOpacity !== undefined ? pulseOpacity * 0.75 : 0.75 }}
                    />
                )}
                <span className={cn(dotVariants({ status }))} />
            </span>
            <Badge variant="outline" className={cn(badgeVariants({ status }))}>
                {DisplayIcon && <DisplayIcon className="h-3 w-3" />}
                {label}
            </Badge>
            {statusText && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                    {statusText}
                </span>
            )}
        </div>
    )
}

import React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { type Period, display12HourValue, setDateByType } from "./time-picker-utils";

export interface PeriodSelectorProps {
    period: Period;
    setPeriod: (m: Period) => void;
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    onRightFocus?: () => void;
    onLeftFocus?: () => void;
}

export const PeriodSelector = React.forwardRef<
    HTMLButtonElement,
    PeriodSelectorProps
>(({ period, setPeriod, date, setDate, onLeftFocus, onRightFocus }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === "ArrowRight") onRightFocus?.();
        if (e.key === "ArrowLeft") onLeftFocus?.();
    };

    const handleValueChange = (value: Period) => {
        setPeriod(value);

        /**
         * trigger an update whenever the user switches between AM and PM;
         * otherwise user must manually change the hour each time
         */
        if (date) {
            const tempDate = new Date(date);
            const hours = display12HourValue(date.getHours());
            setDate(
                setDateByType(
                    tempDate,
                    hours.toString(),
                    "12hours",
                    period === "AM" ? "PM" : "AM"
                )
            );
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    ref={ref}
                    variant="outline"
                    className="w-[65px] focus:bg-accent focus:text-accent-foreground"
                    onKeyDown={handleKeyDown}
                >
                    {period}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleValueChange("AM")}>
                    AM
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleValueChange("PM")}>
                    PM
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

PeriodSelector.displayName = "PeriodSelector";

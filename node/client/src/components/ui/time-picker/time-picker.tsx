import React from "react";
import { TimePickerInput } from "./time-picker-input";
import { PeriodSelector } from "./period-select";
import { type Period } from "./time-picker-utils";
import { useSettings } from "@/context/SettingsContext";
import { cn } from "@/lib/utils";

interface TimePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    className?: string;
}

export function TimePicker({ date, setDate, className }: TimePickerProps) {
    const { timeFormat } = useSettings();
    const format = timeFormat === '12h' ? '12' : '24';

    const [period, setPeriod] = React.useState<Period>("PM");

    const minuteRef = React.useRef<HTMLInputElement>(null);
    const hourRef = React.useRef<HTMLInputElement>(null);
    const secondRef = React.useRef<HTMLInputElement>(null);
    const periodRef = React.useRef<HTMLButtonElement>(null);

    // Sync period with date
    React.useEffect(() => {
        if (date) {
            if (date.getHours() >= 12) {
                setPeriod("PM");
            } else {
                setPeriod("AM");
            }
        }
    }, [date]);

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <TimePickerInput
                picker={format === "12" ? "12hours" : "hours"}
                period={period}
                date={date}
                setDate={setDate}
                ref={hourRef}
                onRightFocus={() => minuteRef.current?.focus()}
            />
            <span className="text-sm text-muted-foreground">:</span>
            <TimePickerInput
                picker="minutes"
                date={date}
                setDate={setDate}
                ref={minuteRef}
                onLeftFocus={() => hourRef.current?.focus()}
                onRightFocus={() => secondRef.current?.focus()}
            />

            {format === "12" && (
                <div className="ml-1">
                    <PeriodSelector
                        period={period}
                        setPeriod={setPeriod}
                        date={date}
                        setDate={setDate}
                        ref={periodRef}
                        onLeftFocus={() => minuteRef.current?.focus()}
                    />
                </div>
            )}
        </div>
    );
}

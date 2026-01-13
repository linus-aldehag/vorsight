import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface TimeInputProps {
    value: string; // HH:mm format
    onChange: (value: string) => void;
    className?: string;
}

export function TimeInput({ value, onChange, className }: TimeInputProps) {
    const { timeFormat } = useSettings();
    const use12HourFormat = timeFormat === '12h';

    const hourRef = useRef<HTMLInputElement>(null);
    const minuteRef = useRef<HTMLInputElement>(null);
    const [localHours, setLocalHours] = useState('');
    const [localMinutes, setLocalMinutes] = useState('');
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

    // Parse value on mount/update to set initial local state
    useEffect(() => {
        if (!value) {
            setLocalHours('');
            setLocalMinutes('');
            return;
        }
        const [hStr, mStr] = value.split(':');
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);

        if (isNaN(h) || isNaN(m)) return;

        if (use12HourFormat) {
            const tempPeriod = h >= 12 ? 'PM' : 'AM';
            let displayH = h % 12;
            if (displayH === 0) displayH = 12;

            setLocalHours(displayH.toString().padStart(2, '0'));
            setLocalMinutes(m.toString().padStart(2, '0'));
            setPeriod(tempPeriod);
        } else {
            setLocalHours(h.toString().padStart(2, '0'));
            setLocalMinutes(m.toString().padStart(2, '0'));
        }
    }, [value, use12HourFormat]);

    const commitTime = (hStr: string, mStr: string, p: 'AM' | 'PM') => {
        let h = parseInt(hStr, 10);
        let m = parseInt(mStr, 10);

        if (isNaN(h)) h = 0;
        if (isNaN(m)) m = 0;

        // Clamp
        if (use12HourFormat) {
            // Hours 1-12 allowed
        } else {
            if (h > 23) h = 23;
        }
        if (m > 59) m = 59;

        // Convert to 24h for storage
        let finalH = h;
        if (use12HourFormat) {
            if (p === 'PM' && h < 12) finalH += 12;
            if (p === 'AM' && h === 12) finalH = 0;
        }

        const commitVal = `${finalH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        onChange(commitVal);
    };

    const handleHourChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!/^\d*$/.test(val)) return;

        setLocalHours(val);

        if (val.length === 2) {
            minuteRef.current?.focus();
        }
    };

    const handleMinuteChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!/^\d*$/.test(val)) return;
        setLocalHours(localHours);
        setLocalMinutes(val);
    };

    const handleBlur = () => {
        let hStr = localHours || '00';
        let mStr = localMinutes || '00';

        let h = parseInt(hStr, 10);
        let m = parseInt(mStr, 10);

        const MaxHour = use12HourFormat ? 12 : 23;
        if (h > MaxHour) h = MaxHour;
        if (h < 0) h = 0;
        if (use12HourFormat && h === 0) h = 12;

        if (m > 59) m = 59;

        const finalHStr = h.toString().padStart(2, '0');
        const finalMStr = m.toString().padStart(2, '0');

        setLocalHours(finalHStr);
        setLocalMinutes(finalMStr);

        commitTime(finalHStr, finalMStr, period);
    };

    const togglePeriod = () => {
        const newP = period === 'AM' ? 'PM' : 'AM';
        setPeriod(newP);
        commitTime(localHours, localMinutes, newP);
    };

    const handleKeyDown = (e: KeyboardEvent, field: 'hour' | 'minute') => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const isUp = e.key === 'ArrowUp';


            if (field === 'hour') {
                let h = parseInt(localHours || '0', 10);
                if (use12HourFormat) {
                    h = isUp ? h + 1 : h - 1;
                    if (h > 12) h = 1;
                    if (h < 1) h = 12;
                } else {
                    h = isUp ? h + 1 : h - 1;
                    if (h > 23) h = 0;
                    if (h < 0) h = 23;
                }
                const newH = h.toString().padStart(2, '0');
                setLocalHours(newH);
            } else {
                let m = parseInt(localMinutes || '0', 10);
                m = isUp ? m + 1 : m - 1;
                if (m > 59) m = 0;
                if (m < 0) m = 59;
                setLocalMinutes(m.toString().padStart(2, '0'));
            }
        }
        if (e.key === 'Enter') {
            hourRef.current?.blur();
            minuteRef.current?.blur();
        }
    };

    return (
        <div className={cn("flex items-center border border-input rounded-md bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
            <div className="flex items-center flex-1 justify-center px-1">
                <Input
                    ref={hourRef}
                    value={localHours}
                    onChange={handleHourChange}
                    onBlur={handleBlur}
                    onKeyDown={(e) => handleKeyDown(e, 'hour')}
                    className="w-[2rem] p-0 text-center border-none shadow-none focus-visible:ring-0 h-8 font-mono bg-transparent"
                    placeholder="HH"
                    maxLength={2}
                />
                <span className="text-muted-foreground font-mono">:</span>
                <Input
                    ref={minuteRef}
                    value={localMinutes}
                    onChange={handleMinuteChange}
                    onBlur={handleBlur}
                    onKeyDown={(e) => handleKeyDown(e, 'minute')}
                    className="w-[2rem] p-0 text-center border-none shadow-none focus-visible:ring-0 h-8 font-mono bg-transparent"
                    placeholder="MM"
                    maxLength={2}
                />
            </div>

            {use12HourFormat ? (
                <button
                    type="button"
                    onClick={togglePeriod}
                    className="bg-muted/50 hover:bg-muted h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground border-l border-input transition-colors focus:outline-none rounded-r-md"
                >
                    {period}
                </button>
            ) : (
                <div className="h-8 w-8 flex items-center justify-center text-muted-foreground border-l border-input bg-muted/20 rounded-r-md">
                    <Clock className="h-4 w-4 opacity-50" />
                </div>
            )}
        </div>
    );
}

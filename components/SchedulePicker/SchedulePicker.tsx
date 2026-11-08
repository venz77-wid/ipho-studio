import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, CheckCircle2, Calendar } from 'lucide-react';
import type { TimeSlot } from '@/lib/bookingTypes';
import {
    studioSlots,
    calculateEndTime,
    getStudioNow,
    isSlotInPast,
} from '@/lib/scheduleUtils';
import styles from './SchedulePicker.module.css';

interface SchedulePickerProps {
    selectedDate: string;
    onSelectDate: (date: string) => void;
    selectedSlot: TimeSlot | null;
    onSelectSlot: (slot: TimeSlot) => void;
    durationMinutes: number;
    availableStartTimes: string[];
    availabilityLoading: boolean;
    availabilityError: boolean;
    onRetryAvailability: () => void;
}

const pad = (n: number): string => String(n).padStart(2, '0');
const toDateStr = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Baca 'YYYY-MM-DD' sebagai tanggal lokal (new Date('YYYY-MM-DD') dibaca sebagai UTC)
const parseDate = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
};

export default function SchedulePicker({
    selectedDate,
    onSelectDate,
    selectedSlot,
    onSelectSlot,
    durationMinutes,
    availableStartTimes,
    availabilityLoading,
    availabilityError,
    onRetryAvailability,
}: SchedulePickerProps) {
    const today = getStudioNow().date;

    const [viewDate, setViewDate] = useState(() => {
        const d = parseDate(selectedDate || today);
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const currentMonthLabel = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const formattedSelectedDate = useMemo(() => {
        if (!selectedDate) return '';
        return parseDate(selectedDate).toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
    }, [selectedDate]);

    // Bulan sebelum bulan ini tidak bisa dibuka
    const todayDate = parseDate(today);
    const canGoPrev =
        viewDate.getFullYear() * 12 + viewDate.getMonth() > todayDate.getFullYear() * 12 + todayDate.getMonth();

    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Senin = 0
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;

        return Array.from({ length: total }, (_, i) => {
            const d = new Date(year, month, 1 - startOffset + i);
            return { num: d.getDate(), isCurrent: d.getMonth() === month, date: toDateStr(d) };
        });
    }, [viewDate]);

    // Jam selesai dihitung dari durasi paket; status tiap jam ditentukan di bawah
    const slots = useMemo(() => {
        return studioSlots(selectedDate).map((s) => {
            const endTime = calculateEndTime(s.startTime, durationMinutes);
            const past = isSlotInPast(selectedDate, s.startTime);
            const booked = !past && !availableStartTimes.includes(s.startTime);
            const slot: TimeSlot = {
                id: s.id,
                startTime: s.startTime,
                endTime,
                period: s.period,
                isAvailable: !past && !booked,
                reason: past ? 'past' : booked ? 'booked' : undefined,
            };
            return slot;
        });
    }, [durationMinutes, selectedDate, availableStartTimes]);

    const handlePrevMonth = () => {
        if (canGoPrev) setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    return (
        <div className={styles.container}>
            <div className={styles.sectionHeader}>
                <div className={styles.titleWrapper}>
                    <div className={styles.badgeNumber}>01</div>
                    <div>
                        <h2 className={styles.title}>Pilih Jadwal Sesi Studio</h2>
                        <p className={styles.subtitle}>Pilih tanggal dan jam sesi (WITA). Ruangan ditetapkan saat pesanan dibuat.</p>
                    </div>
                </div>
                <span className={styles.monthIndicator}>{currentMonthLabel.toUpperCase()}</span>
            </div>

            <div className={styles.calendarBox}>
                <div className={styles.calendarTop}>
                    <div className={styles.calendarTitle}>
                        <Calendar size={18} />
                        <span style={{ textTransform: 'capitalize' }}>{currentMonthLabel}</span>
                    </div>
                    <div className={styles.calendarNav}>
                        <button type="button" onClick={handlePrevMonth} disabled={!canGoPrev} className={styles.navBtn} aria-label="Bulan sebelumnya">
                            <ChevronLeft size={16} />
                        </button>
                        <button type="button" onClick={handleNextMonth} className={styles.navBtn} aria-label="Bulan berikutnya">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className={styles.daysHeader}>
                    <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span>
                    <span className={styles.weekend}>Sab</span><span className={styles.weekend}>Min</span>
                </div>

                <div className={styles.daysGrid}>
                    {calendarDays.map((day) => {
                        const isPast = day.date < today;
                        const isDisabled = !day.isCurrent || isPast;
                        const isSelected = day.date === selectedDate;
                        return (
                            <button
                                type="button"
                                key={day.date}
                                onClick={() => !isDisabled && onSelectDate(day.date)}
                                className={`${styles.dayBtn} ${isDisabled ? styles.dayDisabled : ''} ${isSelected ? styles.daySelected : ''}`}
                                disabled={isDisabled}
                            >
                                {day.num}
                                {isSelected && <div className={styles.selectedDot} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={styles.slotContainer}>
                <div className={styles.slotTop}>
                    <h3 className={styles.slotTitle}>Pilih Sesi Jam ({formattedSelectedDate})</h3>
                    <span className={styles.slotDuration}>Sesi {durationMinutes} Menit</span>
                </div>

                {availabilityLoading && <p role="status">Memeriksa ketersediaan jadwal…</p>}
                {availabilityError && (
                    <div role="alert">
                        <p>Jadwal belum bisa dimuat.</p>
                        <button type="button" onClick={onRetryAvailability}>Coba lagi</button>
                    </div>
                )}
                {!availabilityLoading && !availabilityError && <div className={styles.slotsGrid}>
                    {slots.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id;

                        if (!slot.isAvailable) {
                            return (
                                <div key={slot.id} className={`${styles.slotCard} ${styles.slotBooked}`}>
                                    <div className={styles.slotTimeRow}>
                                        <span className={styles.timeText}>{slot.startTime} - {slot.endTime}</span>
                                        <Lock size={16} className={styles.lockIcon} />
                                    </div>
                                    <div className={styles.slotFooter}>
                                        <span className={styles.statusTextBooked}>
                                            {slot.reason === 'past' ? 'Sudah Lewat' : 'Tidak Tersedia'}
                                        </span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={slot.id}
                                onClick={() => onSelectSlot(slot)}
                                className={`${styles.slotCard} ${isSelected ? styles.slotSelected : ''}`}
                            >
                                <div className={styles.slotTimeRow}>
                                    <span className={styles.timeText}>{slot.startTime} - {slot.endTime}</span>
                                    {isSelected ? (
                                        <CheckCircle2 size={18} className={styles.checkIcon} />
                                    ) : (
                                        <span className={styles.periodTag}>{slot.period}</span>
                                    )}
                                </div>
                                <div className={styles.slotFooter}>
                                    <div className={styles.statusWrapper}>
                                        <div className={`${styles.dot} ${isSelected ? styles.dotSelected : ''}`} />
                                        <span className={isSelected ? styles.statusTextSelected : styles.statusText}>
                                            {isSelected ? 'Terpilih (Slot Anda)' : 'Tersedia'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>}
            </div>
        </div>
    );
}
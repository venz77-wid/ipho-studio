import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Lock, CheckCircle2, Calendar } from 'lucide-react';
import type { TimeSlot } from '@/lib/bookingTypes';
import styles from './SchedulePicker.module.css';

interface SchedulePickerProps {
    selectedDate: string;
    onSelectDate: (date: string) => void;
    selectedSlot: TimeSlot | null;
    onSelectSlot: (slot: TimeSlot) => void;
    durationMinutes: number;
    bookedSlots: string[];
}

// 1. Kita hapus endTime statis, cukup simpan jam mulainya saja
const BASE_START_TIMES = [
    { id: '1', startTime: '10:00', period: 'Pagi' },
    { id: '2', startTime: '11:30', period: 'Pagi' },
    { id: '3', startTime: '13:30', period: 'Siang' },
    { id: '4', startTime: '15:00', period: 'Siang' },
    { id: '5', startTime: '16:30', period: 'Golden Hour' },
    { id: '6', startTime: '18:30', period: 'Malam' },
];

// 2. Fungsi sakti untuk menghitung jam selesai otomatis berdasarkan menit
const calculateEndTime = (start: string, duration: number) => {
    const [hours, minutes] = start.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
};

// Helper untuk format YYYY-MM-DD
const formatDateStr = (year: number, monthIndex: number, day: number) => {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export default function SchedulePicker({
    selectedDate,
    onSelectDate,
    selectedSlot,
    onSelectSlot,
    durationMinutes,
    bookedSlots,
}: SchedulePickerProps) {
    
    // State Kalender
    const [viewDate, setViewDate] = useState(() => {
        return selectedDate ? new Date(selectedDate) : new Date(2026, 9, 28);
    });

    const currentMonthLabel = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const formattedSelectedDate = useMemo(() => {
        if (!selectedDate) return '';
        const d = new Date(selectedDate);
        return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }, [selectedDate]);

    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const days = [];
        
        for (let i = 0; i < startingDay; i++) {
            const dayNum = daysInPrevMonth - startingDay + i + 1;
            days.push({ num: dayNum, isCurrent: false, date: formatDateStr(year, month - 1, dayNum) });
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ num: i, isCurrent: true, date: formatDateStr(year, month, i) });
        }
        
        const remainingSlots = (Math.ceil(days.length / 7) * 7) - days.length;
        for (let i = 1; i <= remainingSlots; i++) {
            days.push({ num: i, isCurrent: false, date: formatDateStr(year, month + 1, i) });
        }
        
        return days;
    }, [viewDate]);

    // 3. Gabungkan jam mulai dan hitung jam selesai secara reaktif
    const dynamicSlots = useMemo(() => {
        return BASE_START_TIMES.map(slot => ({
            ...slot,
            endTime: calculateEndTime(slot.startTime, durationMinutes)
        }));
    }, [durationMinutes]);

    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    return (
        <div className={styles.container}>
            {/* Header Bagian 01 */}
            <div className={styles.sectionHeader}>
                <div className={styles.titleWrapper}>
                    <div className={styles.badgeNumber}>01</div>
                    <div>
                        <h2 className={styles.title}>Pilih Jadwal Sesi Studio</h2>
                        <p className={styles.subtitle}>Pilih tanggal dan jam ketersediaan Studio Room A (Daylight Cyclorama)</p>
                    </div>
                </div>
                <span className={styles.monthIndicator}>{currentMonthLabel.toUpperCase()}</span>
            </div>

            {/* Box Kalender */}
            <div className={styles.calendarBox}>
                <div className={styles.calendarTop}>
                    <div className={styles.calendarTitle}>
                        <Calendar size={18} />
                        <span style={{ textTransform: 'capitalize' }}>{currentMonthLabel}</span>
                    </div>
                    <div className={styles.calendarNav}>
                        <button onClick={handlePrevMonth} className={styles.navBtn}><ChevronLeft size={16} /></button>
                        <button onClick={handleNextMonth} className={styles.navBtn}><ChevronRight size={16} /></button>
                    </div>
                </div>

                <div className={styles.daysHeader}>
                    <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span>
                    <span className={styles.weekend}>Sab</span><span className={styles.weekend}>Min</span>
                </div>

                <div className={styles.daysGrid}>
                    {calendarDays.map((day, idx) => {
                        const isSelected = day.date === selectedDate;
                        return (
                            <button
                                key={idx}
                                onClick={() => day.isCurrent && onSelectDate(day.date)}
                                className={`
                                    ${styles.dayBtn}
                                    ${!day.isCurrent ? styles.dayDisabled : ''}
                                    ${isSelected ? styles.daySelected : ''}
                                `}
                                disabled={!day.isCurrent}
                            >
                                {day.num}
                                {isSelected && <div className={styles.selectedDot} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Sesi Jam */}
            <div className={styles.slotContainer}>
                <div className={styles.slotTop}>
                    <h3 className={styles.slotTitle}>Pilih Sesi Jam ({formattedSelectedDate})</h3>
                    <span className={styles.slotDuration}>Sesi {durationMinutes} Menit</span>
                </div>

                <div className={styles.slotsGrid}>
                    {/* 4. Pakai dynamicSlots untuk me-render kotaknya */}
                    {dynamicSlots.map((slot) => {
                        const isBooked = bookedSlots.includes(slot.startTime);
                        const isSelected = selectedSlot?.id === slot.id;

                        if (isBooked) {
                            return (
                                <div key={slot.id} className={`${styles.slotCard} ${styles.slotBooked}`}>
                                    <div className={styles.slotTimeRow}>
                                        <span className={styles.timeText}>{slot.startTime} - {slot.endTime}</span>
                                        <Lock size={16} className={styles.lockIcon} />
                                    </div>
                                    <div className={styles.slotFooter}>
                                        <span className={styles.statusTextBooked}>Penuh Terisi</span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={slot.id}
                                onClick={() => onSelectSlot(slot as TimeSlot)}
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
                </div>
            </div>
        </div>
    );
}
import Link from 'next/link';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, Lock } from 'lucide-react';
import AdminScheduleShell from '@/components/AdminSchedule/AdminScheduleShell';
import { AddBlockButton } from '@/components/AdminSchedule/AdminScheduleControls';
import {
    agendaHref, atStudioTime, blockOverlapsDate, calendarHref, dateLabel, isScheduleDate,
    monthShift, roomFilter, scheduledHours, summarizeSchedule, STUDIO_TIME_ZONE,
    type RoomFilter, type ScheduleParams,
} from '@/lib/adminSchedule';
import { loadAdminSchedule, requireScheduleAdmin } from '@/lib/adminScheduleData';
import { addDays, getStudioNow } from '@/lib/scheduleUtils';
import styles from './page.module.css';

export default async function CalendarPage({ searchParams }: { searchParams: Promise<ScheduleParams> }) {
    await requireScheduleAdmin();
    const params = await searchParams;
    const today = getStudioNow().date;
    const month = typeof params.bulan === 'string' && /^\d{4}-\d{2}$/.test(params.bulan) &&
        isScheduleDate(params.bulan + '-01') ? params.bulan : today.slice(0, 7);
    const from = month + '-01';
    const until = monthShift(month, 1) + '-01';
    const room = roomFilter(params.room);
    const { rooms, bookings, blocks } = await loadAdminSchedule(from, until, false);
    const roomId = rooms.find((item) => item.code === room)?.id;
    const selectedBookings = bookings.filter((item) => room === 'all' || item.room_id === roomId);
    const selectedBlocks = blocks.filter((item) => room === 'all' || item.room_id === roomId);
    const stats = summarizeSchedule(selectedBookings);

    const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: STUDIO_TIME_ZONE })
        .format(new Date(atStudioTime(from)));
    const offset = (new Date(from + 'T00:00:00Z').getUTCDay() + 6) % 7;
    const days = Number(addDays(until, -1).slice(-2));
    const cells = Math.ceil((days + offset) / 7) * 7;
    const filters: { code: RoomFilter; name: string }[] = [{ code: 'all', name: 'Semua Room' }, ...rooms];

    return (
        <AdminScheduleShell>
            <div className={styles.pageHeader}>
                <div>
                    <p className={styles.breadcrumb}>Admin / Rekap Kalender</p>
                    <h2 className={styles.pageTitle}>Rekap Kalender Studio</h2>
                </div>
                <div className={styles.headerControls}>
                    <div className={styles.monthNav}>
                        <Link href={calendarHref(monthShift(month, -1), room)} className={styles.iconBtn} aria-label="Bulan sebelumnya">
                            <ChevronLeft size={16} />
                        </Link>
                        <span className={styles.monthText}>{label}</span>
                        <Link href={calendarHref(monthShift(month, 1), room)} className={styles.iconBtn} aria-label="Bulan berikutnya">
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                    <AddBlockButton date={month === today.slice(0, 7) ? today : from}
                        room={room} rooms={rooms} className={styles.blockBtn} />
                    <nav className={styles.roomFilter} aria-label="Filter ruangan">
                        {filters.map((item) => (
                            <Link key={item.code} href={calendarHref(month, item.code)}
                                aria-current={room === item.code ? 'page' : undefined}
                                className={`${styles.filterBtn} ${room === item.code ? styles.filterActive : ''}`}>
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div><p className={styles.statLabel}>Sesi dikonfirmasi</p><p className={styles.statValue}>{stats.confirmed}</p></div>
                    <CalendarDays size={20} />
                </div>
                <div className={styles.statCard}>
                    <div><p className={styles.statLabel}>Jadwal diblokir</p><p className={styles.statValue}>{selectedBlocks.length}</p></div>
                    <Lock size={20} />
                </div>
                <div className={styles.statCard}>
                    <div><p className={styles.statLabel}>Durasi sesi dikonfirmasi</p><p className={styles.statValue}>{scheduledHours(stats.minutes)}</p></div>
                    <Clock size={20} />
                </div>
            </div>
            <div className={styles.calendarContainer}>
                <div className={styles.daysHeader}>
                    {['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'].map((day) => <span key={day}>{day}</span>)}
                </div>
                <div className={styles.grid}>
                    {Array.from({ length: cells }, (_, index) => {
                        const date = addDays(from, index - offset);
                        if (date < from || date >= until) {
                            return <div key={date} className={`${styles.cell} ${styles.cellDisabled}`} aria-hidden="true">
                                <span className={styles.dateNumDisabled}>{date.slice(-2)}</span>
                            </div>;
                        }
                        const count = summarizeSchedule(selectedBookings.filter((item) => item.booking_date === date));
                        const blockCount = selectedBlocks.filter((item) => blockOverlapsDate(item, date)).length;
                        return (
                            <Link key={date} className={`${styles.cell} ${styles.dayLink} ${date === today ? styles.cellActive : ''}`}
                                href={agendaHref(date, room)} aria-current={date === today ? 'date' : undefined}
                                aria-label={`${dateLabel(date)}, ${count.confirmed} sesi, ${count.pending} menunggu bayar, ${blockCount} blokir`}>
                                <span className={styles.cellTop}><span className={styles.dateNum}>{date.slice(-2)}</span><ArrowRight size={14} /></span>
                                <span className={styles.cellBottom}>
                                    {count.confirmed > 0 && <span className={styles.sessionBtn}>{count.confirmed} sesi</span>}
                                    {count.pending > 0 && <span className={styles.cellStatus}>{count.pending} menunggu bayar</span>}
                                    {blockCount > 0 && <span className={styles.badgePerawatan}><Lock size={11} /> {blockCount} blokir</span>}
                                    {!count.confirmed && !count.pending && !blockCount && <span className={styles.cellStatus}>Kosong</span>}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </AdminScheduleShell>
    );
}

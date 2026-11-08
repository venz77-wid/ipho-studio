import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock, Lock } from 'lucide-react';
import AdminScheduleShell from '@/components/AdminSchedule/AdminScheduleShell';
import { AddBlockButton, PrintAgendaButton, UnblockButton } from '@/components/AdminSchedule/AdminScheduleControls';
import {
    agendaHref, blockTimeLabel, calendarHref, dateLabel, isScheduleDate, roomFilter,
    scheduledHours, summarizeSchedule, type RoomFilter, type ScheduleParams,
} from '@/lib/adminSchedule';
import { loadAdminSchedule, requireScheduleAdmin, type AgendaBooking } from '@/lib/adminScheduleData';
import { paymentStatusLabel } from '@/lib/adminTypes';
import { formatRupiah } from '@/lib/catalogTypes';
import { ORDER_ID_RE } from '@/lib/myBookingTypes';
import { addDays, getNowWIB, toMinutes } from '@/lib/scheduleUtils';
import styles from './page.module.css';

function sessionStatus(booking: AgendaBooking, now: ReturnType<typeof getNowWIB>) {
    if (booking.midtrans_status === 'paid_room_conflict') return { label: 'Perlu ditinjau', className: styles.badgeUpcoming };
    if (booking.status !== 'confirmed') {
        return { label: paymentStatusLabel(booking.status, booking.payment_scheme), className: styles.badgeUpcoming };
    }
    if (booking.booking_date < now.date ||
        (booking.booking_date === now.date && toMinutes(booking.end_time) <= now.minutes)) {
        return { label: 'Selesai', className: styles.badgeDone };
    }
    if (booking.booking_date === now.date && toMinutes(booking.start_time) <= now.minutes) {
        return { label: 'Berlangsung', className: styles.badgeActive };
    }
    return { label: 'Mendatang', className: styles.badgeUpcoming };
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<ScheduleParams> }) {
    await requireScheduleAdmin();
    const params = await searchParams;
    const now = getNowWIB();
    const date = isScheduleDate(params.tanggal) ? params.tanggal : now.date;
    const room = roomFilter(params.room);
    const { rooms, bookings, blocks } = await loadAdminSchedule<AgendaBooking>(date, addDays(date, 1), true);
    const roomId = rooms.find((item) => item.code === room)?.id;
    const selected = bookings.filter((item) => room === 'all' || item.room_id === roomId);
    const selectedBlocks = blocks.filter((item) => room === 'all' || item.room_id === roomId);
    const roomNames = new Map(rooms.map((item) => [item.id, item.name]));
    const stats = summarizeSchedule(selected);
    const filters: { code: RoomFilter; name: string; count: number }[] = [
        { code: 'all', name: 'Semua Room', count: bookings.length },
        ...rooms.map((item) => ({
            code: item.code, name: item.name, count: bookings.filter((booking) => booking.room_id === item.id).length,
        })),
    ];

    return (
        <AdminScheduleShell>
            <div className={styles.topBar}>
                <Link href={calendarHref(date.slice(0, 7), room)} className={styles.backLink}>
                    <ArrowLeft size={16} /> Kembali ke kalender
                </Link>
                <div className={styles.actionButtons}>
                    <PrintAgendaButton className={styles.btnOutline} />
                    <AddBlockButton date={date} room={room} rooms={rooms} className={styles.btnPrimary} />
                </div>
            </div>

            <div className={styles.agendaHeader}>
                <div>
                    <p className={styles.subMeta}>Agenda harian · WIB</p>
                    <h2 className={styles.pageTitle}>{dateLabel(date)}</h2>
                    <p className={styles.pageSub}>
                        <strong>{stats.confirmed} sesi dikonfirmasi</strong> · {stats.pending} menunggu pembayaran
                    </p>
                </div>
            </div>

            <div className={styles.filterRow}>
                <nav className={styles.roomTabs} aria-label="Filter ruangan">
                    {filters.map((item) => (
                        <Link key={item.code} href={agendaHref(date, item.code)}
                            aria-current={room === item.code ? 'page' : undefined}
                            className={`${styles.tabBtn} ${room === item.code ? styles.tabActive : ''}`}>
                            {item.name} ({item.count})
                        </Link>
                    ))}
                </nav>
            </div>

            <div className={styles.occupancyFooter}>
                <div className={styles.occLeft}>
                    <div className={styles.iconBox}><CalendarDays size={16} /></div>
                    <div>
                        <h3 className={styles.occTitle}>Ringkasan Sesi</h3>
                        <p className={styles.occSub}>{stats.confirmed} sesi dikonfirmasi · {scheduledHours(stats.minutes)} terjadwal</p>
                    </div>
                </div>
                <Clock size={18} />
            </div>

            <section className={styles.blockSection} aria-labelledby="schedule-blocks-heading">
                <h3 id="schedule-blocks-heading"><Lock size={16} /> Blokir Jadwal</h3>
                {selectedBlocks.length === 0 ? <p>Belum ada blokir pada tanggal ini.</p> : (
                    <ul className={styles.blockList}>
                        {selectedBlocks.map((block) => {
                            const name = roomNames.get(block.room_id) ?? 'Ruangan';
                            return (
                                <li key={block.id} className={styles.blockItem}>
                                    <div>
                                        <strong>{name} · {blockTimeLabel(block, date)}</strong>
                                        <p>{block.reason}</p>
                                    </div>
                                    <UnblockButton id={block.id} roomName={name} className={styles.btnOutline} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {!selected.length && <p className={styles.emptyAgenda}>Belum ada pesanan pada tanggal dan ruangan ini.</p>}
            <div className={styles.sessionsGrid}>
                {selected.map((booking) => {
                    const status = sessionStatus(booking, now);
                    const pkg = Array.isArray(booking.package) ? booking.package[0] : booking.package;
                    const orderId = booking.order_id;
                    const duration = toMinutes(booking.end_time) - toMinutes(booking.start_time);
                    return (
                        <article key={booking.id} className={styles.sessionCard}>
                            <div className={styles.sessionCardHeader}>
                                <span className={styles.sessionTime}>{booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)} WIB</span>
                                <span className={`${styles.statusBadge} ${status.className}`}>{status.label}</span>
                            </div>
                            <div className={styles.sessionCardBody}>
                                <div className={styles.clientInfo}>
                                    <div className={styles.clientRow}>
                                        <h3 className={styles.clientName}>{booking.full_name}</h3>
                                        <span className={styles.sessionPrice}>{formatRupiah(Number(booking.total_amount))}</span>
                                    </div>
                                    {booking.whatsapp && <p className={styles.clientWa}>WA {booking.whatsapp}</p>}
                                    <p className={styles.packageName}>{pkg?.title ?? 'Paket foto'}</p>
                                    <p className={styles.roomLocation}>
                                        {booking.room_id ? roomNames.get(booking.room_id) ?? 'Ruangan' : 'Ruangan belum tercatat'}
                                    </p>
                                    {booking.status === 'confirmed' && (
                                        <p className={styles.paymentBadge}>{paymentStatusLabel(booking.status, booking.payment_scheme)}</p>
                                    )}
                                </div>
                            </div>
                            {booking.special_notes && (
                                <div className={styles.sessionCardNotes}><p className={styles.notesText}>{booking.special_notes}</p></div>
                            )}
                            <div className={styles.sessionCardFooter}>
                                <span className={styles.durationTxt}>{scheduledHours(duration)}</span>
                                {orderId && ORDER_ID_RE.test(orderId) && (
                                    <Link className={styles.detailLink} href={`/admin/pesanan/${encodeURIComponent(orderId)}`}>
                                        Lihat detail pesanan →
                                    </Link>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </AdminScheduleShell>
    );
}

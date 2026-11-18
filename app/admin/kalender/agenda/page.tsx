import Link from 'next/link';
import Image from 'next/image';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { WalkInButton } from '@/components/AdminBookingOperations/BookingOperationButtons';
import { adminPackageImage, adminPaidAmount, adminPaymentLabel } from '@/lib/adminBookingOperations';
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
import { addDays, getStudioNow, toMinutes } from '@/lib/scheduleUtils';
import styles from './page.module.css';

function sessionStatus(booking: AgendaBooking, now: ReturnType<typeof getStudioNow>) {
    if (booking.midtrans_status === 'paid_room_conflict') return { label: 'Perlu ditinjau', className: styles.badgeUpcoming };
    if (booking.status !== 'confirmed') {
        return { label: paymentStatusLabel(booking.status, booking.payment_scheme), className: styles.badgeUpcoming };
    }
    const completion = Array.isArray(booking.completion) ? booking.completion[0] : booking.completion;
    if (completion) return { label: 'Selesai', className: styles.badgeDone };
    if (booking.booking_date < now.date ||
        (booking.booking_date === now.date && toMinutes(booking.end_time) <= now.minutes)) {
        return { label: 'Waktu sesi lewat', className: styles.badgeDone };
    }
    if (booking.booking_date === now.date && toMinutes(booking.start_time) <= now.minutes) {
        return { label: 'Berlangsung', className: styles.badgeActive };
    }
    return { label: 'Mendatang', className: styles.badgeUpcoming };
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<ScheduleParams> }) {
    await requireScheduleAdmin();
    const params = await searchParams;
    const now = getStudioNow();
    const date = isScheduleDate(params.tanggal) ? params.tanggal : now.date;
    const room = roomFilter(params.room);
    const { rooms, bookings, blocks } = await loadAdminSchedule<AgendaBooking>(date, addDays(date, 1), true);
    const activeBookings = bookings.filter((item) =>
        item.status === 'confirmed' || item.status === 'pending' || item.midtrans_status === 'paid_room_conflict');
    const canAddWalkIn = date >= now.date;
    const packages = canAddWalkIn ? await supabaseAdmin.from('packages')
        .select('id, title, price, duration_minutes').eq('is_active', true).gt('price', 0)
        .gt('duration_minutes', 0).order('sort_order') : null;
    if (packages?.error) throw packages.error;
    const roomId = rooms.find((item) => item.code === room)?.id;
    const selected = activeBookings.filter((item) => room === 'all' || item.room_id === roomId);
    const selectedBlocks = blocks.filter((item) => room === 'all' || item.room_id === roomId);
    const roomNames = new Map(rooms.map((item) => [item.id, item.name]));
    const stats = summarizeSchedule(selected);
    const filters: { code: RoomFilter; name: string; count: number }[] = [
        { code: 'all', name: 'Semua Room', count: activeBookings.length },
        ...rooms.map((item) => ({
            code: item.code, name: item.name, count: activeBookings.filter((booking) => booking.room_id === item.id).length,
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
                    <AddBlockButton date={date} room={room} rooms={rooms} className={styles.btnOutline} />
                    {canAddWalkIn && <WalkInButton date={date} room={room} rooms={rooms}
                        packages={packages?.data ?? []} className={styles.btnPrimary} />}
                </div>
            </div>

            <div className={styles.agendaHeader}>
                <div>
                    <p className={styles.subMeta}>Agenda harian · WITA</p>
                    <h2 className={styles.pageTitle}>{dateLabel(date)}</h2>
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
                    const imageSrc = adminPackageImage(pkg?.image_path);
                    const paid = adminPaidAmount(booking.booking_source, booking.status, booking.midtrans_status, booking.paid_amount, booking.cashier);
                    const payment = adminPaymentLabel(booking.status, paid, Number(booking.total_amount),
                        booking.midtrans_status === 'paid_room_conflict');
                    const duration = toMinutes(booking.end_time) - toMinutes(booking.start_time);
                    return (
                        <article key={booking.id} className={styles.sessionCard}>
                            <div className={styles.sessionCardHeader}>
                                <span className={styles.sessionTime}>{booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)} WITA</span>
                                <span className={`${styles.statusBadge} ${status.className}`}>{status.label}</span>
                            </div>
                            <div className={styles.sessionCardBody}>
                                {imageSrc && (
                                    <Image
                                        src={imageSrc}
                                        alt={pkg?.title ?? 'Foto paket'}
                                        width={220}
                                        height={192}
                                        sizes="(max-width: 480px) 72px, 110px"
                                        className={styles.sessionPhoto}
                                    />
                                )}
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
                                    <p className={styles.paymentBadge}>{payment}
                                        {booking.booking_source === 'walk_in' && ' · Walk-in'}
                                        {orderId && ' · #' + orderId}
                                    </p>
                                </div>
                            </div>
                            {booking.special_notes && (
                                <div className={styles.sessionCardNotes}><p className={styles.notesText}>{booking.special_notes}</p></div>
                            )}
                            <div className={styles.sessionCardFooter}>
                                <span className={styles.durationTxt}>{scheduledHours(duration)}</span>
                                {orderId && ORDER_ID_RE.test(orderId) && (
                                    <Link className={styles.detailLink} href={`/admin/pesanan/${encodeURIComponent(orderId)}?` + new URLSearchParams({ tanggal: date, room })}>
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

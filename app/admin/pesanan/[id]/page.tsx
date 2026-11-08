'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    LayoutDashboard, CalendarDays, Calendar, Users,
    ArrowLeft, Printer, User, CheckCircle2, Aperture, Clock,
    AlignLeft, Receipt, Zap
} from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { CASHIER_METHODS, adminPackageImage, adminPaymentLabel } from '@/lib/adminBookingOperations';
import { agendaHref, isRoomFilter, isScheduleDate } from '@/lib/adminSchedule';
import { OrderOperationButtons } from '@/components/AdminBookingOperations/BookingOperationButtons';
import type { AdminOrderDetail } from '@/lib/adminTypes';
import { PAYMENT_METHOD_LABEL, formatBookingDate } from '@/lib/bookingFormat';
import { getNowWIB } from '@/lib/scheduleUtils';
import styles from './page.module.css';

const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

interface OrderView {
    id: string;
    status: string;
    isActiveToday: boolean;
    createdAt: string;
    scheduleDate: string;
    scheduleTime: string;
    client: { name: string; whatsapp: string; isWaVerified: boolean; email: string; registeredOnline: boolean };
    session: {
        slot: string; package: string; packageDesc: string; room: string;
        durationText: string; durationNote: string; specialRequest: string;
        images: { title: string; src: string }[];
    };
    finance: {
        method: string; verifyTime: string;
        breakdown: { label: string; value: number; isPromo?: boolean }[];
        total: number; paid: number; remaining: number;
    };
    allocation: { date: string; start: string; end: string; dayStart: string; dayEnd: string };
}

const WIB = 'Asia/Jakarta';
const shortDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: WIB });
const dateTime = (iso: string): string =>
    `${shortDate(iso)}, ${new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: WIB }).replace('.', ':')} WIB`;

// Mengubah data database menjadi bentuk yang dipakai tampilan halaman ini
const toOrderView = (o: AdminOrderDetail): OrderView => {
    const paid = o.paidAmount;
    const time = `${o.startTime} - ${o.endTime} WIB`;
    return {
        id: `#${o.orderId}`,
        status: adminPaymentLabel(o.status, paid, o.totalAmount, o.requiresScheduleReview).toUpperCase(),
        isActiveToday: o.status === 'confirmed' && !o.completedAt && o.bookingDate === getNowWIB().date,
        createdAt: o.createdAt ? shortDate(o.createdAt) : 'Tidak tercatat',
        scheduleDate: formatBookingDate(o.bookingDate),
        scheduleTime: time,
        client: { name: o.fullName, whatsapp: o.whatsapp, isWaVerified: false, email: o.email ?? '', registeredOnline: o.bookingSource === 'online' },
        session: {
            slot: `SLOT ${o.startTime}`,
            package: o.package.title,
            packageDesc: o.package.description,
            room: o.roomName ?? 'Ruangan belum tercatat',
            durationText: `${time} (${o.package.durationMinutes} Menit Foto)`,
            durationNote: '',
            specialRequest: o.specialNotes ?? '',
            images: [{ title: o.package.label || 'PAKET', src: adminPackageImage(o.package.imageSrc) ?? '' }],
        },
        finance: {
            method: o.paymentMethod === 'cashier' ? 'Kasir' : PAYMENT_METHOD_LABEL[o.paymentMethod] ?? 'Tidak tercatat',
            verifyTime: o.paidAt ? dateTime(o.paidAt) : 'Belum dibayar',
            breakdown: [{ label: `Sewa Studio & Sesi Foto (${o.package.durationMinutes}m)`, value: o.totalAmount }],
            total: o.totalAmount,
            paid,
            remaining: Math.max(0, o.totalAmount - paid),
        },
        allocation: { date: o.bookingDate, start: o.startTime, end: o.endTime, dayStart: '09:00', dayEnd: '21:00' },
    };
};

async function fetchOrder(id: string): Promise<AdminOrderDetail> {
    const res = await fetch('/api/admin/orders/' + encodeURIComponent(id), { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat pesanan.');
    return data.order;
}

export default function OrderDetailPage({ params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ room?: string | string[]; tanggal?: string | string[] }>;
}) {
    const { id } = use(params);
    const { room, tanggal } = use(searchParams);

    // Data pesanan diambil dari database lewat /api/admin/orders/[id]
    const [order, setOrder] = useState<AdminOrderDetail | null>(null);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await fetchOrder(id);
                if (!cancelled) {
                    setOrder(data);
                    setLoadState('ready');
                }
            } catch (e) {
                if (!cancelled) {
                    setLoadError(e instanceof Error ? e.message : 'Gagal memuat pesanan.');
                    setLoadState('error');
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loadState !== 'ready' || !order) {
        return (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                <p>{loadState === 'loading' ? 'Memuat pesanan...' : loadError}</p>
                <p style={{ marginTop: 16 }}><Link href="/admin">Kembali ke Dashboard</Link></p>
            </div>
        );
    }

    const orderData = toOrderView(order);
    const back = agendaHref(isScheduleDate(tanggal) ? tanggal : order.bookingDate, isRoomFilter(room) ? room : 'all');
    async function reload() { setOrder(await fetchOrder(id)); }

    return (
        <div className={styles.adminLayout}>
            {/* SIDEBAR */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarTop}>
                    <div className={styles.brand}>
                        <div>
                            <h1 className={styles.brandName}>IPHO STUDIO</h1>
                            <p className={styles.brandRole}>ADMIN PANEL</p>
                        </div>
                        <div className={styles.dotIndicator} />
                    </div>

                    <div className={styles.navGroup}>
                        <p className={styles.navLabel}>NAVIGATION</p>
                        <nav className={styles.navMenu}>
                            <Link href="/admin" className={styles.navItem}>
                                <LayoutDashboard size={18} />
                                Dashboard
                            </Link>
                            <Link href="/admin/kalender" className={styles.navItem}>
                                <CalendarDays size={18} />
                                Rekap Kalender
                            </Link>
                        </nav>
                    </div>
                </div>

                <div className={styles.sidebarBottom}>
                    <LogoutButton className={styles.logoutBtn} />
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={styles.mainContent}>
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}>
                        <Calendar size={16} />
                        <span>Studio Operational Calendar • Today</span>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.productionStatus}>
                            <div className={styles.pulseDot} />
                            PRODUCTION ACTIVE
                        </div>
                        <div className={styles.adminProfile}>
                            <div className={styles.adminInfo}>
                                <span className={styles.adminName}>Admin Officer</span>
                                <span className={styles.adminRoleTxt}>Operations Lead</span>
                            </div>
                            <div className={styles.avatar}>
                                <Users size={16} color="#ffffff" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className={styles.contentBody}>
                    <div className={styles.topActions}>
                        <Link href={back} className={styles.backBtn}>
                            <ArrowLeft size={16} />
                            Kembali ke Agenda Harian
                        </Link>
                        <div className={styles.breadcrumbPaths}>
                            <span>ADMIN</span> <span>/</span> <span>PESANAN</span> <span>/</span> <span className={styles.currentPath}>{orderData.id}</span>
                        </div>
                    </div>

                    <div className={styles.headerCard}>
                        <div className={styles.headerCardLeft}>
                            <div className={styles.titleRow}>
                                <h2 className={styles.pageTitle}>Detail Pesanan {orderData.id}</h2>
                                <span className={styles.badgeLunas}>
                                    <div className={styles.greenDot} />
                                    {orderData.status}
                                </span>
                            </div>
                            <div className={styles.subtitleRow}>
                                {order.completedAt && <span className={styles.badgeActive}>SESI SELESAI · {dateTime(order.completedAt)}</span>}
                                {orderData.isActiveToday && <span className={styles.badgeActive}>AKTIF HARI INI</span>}
                                <p className={styles.dateInfo}>
                                    Dibuat pada {orderData.createdAt} • Jadwal Sesi: <strong>{orderData.scheduleDate} ({orderData.scheduleTime})</strong>
                                </p>
                            </div>
                        </div>
                        <button type="button" className={styles.printBtn} onClick={() => window.print()}>
                            <Printer size={16} />
                            {order.bookingSource === 'walk_in' ? 'Cetak Tiket' : 'Cetak Ringkasan'}
                        </button>
                    </div>

                    <div className={styles.gridContainer}>
                        {/* KOLOM KIRI */}
                        <div className={styles.leftCol}>
                            <div className={styles.contentCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitleBox}>
                                        <div className={styles.iconBox}><User size={16} /></div>
                                        <h3 className={styles.cardTitle}>Profil & Informasi Klien</h3>
                                    </div>
                                    {orderData.client.registeredOnline && <span className={styles.tagLight}>TERDAFTAR ONLINE</span>}
                                </div>

                                <div className={styles.profileGrid}>
                                    <div>
                                        <p className={styles.fieldLabel}>NAMA LENGKAP</p>
                                        <p className={styles.fieldValue}>{orderData.client.name}</p>
                                    </div>
                                    <div>
                                        <p className={styles.fieldLabel}>NOMOR WHATSAPP</p>
                                        <div className={styles.waRow}>
                                            <p className={styles.fieldValue}>{orderData.client.whatsapp}</p>
                                            {orderData.client.isWaVerified && (
                                                <span className={styles.verifiedBadge}>
                                                    <CheckCircle2 size={12} /> Terverifikasi
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className={styles.fieldLabel}>EMAIL KLIEN</p>
                                        {orderData.client.email ? <a href={`mailto:${orderData.client.email}`} className={styles.emailLink}>
                                            {orderData.client.email}
                                        </a> : <p className={styles.fieldValue}>Tidak tercatat</p>}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.contentCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitleBox}>
                                        <div className={styles.iconBox}><Aperture size={16} /></div>
                                        <h3 className={styles.cardTitle}>Rincian Sesi Pemesanan</h3>
                                    </div>
                                    <span className={styles.tagBlue}>{orderData.session.slot}</span>
                                </div>

                                <div className={styles.imageGrid}>
                                    {orderData.session.images.map((img, idx) => (
                                        <div key={idx} className={styles.imgBox}>
                                            {img.src ?
                                                <Image
                                                    src={img.src}
                                                    alt={orderData.session.package}
                                                    width={760}
                                                    height={570}
                                                    sizes="(max-width: 640px) 90vw, 380px"
                                                    className={styles.packageImage}
                                                /> :
                                                <div className={styles.imgPlaceholder} />}
                                            <span className={styles.imgLabel}>{img.title}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.infoGrid2}>
                                    <div className={styles.infoBox}>
                                        <p className={styles.fieldLabel}>PAKET STUDIO</p>
                                        <p className={styles.fieldValueLg}>{orderData.session.package}</p>
                                        <p className={styles.fieldSub}>{orderData.session.packageDesc}</p>
                                    </div>
                                    <div className={styles.infoBox}>
                                        <p className={styles.fieldLabel}>RUANGAN STUDIO</p>
                                        <p className={styles.fieldValueLg}>{orderData.session.room}</p>
                                    </div>
                                </div>

                                <div className={styles.durationSection}>
                                    <p className={styles.fieldLabel}>DURASI & WAKTU OPERASIONAL</p>
                                    <div className={styles.durationRow}>
                                        <Clock size={16} className={styles.textMuted} />
                                        <div>
                                            <p className={styles.fieldValue}>{orderData.session.durationText}</p>
                                            <p className={styles.fieldSub}>{orderData.session.durationNote}</p>
                                        </div>
                                    </div>
                                </div>

                                {orderData.session.specialRequest && (
                                    <div className={styles.alertBox}>
                                        <div className={styles.alertHeader}>
                                            <AlignLeft size={14} />
                                            <span>Permintaan Khusus & Catatan Klien</span>
                                        </div>
                                        <p className={styles.alertText}>“{orderData.session.specialRequest}”</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* KOLOM KANAN */}
                        <div className={styles.rightCol}>
                            <div className={styles.contentCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitleBox}>
                                        <div className={styles.iconBox}><Receipt size={16} /></div>
                                        <h3 className={styles.cardTitle}>Rincian Finansial</h3>
                                    </div>
                                    <span className={styles.badgeBlack}>{orderData.status}</span>
                                </div>

                                <div className={styles.financeMeta}>
                                    <div className={styles.fMetaRow}>
                                        <span className={styles.textMuted}>Metode Pembayaran</span>
                                        <span className={styles.textBold}>{orderData.finance.method}</span>
                                    </div>
                                    <div className={styles.fMetaRow}>
                                        <span className={styles.textMuted}>Waktu Verifikasi</span>
                                        <span className={styles.textNormal}>{orderData.finance.verifyTime}</span>
                                    </div>
                                </div>

                                <div className={styles.financeBreakdown}>
                                    {orderData.finance.breakdown.map((item, idx) => (
                                        <div key={idx} className={styles.fBreakdownRow}>
                                            <span className={styles.textNormal}>{item.label}</span>
                                            <span className={styles.textNormal}>
                                                {item.isPromo ? <span className={styles.textGreen}>Rp 0 <br />(Promo)</span> : formatRupiah(item.value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.financeTotal}>
                                    <div className={styles.fTotalRow}>
                                        <span className={styles.textLgBold}>Total Tagihan</span>
                                        <span className={styles.textLgBold}>{formatRupiah(orderData.finance.total)}</span>
                                    </div>
                                    <div className={styles.fTotalRow}>
                                        <span className={styles.textNormal}>Telah Dibayarkan</span>
                                        <span className={styles.textBold}>{formatRupiah(orderData.finance.paid)}</span>
                                    </div>
                                </div>

                                <div className={styles.financeRemaining}>
                                    <span className={styles.textBold}>Sisa Tagihan Kasir</span>
                                    <span className={orderData.finance.remaining === 0 ? styles.textGreenBold : styles.textBold}>{formatRupiah(orderData.finance.remaining)}</span>
                                </div>

                                {order.cashierPayments.length > 0 && <ul className={styles.operationLog}>
                                    {order.cashierPayments.map((entry, index) => <li key={index}>
                                        {CASHIER_METHODS[entry.method]} · {formatRupiah(Number(entry.amount_rupiah))} · {dateTime(entry.recorded_at)}
                                    </li>)}
                                </ul>}
                            </div>
                            <div className={`${styles.contentCard} ${styles.operationsCard}`}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitleBox}>
                                        <div className={styles.iconBox}><Zap size={16} /></div>
                                        <h3 className={styles.cardTitle}>Aksi Operasional Studio</h3>
                                    </div>
                                </div>
                                <OrderOperationButtons order={order} onSaved={reload} />
                            </div>
                            {order.reschedules.length > 0 && <div className={styles.contentCard}>
                                <h3 className={styles.cardTitle}>Riwayat Reschedule</h3>
                                <ul className={styles.operationLog}>
                                    {order.reschedules.map((item, index) => <li key={index}>
                                        {formatBookingDate(item.old_booking_date)} {item.old_start_time.slice(0, 5)} →{' '}
                                        {formatBookingDate(item.new_booking_date)} {item.new_start_time.slice(0, 5)} WIB
                                        <br />{item.reason}
                                    </li>)}
                                </ul>
                            </div>}
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
}
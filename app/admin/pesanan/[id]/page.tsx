'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard, CalendarDays, Calendar, Users,
    ArrowLeft, Printer, User, CheckCircle2, Aperture, Clock,
    AlignLeft, Receipt, ExternalLink, Zap, MessageCircle,
    Check, FileText, ChevronRight
} from 'lucide-react';
import RescheduleModal from '@/components/RescheduleModal/RescheduleModal';
import LogoutButton from '@/components/LogoutButton';
import { paymentStatusLabel, type AdminOrderDetail } from '@/lib/adminTypes';
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
        slot: string; package: string; packageDesc: string; room: string; roomDesc: string;
        durationText: string; durationNote: string; specialRequest: string;
        images: { title: string; src: string }[];
    };
    finance: {
        method: string; gatewayId: string; verifyTime: string;
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

const emptyOrder = (id: string): OrderView => ({
    id, status: '', isActiveToday: false, createdAt: '', scheduleDate: '', scheduleTime: '',
    client: { name: '', whatsapp: '', isWaVerified: false, email: '', registeredOnline: false },
    session: { slot: '', package: '', packageDesc: '', room: '', roomDesc: '', durationText: '', durationNote: '', specialRequest: '', images: [] },
    finance: { method: '', gatewayId: '', verifyTime: '', breakdown: [], total: 0, paid: 0, remaining: 0 },
    allocation: { date: '', start: '', end: '', dayStart: '09:00', dayEnd: '21:00' },
});

// Mengubah data database menjadi bentuk yang dipakai tampilan halaman ini
const toOrderView = (o: AdminOrderDetail): OrderView => {
    const paid = o.status === 'confirmed' ? o.paidAmount : 0;
    const time = `${o.startTime} - ${o.endTime} WIB`;
    return {
        id: `#${o.orderId}`,
        status: paymentStatusLabel(o.status, o.paymentScheme).toUpperCase(),
        isActiveToday: o.status === 'confirmed' && o.bookingDate === getNowWIB().date,
        createdAt: shortDate(o.createdAt),
        scheduleDate: formatBookingDate(o.bookingDate),
        scheduleTime: time,
        client: { name: o.fullName, whatsapp: o.whatsapp, isWaVerified: false, email: o.email, registeredOnline: false },
        session: {
            slot: `SLOT ${o.startTime}`,
            package: o.package.title,
            packageDesc: o.package.description,
            room: 'Studio Room A',
            roomDesc: 'Daylight Cyclorama',
            durationText: `${time} (${o.package.durationMinutes} Menit Foto)`,
            durationNote: '',
            specialRequest: o.specialNotes ?? '',
            images: [{ title: o.package.label || 'PAKET', src: o.package.imageSrc ?? '/images/packages/placeholder.jpg' }],
        },
        finance: {
            method: PAYMENT_METHOD_LABEL[o.paymentMethod],
            gatewayId: `#${o.orderId}`,
            verifyTime: o.paidAt ? dateTime(o.paidAt) : 'Belum dibayar',
            breakdown: [{ label: `Sewa Studio & Sesi Foto (${o.package.durationMinutes}m)`, value: o.totalAmount }],
            total: o.totalAmount,
            paid,
            remaining: Math.max(0, o.totalAmount - paid),
        },
        allocation: { date: o.bookingDate, start: o.startTime, end: o.endTime, dayStart: '09:00', dayEnd: '21:00' },
    };
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const orderId = id ? `#${id.toUpperCase()}` : '#IPHO-8821';

    // State untuk kontrol Modal Reschedule
    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

    // Data pesanan diambil dari database lewat /api/admin/orders/[id]
    const [orderData, setOrderData] = useState<OrderView>(() => emptyOrder(orderId));
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Gagal memuat pesanan.');
                if (!cancelled) {
                    setOrderData(toOrderView(data.order as AdminOrderDetail));
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

    // Handler ketika reschedule dikonfirmasi dari dalam modal
    const handleConfirmReschedule = (newDate: string, newSlot: string) => {
        setOrderData(prev => ({
            ...prev,
            scheduleDate: newDate,
            scheduleTime: newSlot
        }));
        alert(`Jadwal pesanan ${orderData.id} berhasil diperbarui ke ${newDate} (${newSlot})!`);
    };

    if (loadState !== 'ready') {
        return (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                <p>{loadState === 'loading' ? 'Memuat pesanan...' : loadError}</p>
                <p style={{ marginTop: 16 }}><Link href="/admin">Kembali ke Dashboard</Link></p>
            </div>
        );
    }

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
                        <Link href="/admin/kalender/agenda" className={styles.backBtn}>
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
                                {orderData.isActiveToday && <span className={styles.badgeActive}>AKTIF HARI INI</span>}
                                <p className={styles.dateInfo}>
                                    Dibuat pada {orderData.createdAt} • Jadwal Sesi: <strong>{orderData.scheduleDate} ({orderData.scheduleTime})</strong>
                                </p>
                            </div>
                        </div>
                        <button className={styles.printBtn}>
                            <Printer size={16} />
                            Cetak Ringkasan
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
                                        <a href={`mailto:${orderData.client.email}`} className={styles.emailLink}>
                                            {orderData.client.email}
                                        </a>
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
                                            <div className={styles.imgPlaceholder} />
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
                                        <p className={styles.fieldSub}>{orderData.session.roomDesc}</p>
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
                                        <p className={styles.alertText}>"{orderData.session.specialRequest}"</p>
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
                                    <span className={styles.badgeBlack}><Check size={12} /> LUNAS</span>
                                </div>

                                <div className={styles.financeMeta}>
                                    <div className={styles.fMetaRow}>
                                        <span className={styles.textMuted}>Metode Pembayaran</span>
                                        <span className={styles.textBold}>{orderData.finance.method}</span>
                                    </div>
                                    <div className={styles.fMetaRow}>
                                        <span className={styles.textMuted}>ID Transaksi Gateway</span>
                                        <span className={styles.textNormal}>{orderData.finance.gatewayId}</span>
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
                                    <span className={styles.textGreenBold}>{formatRupiah(orderData.finance.remaining)} (Lunas)</span>
                                </div>

                                <button className={styles.linkBtn}>
                                    <ExternalLink size={12} /> Lihat Log Transaksi Gateway (Midtrans)
                                </button>
                            </div>

                            <div className={styles.contentCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitleBox}>
                                        <div className={styles.iconBox}><Zap size={16} /></div>
                                        <h3 className={styles.cardTitle}>Aksi Operasional Studio</h3>
                                    </div>
                                </div>
                                <div className={styles.actionGrid}>
                                    <button className={styles.btnPrimary}>
                                        <MessageCircle size={16} /> Hubungi WhatsApp Klien
                                    </button>
                                    {/* Tombol pemicu Modal Reschedule */}
                                    <button onClick={() => setIsRescheduleOpen(true)} className={styles.btnOutline}>
                                        <Calendar size={16} /> Jadwalkan Ulang (Reschedule)
                                    </button>
                                    <button className={styles.btnSoft}>
                                        <CheckCircle2 size={16} /> Tandai Sesi Selesai
                                    </button>
                                    <button className={styles.btnGhost}>
                                        <FileText size={16} /> Cetak Surat Jalan / Work Order Fotografer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Reschedule Dinamis */}
            <RescheduleModal
                isOpen={isRescheduleOpen}
                onClose={() => setIsRescheduleOpen(false)}
                orderInfo={{
                    id: orderData.id,
                    customerName: orderData.client.name,
                    customerPhone: orderData.client.whatsapp,
                    packageName: orderData.session.package,
                    roomName: orderData.session.room,
                    currentSchedule: `${orderData.scheduleDate} • ${orderData.scheduleTime}`
                }}
                onConfirm={handleConfirmReschedule}
            />
        </div>
    );
}
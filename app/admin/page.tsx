'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    CalendarDays,
    Calendar,
    Search,
    ArrowUpRight,
    Wallet,
    ClipboardList,
    ArrowRight,
    Camera,
    Users,
    ChevronLeft,
    ChevronRight,
    Radio
} from 'lucide-react';
import AdminSidebar from '@/components/AdminSchedule/AdminSidebar';
import type { AdminDashboardResponse } from '@/lib/adminTypes';
import { addDays, getStudioNow, STUDIO_TIME_ZONE } from '@/lib/scheduleUtils';
import styles from './page.module.css';

// Helper Format Rupiah
const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// Tipe Data untuk Dashboard
interface OrderData {
    id: string;
    customerName: string;
    customerEmail: string;
    packageType: string;
    packageName: string;
    scheduleDate: string;
    scheduleTime: string;
    duration: string;
    room: string;
    roomType: string;
    status: string;
}

interface RoomData {
    id: string;
    name: string;
    type: string;
    title: string;
    occupancy: number;
    scheduled: number;
    image: string;
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('Semua');
    const [searchQuery, setSearchQuery] = useState('');

    // ==========================================
    // DATA DARI DATABASE (tabel bookings, lewat /api/admin/dashboard)
    // ==========================================
    const [page, setPage] = useState(1);
    const [live, setLive] = useState<AdminDashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams({ tab: activeTab, q: searchQuery.trim(), page: String(page) });
                const res = await fetch(`/api/admin/dashboard?${params.toString()}`, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Gagal memuat data dashboard.');
                if (!cancelled) setLive(data as AdminDashboardResponse);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat data dashboard.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, searchQuery ? 350 : 0);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [activeTab, searchQuery, page, reloadKey]);

    // Segarkan otomatis setiap 30 detik
    useEffect(() => {
        const id = setInterval(() => setReloadKey((k) => k + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const todayStudio = getStudioNow().date;
    const tomorrowStudio = addDays(todayStudio, 1);
    const dayLabel = (iso: string): string => {
        if (iso === todayStudio) return 'Hari ini';
        if (iso === tomorrowStudio) return 'Besok';
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    const st = live?.stats;
    const dashboardData = {
        today: new Date().toLocaleDateString('id-ID', { timeZone: STUDIO_TIME_ZONE, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        adminName: "Admin Officer",
        adminRole: "Operations Lead",
        stats: {
            totalSessionsToday: st?.totalSessionsToday ?? 0,
            trendSessions: st && st.totalSessionsToday > 0 ? `${st.upcomingSessions} sesi masih menyusul hari ini` : 'Belum ada sesi hari ini',
            completedSessions: st?.completedSessions ?? 0,
            upcomingSessions: st?.upcomingSessions ?? 0,
            revenueMonth: st?.revenueMonth ?? 0,
            paidOrdersMonth: st?.paidOrdersMonth ?? 0,
            targetMonth: st?.monthLabel ?? '',
            pendingPayments: st?.pendingPayments ?? 0,
            pendingDetails: st && st.pendingPayments > 0 ? `${st.pendingPayments} pesanan menunggu pembayaran` : 'Tidak ada pesanan tertunda'
        },
        rooms: [] as RoomData[],
        orders: (live?.orders ?? []).map((o): OrderData => ({
            id: o.orderId,
            customerName: o.customerName,
            customerEmail: o.customerEmail,
            packageType: o.packageLabel,
            packageName: o.packageTitle,
            scheduleDate: dayLabel(o.bookingDate),
            scheduleTime: `${o.startTime} WITA`,
            duration: `${o.durationMinutes} Menit`,
            room: 'Studio Room A',
            roomType: 'Daylight Cyclorama',
            status: o.paymentLabel
        })),
        pagination: {
            page: live?.pagination.page ?? 1,
            totalPages: live?.pagination.totalPages ?? 1,
            showingStart: live?.pagination.showingStart ?? 0,
            showingEnd: live?.pagination.showingEnd ?? 0,
            totalOrders: live?.pagination.total ?? 0
        }
    };

    const getStatusStyle = (status: string) => {
        if (status.includes('Lunas')) return styles.statusLunas;
        if (status.includes('DP')) return styles.statusDp;
        if (status.includes('Menunggu')) return styles.statusMenunggu;
        return styles.statusDefault;
    };

    return (
        <div className={styles.adminLayout}>
            <AdminSidebar
                section="dashboard"
                status={
                    <div className={styles.sessionStatus}>
                        <span>STUDIO SESSION</span>
                        <span className={styles.liveBadge}>Live</span>
                    </div>
                }
            />

            {/* MAIN CONTENT */}
            <main className={styles.mainContent}>
                {/* TOP HEADER */}
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}>
                        <Calendar size={16} />
                        <span>Studio Operational Calendar • {dashboardData.today}</span>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.productionStatus}>
                            <div className={styles.pulseDot} />
                            PRODUCTION ACTIVE
                        </div>
                        <div className={styles.adminProfile}>
                            <div className={styles.adminInfo}>
                                <span className={styles.adminName}>{dashboardData.adminName}</span>
                                <span className={styles.adminRoleTxt}>{dashboardData.adminRole}</span>
                            </div>
                            <div className={styles.avatar}>
                                <Users size={16} color="#ffffff" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className={styles.contentBody}>
                    {/* PAGE HEADER */}
                    <div className={styles.pageHeader}>
                        <div>
                            <p className={styles.breadcrumb}>OPERATIONAL BRIEFING • IPHO DESK</p>
                            <h2 className={styles.pageTitle}>Ringkasan Studio & Pesanan</h2>
                            <p className={styles.pageDesc}>Pantau performa harian, konfirmasi pemesanan, dan aktivitas studio secara presisi dan terstruktur.</p>
                        </div>
                        <div className={styles.liveRigBadge}>
                            <div className={styles.rigDot} />
                            <div>
                                <p className={styles.rigLabel}>LIVE RIG STATE</p>
                                <p className={styles.rigValue}>Status Room: Siap Digunakan</p>
                            </div>
                            <Radio size={16} className={styles.rigIcon} />
                        </div>
                    </div>

                    {/* STATS CARDS */}
                    <div className={styles.statsGrid}>
                        {/* Card 1 */}
                        <div className={styles.statCard}>
                            <div className={styles.statTop}>
                                <p className={styles.statLabel}>TOTAL PESANAN HARI INI</p>
                                <CalendarDays size={16} className={styles.statIcon} />
                            </div>
                            <h3 className={styles.statValue}>{dashboardData.stats.totalSessionsToday} Sesi</h3>
                            <p className={styles.statTrend}>
                                <ArrowUpRight size={14} /> {dashboardData.stats.trendSessions}
                            </p>
                            <div className={styles.progressBarWrapper}>
                                <div className={styles.progressLabels}>
                                    <span>{dashboardData.stats.completedSessions} Selesai</span>
                                    <span>{dashboardData.stats.upcomingSessions} Berlangsung / Mendatang</span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: dashboardData.stats.totalSessionsToday > 0 ? `${(dashboardData.stats.completedSessions / dashboardData.stats.totalSessionsToday) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className={styles.statCard}>
                            <div className={styles.statTop}>
                                <p className={styles.statLabel}>TOTAL PENDAPATAN BULAN INI</p>
                                <Wallet size={16} className={styles.statIcon} />
                            </div>
                            <h3 className={styles.statValue}>{formatRupiah(dashboardData.stats.revenueMonth)}</h3>
                            <p className={styles.statSub}>{dashboardData.stats.paidOrdersMonth} sesi terbayar • {dashboardData.stats.targetMonth}</p>
                            <div className={styles.chartPlaceholder}>
                                <span className={styles.targetText}>Bulan Aktif <strong>{dashboardData.stats.targetMonth}</strong></span>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className={styles.statCard}>
                            <div className={styles.statTop}>
                                <p className={styles.statLabel}>MENUNGGU PEMBAYARAN / VERIFIKASI</p>
                                <ClipboardList size={16} className={styles.statIcon} />
                            </div>
                            <h3 className={styles.statValue}>{dashboardData.stats.pendingPayments} Pemesanan</h3>
                            <p className={styles.statSub}>{dashboardData.stats.pendingDetails}</p>
                            <div className={styles.actionFooter}>
                                <div className={styles.priorityMark}>
                                    <div className={styles.darkDot} /> Prioritas Verifikasi
                                </div>
                                <button className={styles.textBtn} onClick={() => { setActiveTab('Menunggu Konfirmasi'); setPage(1); }}>Periksa <ArrowRight size={14} /></button>
                            </div>
                        </div>
                    </div>

                    {/* ROOM STATUS */}
                    {dashboardData.rooms.length > 0 && (
                        <div className={styles.roomsGrid}>
                            {dashboardData.rooms.map(room => (
                                <div key={room.id} className={styles.roomCard}>
                                    <div className={styles.roomImage}>
                                        <div className={styles.imagePlaceholder} />
                                    </div>
                                    <div className={styles.roomInfo}>
                                        <div className={styles.roomTags}>
                                            <span className={styles.tagBold}>{room.name}</span>
                                            <span className={styles.tagLight}>{room.type}</span>
                                        </div>
                                        <h4 className={styles.roomTitle}>{room.title}</h4>
                                        <p className={styles.roomOccupancy}>Tingkat Okupansi Hari Ini: {room.occupancy}% • {room.scheduled} Sesi Terjadwal</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ORDERS TABLE SECTION */}
                    <div className={styles.tableSection}>
                        <div className={styles.tableHeader}>
                            <div>
                                <h3 className={styles.sectionTitle}>Pesanan Terbaru Masuk</h3>
                                <p className={styles.sectionDesc}>Kelola status pembayaran, reservasi room, dan verifikasi pelunasan klien.</p>
                            </div>
                            <div className={styles.tableControls}>
                                <div className={styles.tabs}>
                                    {['Semua', 'Hari Ini', 'Menunggu Konfirmasi', 'Lunas'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => { setActiveTab(tab); setPage(1); }}
                                            className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                                <div className={styles.searchBox}>
                                    <Search size={16} className={styles.searchIcon} />
                                    <input
                                        type="text"
                                        placeholder="Cari nama, ID, paket..."
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                        className={styles.searchInput}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.tableContainer}>
                            <table className={styles.ordersTable}>
                                <thead>
                                    <tr>
                                        <th>ID PESANAN</th>
                                        <th>NAMA PEMESAN</th>
                                        <th>PAKET FOTO</th>
                                        <th>JADWAL & JAM</th>
                                        <th>STUDIO ROOM</th>
                                        <th>STATUS PEMBAYARAN</th>
                                        <th>AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
                                                {loading && !live ? 'Memuat pesanan...' : error ? error : 'Belum ada pesanan yang masuk.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        dashboardData.orders.map((order) => (
                                            <tr key={order.id}>
                                                <td className={styles.cellId}>{order.id}</td>
                                                <td>
                                                    <div className={styles.cellName}>{order.customerName}</div>
                                                    <div className={styles.cellSub}>{order.customerEmail}</div>
                                                </td>
                                                <td>
                                                    <div className={styles.cellPackage}>
                                                        <Camera size={14} className={styles.pkgIcon} />
                                                        <div>
                                                            <div className={styles.cellName}>{order.packageType}</div>
                                                            <div className={styles.cellSub}>{order.packageName}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.cellName}>{order.scheduleDate}, {order.scheduleTime}</div>
                                                    <div className={styles.cellSub}>Slot {order.duration}</div>
                                                </td>
                                                <td>
                                                    <div className={styles.roomBadge}>
                                                        <div className={styles.darkDotSmall} />
                                                        <div>
                                                            <div className={styles.cellName}>{order.room}</div>
                                                            <div className={styles.cellSub}>{order.roomType}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.statusBadge} ${getStatusStyle(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.actionBtns}>
                                                        <Link href={`/admin/pesanan/${order.id}`} className={styles.detailBtn} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Detail</Link>
                                                        <button className={styles.iconBtn}><ClipboardList size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.pagination}>
                            <p className={styles.pageInfo}>
                                Menampilkan <strong>{dashboardData.pagination.showingStart} - {dashboardData.pagination.showingEnd}</strong> dari <strong>{dashboardData.pagination.totalOrders}</strong> pesanan
                            </p>
                            <div className={styles.pageNav}>
                                <button className={styles.pageBtn} disabled={dashboardData.pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16} /></button>
                                {Array.from({ length: dashboardData.pagination.totalPages }, (_, i) => i + 1).map((n) => (
                                    <button
                                        key={n}
                                        className={`${styles.pageBtn} ${n === dashboardData.pagination.page ? styles.pageActive : ''}`}
                                        onClick={() => setPage(n)}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <button className={styles.pageBtn} disabled={dashboardData.pagination.page >= dashboardData.pagination.totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
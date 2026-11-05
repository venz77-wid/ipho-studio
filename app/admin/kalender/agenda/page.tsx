'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    LayoutDashboard, CalendarDays, LogOut, Calendar, Users, 
    ArrowLeft, Printer, Plus, Search, Clock, CheckCircle2, 
    AlertCircle, Camera, ChevronRight, ExternalLink
} from 'lucide-react';
import WalkInModal from '@/components/WalkInModal/WalkInModal';
import styles from './page.module.css';

// Helper Format Rupiah
const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// ==========================================
// DUMMY DATA FLEKSIBEL (SIAP DIBAYAR/DITARIK DARI SUPABASE)
// ==========================================
const AGENDA_DATA = {
    dateLabel: "Sabtu, 28 Oktober 2026",
    totalSessions: 4,
    estimatedRevenue: 1950000,
    occupancyUsed: 4.5,
    occupancyTotal: 9.0,
    occupancyPct: 50,
    sessions: [
        {
            id: "IPHO-8821",
            time: "13:30 - 14:30 WIB",
            status: "Sedang Aktif",
            paymentStatus: "Lunas 100%",
            clientName: "Nadia Larasati",
            price: 450000,
            whatsapp: "+62 812-3456-7890",
            package: "Editorial Portrait & Wisuda",
            room: "Studio Room A (Daylight Cyclorama)",
            roomCategory: "Studio Room A",
            photographer: "Dimas Pratama (In-House Senior)",
            notes: "Catatan: Backdrop Warm Oatmeal, 2 kursi kayu vintage",
            duration: "60 Menit",
            image: "/images/packages/placeholder.jpg"
        },
        {
            id: "IPHO-8822",
            time: "10:00 - 11:00 WIB",
            status: "Selesai",
            paymentStatus: "Lunas 100%",
            clientName: "Rian & Maya",
            price: 229000,
            whatsapp: "+62 812-0000-1111",
            package: "Self-Service Session",
            room: "Studio Room B (Infinity Cyclorama)",
            roomCategory: "Studio Room B",
            photographer: "Self-Photo (Unattended)",
            notes: "File cetak & digital softcopy telah diserahkan. Sesi berjalan tepat waktu tanpa overtime.",
            duration: "60 Menit",
            image: "/images/packages/placeholder.jpg"
        },
        {
            id: "IPHO-8825",
            time: "15:00 - 16:30 WIB",
            status: "Mendatang",
            paymentStatus: "DP 30% (Sisa Rp 550.000)",
            clientName: "Keluarga Hendrawan",
            price: 785000,
            whatsapp: "+62 821-1190-7731",
            package: "Family Portrait Grand",
            room: "Studio Room A (Daylight Cyclorama)",
            roomCategory: "Studio Room A",
            photographer: "Tim In-House Ipho",
            notes: "Rombongan 6 Anggota Keluarga. Waktu persiapan: 15 menit sebelum sesi. Ada 2 lansia, siapkan kursi utama.",
            duration: "90 Menit",
            image: "/images/packages/placeholder.jpg"
        },
        {
            id: "IPHO-8824",
            time: "16:30 - 17:30 WIB",
            status: "Mendatang",
            paymentStatus: "Menunggu Pelunasan",
            clientName: "Kevin & Jessica",
            price: 650000,
            whatsapp: "+62 813-9988-2233",
            package: "Pre-Wedding Intimate",
            room: "Studio Room B (Infinity Cyclorama)",
            roomCategory: "Studio Room B",
            photographer: "Siti Rahma",
            notes: "Pasangan Calon Pengantin. Instruksi: Tagih pelunasan via QRIS sebelum sesi dimulai.",
            duration: "60 Menit",
            image: "/images/packages/placeholder.jpg"
        }
    ]
};

export default function DailyAgendaPage() {
    const [selectedTab, setSelectedTab] = useState('Semua Sesi');
    
    // State untuk mengontrol Modal Walk-in
    const [isWalkInOpen, setIsWalkInOpen] = useState(false);

    // Filter sesi berdasarkan kategori ruangan
    const filteredSessions = AGENDA_DATA.sessions.filter(session => {
        if (selectedTab === 'Studio Room A') return session.roomCategory === 'Studio Room A';
        if (selectedTab === 'Studio Room B') return session.roomCategory === 'Studio Room B';
        return true;
    });

    const getStatusBadge = (status: string) => {
        if (status === 'Sedang Aktif') return styles.badgeActive;
        if (status === 'Selesai') return styles.badgeDone;
        return styles.badgeUpcoming;
    };

    const handleSaveWalkIn = (walkInData: any) => {
        console.log("Data Sesi Walk-in Baru:", walkInData);
        alert(`Sesi walk-in untuk ${walkInData.name} berhasil dibuat dan tiket dicetak!`);
        // TODO: Simpan data walk-in ke database Supabase di sini
    };

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
                        <nav className={styles.navMenu}>
                            <Link href="/admin" className={styles.navItem}>
                                <LayoutDashboard size={18} />
                                Dashboard
                            </Link>
                            <Link href="/admin/kalender" className={`${styles.navItem} ${styles.active}`}>
                                <CalendarDays size={18} />
                                Rekap Kalender
                            </Link>
                        </nav>
                    </div>
                </div>

                <div className={styles.sidebarBottom}>
                    <button className={styles.logoutBtn}>
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={styles.mainContent}>
                {/* TOP HEADER */}
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
                    {/* BREADCRUMB & ACTION BAR */}
                    <div className={styles.topBar}>
                        <Link href="/admin/kalender" className={styles.backLink}>
                            <ArrowLeft size={16} /> Kembali ke Kalender Bulanan
                        </Link>
                        <div className={styles.actionButtons}>
                            <button className={styles.btnOutline}><Printer size={16}/> Cetak Jadwal Harian</button>
                            {/* Tombol pemicu Modal Walk-In */}
                            <button onClick={() => setIsWalkInOpen(true)} className={styles.btnPrimary}>
                                <Plus size={16}/> + Tambah Sesi Walk-in
                            </button>
                        </div>
                    </div>

                    {/* AGENDA TITLE HEADER */}
                    <div className={styles.agendaHeader}>
                        <div>
                            <p className={styles.subMeta}>AGENDA HARIAN • Live Studio Ops</p>
                            <h2 className={styles.pageTitle}>{AGENDA_DATA.dateLabel}</h2>
                            <p className={styles.pageSub}>
                                <strong>{AGENDA_DATA.totalSessions} Sesi Foto Terjadwal</strong> • Estimasi Revenue: <strong>{formatRupiah(AGENDA_DATA.estimatedRevenue)}</strong>
                            </p>
                        </div>
                    </div>

                    {/* FILTER TABS & LEGEND */}
                    <div className={styles.filterRow}>
                        <div className={styles.roomTabs}>
                            {['Semua Sesi (4)', 'Studio Room A (2)', 'Studio Room B (2)'].map(tab => {
                                const cleanTabName = tab.split(' (')[0];
                                const isSelected = selectedTab === cleanTabName;
                                return (
                                    <button 
                                        key={tab} 
                                        onClick={() => setSelectedTab(cleanTabName)}
                                        className={`${styles.tabBtn} ${isSelected ? styles.tabActive : ''}`}
                                    >
                                        {tab}
                                    </button>
                                );
                            })}
                        </div>
                        <div className={styles.statusLegends}>
                            <span><div className={`${styles.legendDot} ${styles.dotActive}`}/> Berlangsung</span>
                            <span><div className={`${styles.legendDot} ${styles.dotDone}`}/> Selesai</span>
                            <span><div className={`${styles.legendDot} ${styles.dotUpcoming}`}/> Mendatang</span>
                        </div>
                    </div>

                    {/* SESSION CARDS GRID (2 Kolom) */}
                    <div className={styles.sessionsGrid}>
                        {filteredSessions.map((session, idx) => (
                            <div key={idx} className={styles.sessionCard}>
                                <div className={styles.sessionCardHeader}>
                                    <span className={styles.sessionTime}>{session.time}</span>
                                    <div className={styles.badgeGroup}>
                                        <span className={`${styles.statusBadge} ${getStatusBadge(session.status)}`}>
                                            {session.status}
                                        </span>
                                        <span className={styles.paymentBadge}>{session.paymentStatus} #{session.id}</span>
                                    </div>
                                </div>

                                <div className={styles.sessionCardBody}>
                                    <div className={styles.clientPhotoBox}>
                                        <div className={styles.imgPlaceholder} />
                                    </div>
                                    <div className={styles.clientInfo}>
                                        <div className={styles.clientRow}>
                                            <h3 className={styles.clientName}>{session.clientName}</h3>
                                            <span className={styles.sessionPrice}>{formatRupiah(session.price)}</span>
                                        </div>
                                        <p className={styles.clientWa}>📞 {session.whatsapp}</p>
                                        <p className={styles.packageName}>📷 {session.package}</p>
                                        <p className={styles.roomLocation}>📍 {session.room}</p>
                                        <p className={styles.photographer}>👤 Photographer: <strong>{session.photographer}</strong></p>
                                    </div>
                                </div>

                                <div className={styles.sessionCardNotes}>
                                    <p className={styles.notesText}>{session.notes}</p>
                                </div>

                                <div className={styles.sessionCardFooter}>
                                    <span className={styles.durationTxt}>DURASI: {session.duration}</span>
                                    <Link href={`/admin/pesanan/${session.id.toLowerCase()}`} className={styles.detailLink}>
                                        Lihat Detail Pesanan →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* OCCUPANCY FOOTER BAR */}
                    <div className={styles.occupancyFooter}>
                        <div className={styles.occLeft}>
                            <div className={styles.iconBox}><CalendarDays size={16}/></div>
                            <div>
                                <h4 className={styles.occTitle}>Okupansi Studio Hari Ini</h4>
                                <p className={styles.occSub}>{AGENDA_DATA.occupancyUsed} dari {AGENDA_DATA.occupancyTotal} slot waktu terisi ({AGENDA_DATA.occupancyPct}% Kapasitas Terpakai)</p>
                            </div>
                        </div>
                        <div className={styles.occRight}>
                            <span className={styles.occLabel}>Kapasitas Terpakai</span>
                            <div className={styles.occBar}>
                                <div className={styles.occFill} style={{ width: `${AGENDA_DATA.occupancyPct}%` }} />
                            </div>
                            <span className={styles.occVal}>{AGENDA_DATA.occupancyUsed} Jam / {AGENDA_DATA.occupancyTotal} Jam</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Walk-In Dinamis */}
            <WalkInModal 
                isOpen={isWalkInOpen}
                onClose={() => setIsWalkInOpen(false)}
                onConfirm={handleSaveWalkIn}
            />
        </div>
    );
}
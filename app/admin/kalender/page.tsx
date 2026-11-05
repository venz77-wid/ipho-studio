'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard, CalendarDays, Calendar, Users,
    ChevronLeft, ChevronRight, Lock, Sun, Moon, Wrench,
    ArrowRight, Info
} from 'lucide-react';
import BlockScheduleModal from '@/components/BlockScheduleModal/BlockScheduleModal';
import LogoutButton from '@/components/LogoutButton';
import styles from './page.module.css';

export default function CalendarRekapPage() {
    const [selectedRoom, setSelectedRoom] = useState('Semua Room');

    // State untuk mengontrol bulan & tahun aktif secara dinamis (Default: Oktober 2026)
    const [viewDate, setViewDate] = useState(() => new Date(2026, 9, 1));

    // State untuk membuka / menutup Modal Blokir Jadwal
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

    // Format Judul Bulan (Contoh: "Oktober 2026")
    const currentMonthLabel = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    // Navigasi Bulan
    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    // Generator Kalender Dinamis Berdasarkan Bulan & Tahun yang Dipilih
    const calendarCells = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Senin = 0
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const cells = [];

        // Tanggal dari bulan sebelumnya (sisa grid awal)
        for (let i = startingDay - 1; i >= 0; i--) {
            cells.push({
                date: daysInPrevMonth - i,
                type: 'prev',
                status: 'Lalu',
                sessions: 0
            });
        }

        // Tanggal aktif di bulan ini (Fleksibel: nanti jumlah sesi bisa di-mapping dari Supabase)
        for (let i = 1; i <= daysInMonth; i++) {
            const isMaint = i % 9 === 0;
            const sessionCount = isMaint ? 0 : (i % 5 === 0 ? 5 : (i % 3 === 0 ? 3 : 2));

            cells.push({
                date: i,
                type: 'curr',
                sessions: sessionCount,
                isMaintenance: isMaint,
                dot: sessionCount >= 4 ? 'dense' : (sessionCount > 0 ? 'normal' : 'maintenance'),
                status: sessionCount === 0 && !isMaint ? 'Kosong' : undefined,
                isActive: i === 28 // Contoh tanggal aktif
            });
        }

        // Sisa grid untuk bulan berikutnya agar genap 7 kolom
        const remainingSlots = (Math.ceil(cells.length / 7) * 7) - cells.length;
        for (let i = 1; i <= remainingSlots; i++) {
            cells.push({
                date: i,
                type: 'next',
                status: viewDate.toLocaleString('id-ID', { month: 'short' }),
                sessions: 0
            });
        }

        return cells;
    }, [viewDate]);

    // Handler ketika form blokir jadwal disubmit dari modal
    const handleSaveBlock = (blockData: {
        room: string;
        startDate: string;
        endDate: string;
        isAllDay: boolean;
        startTime: string;
        endTime: string;
        reason: string;
    }) => {
        console.log("Data Blokir Jadwal:", blockData);
        alert(`Berhasil memblokir jadwal untuk ${blockData.room} dari tanggal ${blockData.startDate} s/d ${blockData.endDate}!`);
        // TODO: Kirim data ini ke Supabase / API backend Anda
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
                    <div className={styles.pageHeader}>
                        <div>
                            <p className={styles.breadcrumb}>
                                Admin <ChevronRight size={12} className={styles.bcIcon} /> <strong>Rekap Kalender</strong>
                            </p>
                            <p className={styles.subMeta}>SPATIAL BOOKING GRID • Q4 SCHEDULE</p>
                            <h2 className={styles.pageTitle}>Rekap Kalender<br />Studio</h2>
                        </div>

                        <div className={styles.headerControls}>
                            <div className={styles.monthNav}>
                                <button onClick={handlePrevMonth} className={styles.iconBtn}><ChevronLeft size={16} /></button>
                                <span className={styles.monthText}><Calendar size={16} /> <span style={{ textTransform: 'capitalize' }}>{currentMonthLabel}</span></span>
                                <button onClick={handleNextMonth} className={styles.iconBtn}><ChevronRight size={16} /></button>
                            </div>

                            {/* Tombol Blokir Jadwal yang memicu Modal */}
                            <button onClick={() => setIsBlockModalOpen(true)} className={styles.blockBtn}>
                                <Lock size={14} /> + Blokir Jadwal
                            </button>

                            <div className={styles.roomFilter}>
                                {['Semua Room', 'Room A', 'Room B'].map(room => (
                                    <button
                                        key={room}
                                        onClick={() => setSelectedRoom(room)}
                                        className={`${styles.filterBtn} ${selectedRoom === room ? styles.filterActive : ''}`}
                                    >
                                        {room}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* STATS ROW DINAMIS */}
                    <div className={styles.statsRow}>
                        <div className={styles.statCard}>
                            <div>
                                <p className={styles.statLabel}>TOTAL SESI TERJADWAL</p>
                                <h3 className={styles.statValue}>0 <span className={styles.statSub}>Sesi Dikonfirmasi</span></h3>
                            </div>
                            <div className={styles.statIconBox}><CalendarDays size={20} /></div>
                        </div>
                        <div className={styles.statCard}>
                            <div>
                                <p className={styles.statLabel}>ROOM A OKUPANSI</p>
                                <h3 className={styles.statValue}>0% <span className={styles.badgeHigh}>Optimal</span></h3>
                                <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: '0%', background: '#000' }} /></div>
                            </div>
                            <div className={styles.statIconBoxLight}><Sun size={20} /></div>
                        </div>
                        <div className={styles.statCard}>
                            <div>
                                <p className={styles.statLabel}>ROOM B OKUPANSI</p>
                                <h3 className={styles.statValue}>0% <span className={styles.badgeOptimal}>Optimal</span></h3>
                                <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: '0%', background: '#94a3b8' }} /></div>
                            </div>
                            <div className={styles.statIconBoxLight}><Moon size={20} /></div>
                        </div>
                    </div>

                    {/* CALENDAR GRID DINAMIS */}
                    <div className={styles.calendarContainer}>
                        <div className={styles.daysHeader}>
                            <span>SEN</span><span>SEL</span><span>RAB</span><span>KAM</span><span>JUM</span><span className={styles.textBold}>SAB</span><span className={styles.textBold}>MIN</span>
                        </div>

                        <div className={styles.grid}>
                            {calendarCells.map((cell, idx) => {
                                const isPrevNext = cell.type !== 'curr';

                                return (
                                    <div key={idx} className={`${styles.cell} ${isPrevNext ? styles.cellDisabled : ''}`}>
                                        <div className={styles.cellTop}>
                                            <span className={isPrevNext ? styles.dateNumDisabled : styles.dateNum}>
                                                {String(cell.date).padStart(2, '0')}
                                            </span>
                                            {!isPrevNext && cell.dot === 'normal' && <div className={styles.dotNormal} />}
                                            {!isPrevNext && cell.dot === 'dense' && <div className={styles.dotDense} />}
                                            {!isPrevNext && cell.dot === 'maintenance' && <div className={styles.dotMaintenance} />}
                                        </div>

                                        <div className={styles.cellBottom}>
                                            {cell.status && <span className={styles.cellStatus}>{cell.status}</span>}

                                            {cell.isMaintenance && (
                                                <span className={styles.badgePerawatan}>PERAWATAN</span>
                                            )}

                                            {cell.sessions !== undefined && cell.sessions > 0 && !cell.isMaintenance && (
                                                <Link href="/admin/kalender/agenda" className={styles.sessionBtn} style={{ textDecoration: 'none' }}>
                                                    {cell.sessions} Sesi <ArrowRight size={14} />
                                                </Link>
                                            )}
                                        </div>
                                        {cell.isMaintenance && <Wrench size={14} className={styles.wrenchIcon} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className={styles.legendFooter}>
                        <div className={styles.legends}>
                            <div className={styles.legendItem}><div className={styles.dotNormal} /> 1-3 Sesi (Tersedia)</div>
                            <div className={styles.legendItem}><div className={styles.dotDense} /> 4-6 Sesi (Padat)</div>
                            <div className={styles.legendItem}><div className={styles.dotMaintenance} /> Maintenance / Libur</div>
                        </div>
                        <div className={styles.legendNote}>
                            <Info size={14} /> Klik tanggal untuk melihat rincian agenda harian penuh.
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Pop-up Blokir Jadwal */}
            <BlockScheduleModal
                isOpen={isBlockModalOpen}
                onClose={() => setIsBlockModalOpen(false)}
                onConfirm={handleSaveBlock}
            />
        </div>
    );
}
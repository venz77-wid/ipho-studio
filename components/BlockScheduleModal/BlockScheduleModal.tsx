'use client';

import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import styles from './BlockScheduleModal.module.css';

interface BlockScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (blockData: {
        room: string;
        startDate: string;
        endDate: string;
        isAllDay: boolean;
        startTime: string;
        endTime: string;
        reason: string;
    }) => void;
}

export default function BlockScheduleModal({ isOpen, onClose, onConfirm }: BlockScheduleModalProps) {
    // State dinamis untuk form blokir jadwal
    const [selectedRoom, setSelectedRoom] = useState('Semua Room');
    const [startDate, setStartDate] = useState('2025-10-13');
    const [endDate, setEndDate] = useState('2025-10-14');
    const [isAllDay, setIsAllDay] = useState(true);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('21:00');
    const [reason, setReason] = useState('Perbaikan AC Daylight Cyclorama & Pengecatan Lantai Tak Bertepi');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({
            room: selectedRoom,
            startDate,
            endDate,
            isAllDay,
            startTime,
            endTime,
            reason
        });
        onClose();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalCard}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div>
                        <span className={styles.badgeOperasional}>OPERASIONAL STUDIO</span>
                        <h2 className={styles.modalTitle}>Blokir Jadwal / Maintenance</h2>
                        <p className={styles.modalSubtitle}>Tutup ketersediaan slot publik untuk perbaikan teknis, shoot internal, atau hari libur studio.</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    {/* Pilih Ruangan */}
                    <div className={styles.formGroup}>
                        <label className={styles.labelTitle}>PILIH RUANGAN TERKENA DAMPAK</label>
                        <div className={styles.roomSelectGrid}>
                            {['Semua Room', 'Room A - Daylight', 'Room B - Cyclorama'].map((room) => (
                                <button
                                    key={room}
                                    type="button"
                                    onClick={() => setSelectedRoom(room)}
                                    className={`${styles.roomBtn} ${selectedRoom === room ? styles.roomBtnActive : ''}`}
                                >
                                    {room}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rentang Tanggal */}
                    <div className={styles.dateRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.labelTitle}>MULAI TANGGAL</label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={styles.inputField}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.labelTitle}>SELESAI TANGGAL</label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={styles.inputField}
                            />
                        </div>
                    </div>

                    {/* Opsi Seharian Penuh */}
                    <div className={styles.checkboxContainer}>
                        <label className={styles.checkboxLabel}>
                            <input 
                                type="checkbox" 
                                checked={isAllDay}
                                onChange={(e) => setIsAllDay(e.target.checked)}
                                className={styles.checkboxInput}
                            />
                            <span className={styles.checkboxText}>Seharian Penuh (All Day)</span>
                        </label>
                        <span className={styles.noteRight}>24 Jam Penutupan</span>
                    </div>

                    {/* Jam Mulai & Selesai (Disabled jika All Day aktif) */}
                    <div className={styles.dateRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.labelTitle}>JAM MULAI</label>
                            <input 
                                type="time" 
                                value={startTime}
                                disabled={isAllDay}
                                onChange={(e) => setStartTime(e.target.value)}
                                className={`${styles.inputField} ${isAllDay ? styles.disabledInput : ''}`}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.labelTitle}>JAM SELESAI</label>
                            <input 
                                type="time" 
                                value={endTime}
                                disabled={isAllDay}
                                onChange={(e) => setEndTime(e.target.value)}
                                className={`${styles.inputField} ${isAllDay ? styles.disabledInput : ''}`}
                            />
                        </div>
                    </div>

                    {/* Alasan / Catatan Teknis */}
                    <div className={styles.formGroup}>
                        <label className={styles.labelTitle}>ALASAN / CATATAN TEKNIS</label>
                        <textarea 
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className={styles.textareaField}
                            placeholder="Tuliskan alasan pemeliharaan atau penutupan jadwal..."
                        />
                    </div>

                    {/* Catatan Bawah */}
                    <div className={styles.infoAlertBox}>
                        <p className={styles.infoAlertText}>
                            ℹ️ Catatan ini akan tampil di agenda staf dan otomatis mengunci booking online pada rentang waktu ini.
                        </p>
                    </div>

                    {/* Footer Buttons */}
                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.batalBtn}>
                            Batal
                        </button>
                        <button type="submit" className={styles.konfirmasiBtn}>
                            <Lock size={16} /> Simpan Blokir
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
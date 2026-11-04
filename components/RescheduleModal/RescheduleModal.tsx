'use client';

import React, { useState } from 'react';
import { X, Calendar, MessageCircle, Check } from 'lucide-react';
import styles from './RescheduleModal.module.css';

interface SlotItem {
    time: string;
    status: 'tersedia' | 'penuh' | 'terpilih';
}

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderInfo: {
        id: string;
        customerName: string;
        customerPhone: string;
        packageName: string;
        roomName: string;
        currentSchedule: string;
    };
    onConfirm: (newDate: string, newSlot: string) => void;
}

export default function RescheduleModal({ isOpen, onClose, orderInfo, onConfirm }: RescheduleModalProps) {
    // State dinamis untuk tanggal dan slot baru
    const [selectedDate, setSelectedDate] = useState('2025-10-30');
    
    // Data slot jam yang dinamis (bisa di-fetch dari ketersediaan studio via API)
    const [slots, setSlots] = useState<SlotItem[]>([
        { time: '09:00 - 11:00', status: 'penuh' },
        { time: '11:30 - 13:30', status: 'tersedia' },
        { time: '14:00 - 16:00', status: 'terpilih' },
        { time: '16:30 - 18:30', status: 'tersedia' },
        { time: '19:00 - 21:00', status: 'penuh' },
        { time: '21:30 - 23:30', status: 'tersedia' },
    ]);

    if (!isOpen) return null;

    // Fungsi memilih slot jam secara dinamis
    const handleSelectSlot = (time: string) => {
        setSlots(slots.map(slot => ({
            ...slot,
            status: slot.time === time ? 'terpilih' : (slot.status === 'terpilih' ? 'tersedia' : slot.status)
        })));
    };

    const handleSubmitting = () => {
        const activeSlot = slots.find(s => s.status === 'terpilih')?.time || '';
        onConfirm(selectedDate, activeSlot);
        onClose();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalCard}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div>
                        <span className={styles.badgePermintaan}>PERMINTAAN RESCHEDULE</span>
                        <h2 className={styles.modalTitle}>Jadwalkan Ulang Pesanan</h2>
                        <p className={styles.modalSubtitle}>Pilih tanggal dan slot waktu baru yang tersedia untuk reservasi studio ini.</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                {/* Info Sesi Saat Ini (Read-Only) */}
                <div className={styles.readOnlyBox}>
                    <div className={styles.readOnlyHeader}>
                        <span className={styles.readOnlyLabel}>SESI SAAT INI (READ-ONLY)</span>
                        <span className={styles.orderIdBadge}>{orderInfo.id}</span>
                    </div>
                    <div className={styles.readOnlyGrid}>
                        <div>
                            <p className={styles.fieldSubLabel}>Pelanggan</p>
                            <p className={styles.fieldMainText}>{orderInfo.customerName}</p>
                            <p className={styles.fieldSubText}>{orderInfo.customerPhone}</p>
                        </div>
                        <div>
                            <p className={styles.fieldSubLabel}>Paket & Ruangan</p>
                            <p className={styles.fieldMainText}>{orderInfo.packageName}</p>
                            <p className={styles.fieldSubText}>{orderInfo.roomName}</p>
                        </div>
                    </div>
                    <div className={styles.currentScheduleBadge}>
                        <Calendar size={14} />
                        <span>{orderInfo.currentSchedule}</span>
                    </div>
                </div>

                {/* Tanggal Baru */}
                <div className={styles.sectionGroup}>
                    <label className={styles.labelTitle}>TANGGAL BARU</label>
                    <div className={styles.datePickerBox}>
                        <Calendar size={16} className={styles.calendarIcon} />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={styles.dateInput}
                        />
                    </div>
                </div>

                {/* Pilih Slot Jam Baru */}
                <div className={styles.sectionGroup}>
                    <div className={styles.slotHeaderRow}>
                        <label className={styles.labelTitle}>PILIH SLOT JAM BARU</label>
                        <div className={styles.legendRow}>
                            <span className={styles.legendItem}><div className={`${styles.dotLegend} ${styles.dotTerpilih}`} /> Terpilih</span>
                            <span className={styles.legendItem}><div className={`${styles.dotLegend} ${styles.dotTersedia}`} /> Tersedia</span>
                            <span className={styles.legendItem}><div className={`${styles.dotLegend} ${styles.dotPenuh}`} /> Penuh</span>
                        </div>
                    </div>

                    <div className={styles.slotsGrid}>
                        {slots.map((slot, idx) => {
                            const isSelected = slot.status === 'terpilih';
                            const isFull = slot.status === 'penuh';
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={isFull}
                                    onClick={() => handleSelectSlot(slot.time)}
                                    className={`${styles.slotButton} ${isSelected ? styles.slotSelected : ''} ${isFull ? styles.slotFull : ''}`}
                                >
                                    <span className={styles.slotTime}>{slot.time}</span>
                                    <span className={styles.slotStatusTxt}>
                                        {isSelected ? 'TERPILIH ✓' : (isFull ? 'PENUH' : 'TERSEDIA')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Notifikasi WhatsApp */}
                <div className={styles.waAlertBox}>
                    <MessageCircle size={16} className={styles.waIcon} />
                    <p className={styles.waText}>
                        Pemberitahuan perubahan jadwal dan barcode check-in baru akan otomatis dikirimkan via WhatsApp ke <strong>{orderInfo.customerPhone}</strong>.
                    </p>
                </div>

                {/* Footer Buttons */}
                <div className={styles.modalFooter}>
                    <button type="button" onClick={onClose} className={styles.batalBtn}>
                        Batal
                    </button>
                    <button type="button" onClick={handleSubmitting} className={styles.konfirmasiBtn}>
                        <Check size={16} /> Konfirmasi Reschedule
                    </button>
                </div>
            </div>
        </div>
    );
}
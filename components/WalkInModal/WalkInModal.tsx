'use client';

import React, { useState } from 'react';
import { X, User, Phone, Mail, Camera, Clock, Check, Printer } from 'lucide-react';
import styles from './WalkInModal.module.css';

interface WalkInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (walkInData: {
        name: string;
        whatsapp: string;
        email: string;
        package: string;
        room: string;
        timeSlot: string;
        photographer: string;
        total: number;
    }) => void;
}

export default function WalkInModal({ isOpen, onClose, onConfirm }: WalkInModalProps) {
    // State form dinamis untuk registrasi walk-in
    const [name, setName] = useState('Ardan Pratama');
    const [whatsapp, setWhatsapp] = useState('812-9988-7766');
    const [email, setEmail] = useState('ardan.p@gmail.com');
    const [selectedPackage, setSelectedPackage] = useState('Editorial Portrait & Wisuda - Rp 450.000');
    const [selectedRoom, setSelectedRoom] = useState('Studio Room A (Daylight Cyclorama)');
    const [selectedTime, setSelectedTime] = useState('15:00 - 16:00 WIB (Slot Siap)');
    const [photographer] = useState('Dimas Wicaksono (Standby Room A)');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({
            name,
            whatsapp: `+62 ${whatsapp}`,
            email,
            package: selectedPackage,
            room: selectedRoom,
            timeSlot: selectedTime,
            photographer,
            total: 450000
        });
        onClose();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalCard}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div>
                        <span className={styles.badgeFrontDesk}>FRONT DESK EXPRESS • SABTU, 28 OKT 2025</span>
                        <h2 className={styles.modalTitle}>Tambah Sesi Walk-in</h2>
                        <p className={styles.modalSubtitle}>Registrasi cepat untuk tamu studio yang datang langsung hari ini.</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    <div className={styles.twoColumnGrid}>
                        {/* KOLOM KIRI: DATA KLIEN */}
                        <div className={styles.sectionColumn}>
                            <div className={styles.columnTitleBox}>
                                <User size={14} />
                                <span>DATA KLIEN</span>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.labelTitle}>NAMA LENGKAP KLIEN *</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={styles.inputField}
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.labelTitle}>NOMOR WHATSAPP AKTIF *</label>
                                <div className={styles.phoneInputBox}>
                                    <span className={styles.countryCode}>+62</span>
                                    <input 
                                        type="text" 
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        className={styles.inputFieldPhone}
                                        required
                                    />
                                </div>
                                <span className={styles.helperText}>Tiket booking dan link foto resolusi tinggi akan dikirim ke nomor ini.</span>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.labelTitle}>EMAIL KLIEN / CATATAN SINGKAT (OPSIONAL)</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={styles.inputField}
                                />
                            </div>

                            <div className={styles.walkInInfoBox}>
                                <p className={styles.walkInInfoTitle}>Pelayanan Langsung (Walk-In)</p>
                                <p className={styles.walkInInfoDesc}>Tanpa booking online sebelumnya. Data tersimpan otomatis ke daftar kontak pelanggan studio.</p>
                            </div>
                        </div>

                        {/* KOLOM KANAN: DETAIL SESI HARI INI */}
                        <div className={styles.sectionColumn}>
                            <div className={styles.columnTitleBox}>
                                <Camera size={14} />
                                <span>DETAIL SESI HARI INI</span>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.labelTitle}>PAKET STUDIO *</label>
                                <select 
                                    value={selectedPackage}
                                    onChange={(e) => setSelectedPackage(e.target.value)}
                                    className={styles.selectField}
                                >
                                    <option>Editorial Portrait & Wisuda - Rp 450.000</option>
                                    <option>Self-Service Session - Rp 229.000</option>
                                    <option>Group & Family Photo - Rp 650.000</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.labelTitle}>RUANGAN STUDIO *</label>
                                <select 
                                    value={selectedRoom}
                                    onChange={(e) => setSelectedRoom(e.target.value)}
                                    className={styles.selectField}
                                >
                                    <option>Studio Room A (Daylight Cyclorama)</option>
                                    <option>Studio Room B (Infinity Cyclorama)</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.labelTitle}>PILIHAN JAM SESI HARI INI *</label>
                                <div className={styles.timeSelectBox}>
                                    <input 
                                        type="text" 
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        className={styles.inputField}
                                    />
                                    <Clock size={16} className={styles.clockIcon} />
                                </div>
                            </div>

                            <div className={styles.photographerBox}>
                                <div>
                                    <p className={styles.phLabel}>Fotografer Terjadwal</p>
                                    <p className={styles.phValue}>{photographer}</p>
                                </div>
                                <span className={styles.standbyBadge}>Standby</span>
                            </div>
                        </div>
                    </div>

                    {/* STATUS PEMBAYARAN KASIR & TOTAL */}
                    <div className={styles.paymentSummaryBox}>
                        <div>
                            <p className={styles.payStatusLabel}>STATUS PEMBAYARAN KASIR</p>
                            <p className={styles.payStatusVal}>✅ Lunas (Kasir / Tunai / EDC) <span className={styles.paySub}>Pembayaran di muka</span></p>
                        </div>
                        <div className={styles.totalBoxRight}>
                            <p className={styles.totalLabel}>TOTAL TAGIHAN WALK-IN</p>
                            <h3 className={styles.totalValue}>Rp 450.000</h3>
                            <p className={styles.totalSub}>Termasuk PPN 11% & fotografer standby 60 mnt</p>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className={styles.modalFooter}>
                        <div className={styles.footerNote}>
                            <Printer size={14} /> Tiket & lembar arahan gaya dicetak otomatis ke thermal printer.
                        </div>
                        <div className={styles.footerButtons}>
                            <button type="button" onClick={onClose} className={styles.batalBtn}>
                                Batal
                            </button>
                            <button type="submit" className={styles.confirmBtn}>
                                <Check size={16} /> Buat Pesanan & Cetak Tiket
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
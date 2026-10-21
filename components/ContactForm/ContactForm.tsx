import React from 'react';
import type { BookingFormData } from '@/lib/bookingTypes';
import styles from './ContactForm.module.css';

interface ContactFormProps {
    formData: BookingFormData;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export default function ContactForm({ formData, onChange }: ContactFormProps) {
    return (
        <div className={styles.sectionCard}>
            <div className={styles.header}>
                <span className={styles.sectionNumber}>02</span>
                <div>
                    <h2 className={styles.title}>Data Diri & Kontak</h2>
                    <p className={styles.subtitle}>
                        E-ticket studio dan konfirmasi pemesanan akan dikirimkan otomatis.
                    </p>
                </div>
            </div>

            <div className={styles.formGrid}>
                <div className={styles.inputGroupFull}>
                    <label className={styles.label}>NAMA LENGKAP SESUAI ID</label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={onChange}
                        placeholder="Nadia Larasati"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>NOMOR WHATSAPP AKTIF</label>
                    <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={onChange}
                        placeholder="+62 812-3456-7890"
                        className={styles.input}
                        required
                    />
                    <span className={styles.helperText}>Instruksi studio dan QR ticket masuk akan dikirim via WA.</span>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>ALAMAT EMAIL</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={onChange}
                        placeholder="nadia.larasati@example.com"
                        className={styles.input}
                        required
                    />
                    <span className={styles.helperText}>Untuk invoice resmi PPN & arsip digital hasil foto.</span>
                </div>

                <div className={styles.inputGroupFull}>
                    <label className={styles.label}>CATATAN KHUSUS / PERMINTAAN TEMA STUDIO (OPSIONAL)</label>
                    <textarea
                        name="specialNotes"
                        rows={3}
                        value={formData.specialNotes}
                        onChange={onChange}
                        placeholder="Misal: Request Backdrop warna Warm Oatmeal/Beige, total 4 orang keluarga..."
                        className={styles.textarea}
                    />
                </div>
            </div>
        </div>
    );
}
'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, Clock, Lock, X } from 'lucide-react';
import type { CatalogPackage } from '@/lib/catalogTypes';
import { formatRupiah } from '@/lib/catalogTypes';
import type { BookingFormData, PaymentMethod, PaymentScheme, TimeSlot } from '@/lib/bookingTypes';
import {
    PAYMENT_METHOD_LABEL,
    PAYMENT_SCHEME_LABEL,
    STUDIO_NAME,
    formatBookingDate,
} from '@/lib/bookingFormat';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
    open: boolean;
    packageData: CatalogPackage;
    selectedDate: string;
    selectedSlot: TimeSlot;
    formData: BookingFormData;
    paymentScheme: PaymentScheme;
    paymentMethod: PaymentMethod;
    /** Jumlah yang dibayar sekarang (DP atau lunas) */
    amountDue: number;
    isSubmitting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function ConfirmationModal({
    open,
    packageData,
    selectedDate,
    selectedSlot,
    formData,
    paymentScheme,
    paymentMethod,
    amountDue,
    isSubmitting,
    onClose,
    onConfirm,
}: ConfirmationModalProps): React.JSX.Element | null {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Tutup dengan Esc, kunci scroll halaman, fokus ke dialog
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === 'Escape' && !isSubmitting) onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialogRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, isSubmitting, onClose]);

    if (!open) return null;

    const rows: { label: string; value: string }[] = [
        { label: 'Paket Studio', value: packageData.title },
        {
            label: 'Jadwal Sesi',
            value: `${formatBookingDate(selectedDate)} (${selectedSlot.startTime} - ${selectedSlot.endTime} WIB)`,
        },
        { label: 'Studio', value: STUDIO_NAME },
        { label: 'Nama Pemesan', value: formData.fullName },
        { label: 'No. WhatsApp', value: formData.whatsapp },
        { label: 'Email', value: formData.email },
        {
            label: 'Metode & Skema',
            value: `${PAYMENT_METHOD_LABEL[paymentMethod]} (${PAYMENT_SCHEME_LABEL[paymentScheme]})`,
        },
    ];

    return (
        <div
            className={styles.overlay}
            onClick={() => {
                if (!isSubmitting) onClose();
            }}
        >
            <div
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="konfirmasi-title"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
            >
                <header className={styles.header}>
                    <div>
                        <h2 id="konfirmasi-title" className={styles.title}>
                            <BadgeCheck size={20} aria-hidden /> Konfirmasi Data Pemesanan
                        </h2>
                        <p className={styles.subtitle}>
                            Pastikan detail sesi dan data diri Anda sudah sesuai sebelum melanjutkan ke gateway
                            pembayaran.
                        </p>
                    </div>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Tutup"
                    >
                        <X size={16} aria-hidden />
                    </button>
                </header>

                <div className={styles.body}>
                    <div className={styles.pkg}>
                        <div className={styles.thumb}>
                            {packageData.imageSrc && (
                                <Image
                                    src={packageData.imageSrc}
                                    alt={packageData.title}
                                    fill
                                    sizes="80px"
                                    className={styles.thumbImg}
                                    style={{ objectPosition: packageData.imagePosition }}
                                />
                            )}
                        </div>
                        <div className={styles.pkgInfo}>
                            <div className={styles.pkgMeta}>
                                <span className={styles.chip}>{packageData.label}</span>
                                <span className={styles.duration}>
                                    <Clock size={12} aria-hidden /> {packageData.durationMinutes} Menit
                                </span>
                            </div>
                            <h3 className={styles.pkgTitle}>{packageData.title}</h3>
                            <p className={styles.pkgRoom}>{STUDIO_NAME}</p>
                        </div>
                    </div>

                    <dl className={styles.table}>
                        {rows.map((r) => (
                            <div key={r.label} className={styles.row}>
                                <dt>{r.label}</dt>
                                <dd>{r.value}</dd>
                            </div>
                        ))}
                    </dl>

                    <div className={styles.total}>
                        <div>
                            <span className={styles.totalLabel}>
                                {paymentScheme === 'dp' ? 'TOTAL DP (30%)' : 'TOTAL TAGIHAN'}
                            </span>
                            <p className={styles.totalNote}>Termasuk PPN &amp; asuransi alat</p>
                        </div>
                        <strong className={styles.totalAmount}>{formatRupiah(amountDue)}</strong>
                    </div>

                    <p className={styles.secure}>
                        <Lock size={13} aria-hidden /> Transaksi dienkripsi dengan standar keamanan perbankan
                        (SSL 256-bit).
                    </p>
                </div>

                <footer className={styles.footer}>
                    <button type="button" className={styles.back} onClick={onClose} disabled={isSubmitting}>
                        Kembali / Ubah Data
                    </button>
                    <button type="button" className={styles.next} onClick={onConfirm} disabled={isSubmitting}>
                        {isSubmitting ? 'Memproses...' : 'Lanjut Bayar'}
                        {!isSubmitting && <ArrowRight size={14} aria-hidden />}
                    </button>
                </footer>
            </div>
        </div>
    );
}
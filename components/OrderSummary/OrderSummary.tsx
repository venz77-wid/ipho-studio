import React from 'react';
import Image from 'next/image';
import { ArrowRight, ShieldCheck, Info, CircleCheck } from 'lucide-react';
import type { CatalogPackage } from '@/lib/catalogTypes';
import type { TimeSlot, PaymentScheme } from '@/lib/bookingTypes';
import { formatRupiah } from '@/lib/catalogTypes';
import styles from './OrderSummary.module.css';

interface OrderSummaryProps {
    packageData: CatalogPackage;
    selectedDate: string;
    selectedSlot: TimeSlot | null;
    paymentScheme: PaymentScheme;
    onConfirm: () => void;
    isSubmitting: boolean;
}

export default function OrderSummary({
    packageData,
    selectedDate,
    selectedSlot,
    paymentScheme,
    onConfirm,
    isSubmitting,
}: OrderSummaryProps) {
    const total = packageData.price;
    const paidAmount = paymentScheme === 'dp' ? total * 0.3 : total;

    return (
        <aside className={styles.sidebarCard}>
            <div className={styles.headerRow}>
                <h2 className={styles.title}>Ringkasan Pesanan</h2>
                <span className={styles.categoryBadge}>{packageData.label}</span>
            </div>

            {/* Gambar Paket */}
            {packageData.imageSrc && (
                <div className={styles.mediaContainer}>
                    <Image
                        src={packageData.imageSrc}
                        alt={packageData.title}
                        fill
                        className={styles.image}
                    />
                </div>
            )}

            <h3 className={styles.pkgTitle}>{packageData.title}</h3>
            <p className={styles.pkgDesc}>{packageData.description}</p>

            {/* Fitur Paket */}
            <ul className={styles.featureList}>
                {packageData.features.map((feat) => (
                    <li key={feat} className={styles.featureItem}>
                        <CircleCheck size={14} className={styles.checkIcon} />
                        <span>{feat}</span>
                    </li>
                ))}
            </ul>

            {/* Detail Jadwal */}
            <div className={styles.scheduleBox}>
                <span className={styles.scheduleLabel}>JADWAL SESI TERPILIH</span>
                <p className={styles.scheduleValue}>
                    {selectedDate} | {selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime} WIB` : 'Belum Dipilih'}
                </p>
                <p className={styles.roomText}>Studio Room A (Daylight Cyclorama)</p>
            </div>

            {/* Rincian Biaya */}
            <div className={styles.priceBreakdown}>
                <div className={styles.priceRow}>
                    <span>Biaya Sewa Paket Studio</span>
                    <span>{formatRupiah(packageData.price)}</span>
                </div>
                <div className={styles.priceRow}>
                    <span>Pemeliharaan Alat & Lighting</span>
                    <span className={styles.freeText}>Rp 0 (Gratis)</span>
                </div>
                <div className={styles.priceRow}>
                    <span>Garansi Reschedule (1x)</span>
                    <span>Termasuk</span>
                </div>
            </div>

            <div className={styles.totalRow}>
                <div>
                    <span className={styles.totalLabel}>
                        {paymentScheme === 'dp' ? 'Total Pembayaran DP (30%)' : 'Total Pembayaran'}
                    </span>
                    <p className={styles.totalAmount}>{formatRupiah(paidAmount)}</p>
                </div>
            </div>

            <button
                onClick={onConfirm}
                disabled={isSubmitting || !selectedSlot}
                className={styles.ctaButton}
            >
                {isSubmitting ? 'Memproses...' : 'Konfirmasi & Lanjut Bayar'}
                <ArrowRight size={16} />
            </button>

            <div className={styles.securityText}>
                <ShieldCheck size={14} />
                <span>Enkripsi SSL 256-bit • Pembayaran Terproteksi</span>
            </div>

            {/* Informasi Ketentuan */}
            <div className={styles.infoBox}>
                <div className={styles.infoTitle}>
                    <Info size={14} />
                    <span>Ketentuan Datang Tepat Waktu</span>
                </div>
                <p className={styles.infoDesc}>
                    Disarankan hadir 15 menit sebelum sesi foto untuk persiapan makeup dan fitting kostum. Reschedule gratis dapat diajukan minimal H-2 sesi.
                </p>
            </div>
        </aside>
    );
}
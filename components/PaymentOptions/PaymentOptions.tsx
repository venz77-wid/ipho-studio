import React from 'react';
import { CheckCircle2, QrCode } from 'lucide-react';
import type { PaymentScheme, PaymentMethod } from '@/lib/bookingTypes';
import { formatRupiah } from '@/lib/catalogTypes';
import styles from './PaymentOptions.module.css';

interface PaymentOptionsProps {
    packagePrice: number;
    paymentScheme: PaymentScheme;
    onSelectScheme: (scheme: PaymentScheme) => void;
    paymentMethod: PaymentMethod;
    onSelectMethod: (method: PaymentMethod) => void;
}

export default function PaymentOptions({
    packagePrice,
    paymentScheme,
    onSelectScheme,
    paymentMethod,
    onSelectMethod,
}: PaymentOptionsProps) {
    const dpAmount = packagePrice * 0.3;

    return (
        <div className={styles.sectionCard}>
            <div className={styles.header}>
                <span className={styles.sectionNumber}>03</span>
                <div>
                    <h2 className={styles.title}>Metode & Skema Pembayaran</h2>
                    <p className={styles.subtitle}>Pilih sistem pembayaran fleksibel yang Anda kehendaki.</p>
                </div>
            </div>

            {/* Skema Pembayaran */}
            <div className={styles.subSection}>
                <label className={styles.sectionLabel}>SKEMA PEMBAYARAN</label>
                <div className={styles.schemeGrid}>
                    <div
                        onClick={() => onSelectScheme('dp')}
                        className={`${styles.schemeCard} ${paymentScheme === 'dp' ? styles.selectedCard : ''}`}
                    >
                        <div className={styles.schemeHeader}>
                            <span className={styles.schemeTitle}>Uang Muka (DP 30%)</span>
                            {paymentScheme === 'dp' && <CheckCircle2 size={16} />}
                        </div>
                        <p className={styles.schemePrice}>{formatRupiah(dpAmount)}</p>
                        <p className={styles.schemeDesc}>
                            Sisa {formatRupiah(packagePrice - dpAmount)} dapat dilunasi di studio saat sesi foto.
                        </p>
                    </div>

                    <div
                        onClick={() => onSelectScheme('full')}
                        className={`${styles.schemeCard} ${paymentScheme === 'full' ? styles.selectedCard : ''}`}
                    >
                        <div className={styles.schemeHeader}>
                            <span className={styles.schemeTitle}>Bayar Lunas (100%)</span>
                            {paymentScheme === 'full' && <CheckCircle2 size={16} />}
                        </div>
                        <p className={styles.schemePrice}>{formatRupiah(packagePrice)}</p>
                        <p className={styles.schemeDesc}>
                            Proses check-out cepat & prioritas antrean editing foto.
                        </p>
                    </div>
                </div>
            </div>

            {/* Jalur Pembayaran */}
            <div className={styles.subSection}>
                <label className={styles.sectionLabel}>PILIHAN JALUR PEMBAYARAN</label>
                <div className={styles.methodList}>
                    <label className={`${styles.methodCard} ${paymentMethod === 'qris' ? styles.activeMethod : ''}`}>
                        <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'qris'}
                            onChange={() => onSelectMethod('qris')}
                        />
                        <div className={styles.methodInfo}>
                            <div className={styles.methodTitleRow}>
                                <span className={styles.methodTitle}>QRIS Instant</span>
                                <span className={styles.badgeAuto}>Verifikasi Otomatis</span>
                            </div>
                            <span className={styles.methodSub}>BCA Mobile, Mandiri Livin, GoPay, OVO, ShopeePay, DANA</span>
                        </div>
                        <QrCode size={20} className={styles.methodLogo} />
                    </label>

                    <label className={`${styles.methodCard} ${paymentMethod === 'bca_va' ? styles.activeMethod : ''}`}>
                        <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'bca_va'}
                            onChange={() => onSelectMethod('bca_va')}
                        />
                        <div className={styles.methodInfo}>
                            <span className={styles.methodTitle}>BCA Virtual Account</span>
                            <span className={styles.methodSub}>Pembayaran instan 24 jam via BCA atau KlikBCA</span>
                        </div>
                        <span className={styles.textLogo}>BCA</span>
                    </label>

                    <label className={`${styles.methodCard} ${paymentMethod === 'mandiri_va' ? styles.activeMethod : ''}`}>
                        <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'mandiri_va'}
                            onChange={() => onSelectMethod('mandiri_va')}
                        />
                        <div className={styles.methodInfo}>
                            <span className={styles.methodTitle}>Mandiri Virtual Account</span>
                            <span className={styles.methodSub}>Konfirmasi otomatis via Livin' by Mandiri</span>
                        </div>
                        <span className={styles.textLogo}>MANDIRI</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
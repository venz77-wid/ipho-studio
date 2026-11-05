'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Clock, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { formatRupiah } from '@/lib/catalogTypes';
import { PAYMENT_METHOD_LABEL, formatBookingDate } from '@/lib/bookingFormat';
import { ORDER_ID_RE, type BookingPhase, type MyBooking } from '@/lib/myBookingTypes';
import { getSavedOrderIds, saveOrderId } from '@/lib/myBookingsStorage';
import styles from './page.module.css';

type Tab = 'aktif' | 'selesai';

function badge(b: MyBooking): { text: string; cls: string } {
    const map: Record<BookingPhase, { text: string; cls: string }> = {
        waiting: { text: 'Menunggu Pembayaran', cls: styles.bWaiting },
        active: { text: 'Terkonfirmasi', cls: styles.bActive },
        done: { text: 'Selesai', cls: styles.bDone },
        failed: { text: b.status === 'expired' ? 'Kedaluwarsa' : 'Dibatalkan', cls: styles.bFailed },
    };
    return map[b.phase];
}

export default function PaketSayaPage(): React.JSX.Element {
    const [bookings, setBookings] = useState<MyBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('aktif');
    const [returnedId, setReturnedId] = useState<string | null>(null);

    const load = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);
        const ids = getSavedOrderIds();
        if (ids.length === 0) {
            setBookings([]);
            setLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/booking/mine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderIds: ids }),
            });
            const data = (await res.json()) as { bookings?: MyBooking[]; error?: string };
            if (!res.ok) throw new Error(data.error || 'Gagal memuat pesanan.');
            setBookings(data.bookings ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Gagal memuat pesanan.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Midtrans mengirim user kembali dengan ?order_id=...
        const id = new URLSearchParams(window.location.search).get('order_id');
        if (id && ORDER_ID_RE.test(id)) {
            saveOrderId(id);
            setReturnedId(id);
        }
        void load();
    }, [load]);

    const shown = bookings.filter((b) =>
        tab === 'aktif' ? b.phase === 'waiting' || b.phase === 'active' : b.phase === 'done' || b.phase === 'failed',
    );
    const returned = returnedId ? bookings.find((b) => b.orderId === returnedId) : undefined;

    return (
        <>
            <Navbar />
            <main className={styles.main}>
                <div className={styles.container}>
                    <span className={styles.eyebrow}>RIWAYAT PEMESANAN</span>
                    <div className={styles.head}>
                        <h1 className={styles.h1}>Paket Saya</h1>
                        <button type="button" className={styles.refresh} onClick={() => void load()} disabled={loading}>
                            <RefreshCw size={14} aria-hidden /> Perbarui Status
                        </button>
                    </div>
                    <p className={styles.lead}>Pantau sesi foto yang sedang berjalan dan riwayat pesanan Anda.</p>

                    {returned && (
                        <div className={returned.phase === 'active' ? styles.noticeOk : styles.noticeInfo} role="status">
                            {returned.phase === 'active' && 'Pembayaran berhasil diterima. Sesi Anda sudah terkonfirmasi.'}
                            {returned.phase === 'waiting' && 'Pembayaran belum selesai. Selesaikan pembayaran sebelum waktunya habis.'}
                            {returned.phase === 'failed' && 'Pembayaran tidak berhasil atau dibatalkan. Anda dapat memesan ulang.'}
                            {returned.phase === 'done' && 'Pesanan ini sudah selesai.'}
                        </div>
                    )}

                    <div className={styles.tabs} role="tablist">
                        {(['aktif', 'selesai'] as const).map((t) => (
                            <button
                                key={t}
                                role="tab"
                                aria-selected={tab === t}
                                className={tab === t ? `${styles.tab} ${styles.tabOn}` : styles.tab}
                                onClick={() => setTab(t)}
                            >
                                {t === 'aktif' ? 'Aktif' : 'Selesai'}
                            </button>
                        ))}
                    </div>

                    {loading && <p className={styles.state}>Memuat pesanan...</p>}
                    {error && <p className={styles.state}>{error}</p>}
                    {!loading && !error && shown.length === 0 && (
                        <div className={styles.empty}>
                            <p>{tab === 'aktif' ? 'Belum ada paket aktif.' : 'Belum ada riwayat selesai.'}</p>
                            <Link href="/katalog" className={styles.btnDark}>Lihat Katalog Paket</Link>
                        </div>
                    )}

                    <div className={styles.list}>
                        {shown.map((b) => {
                            const bd = badge(b);
                            return (
                                <article key={b.orderId} className={styles.card}>
                                    <div className={styles.thumb}>
                                        {b.imageSrc && (
                                            <Image
                                                src={b.imageSrc}
                                                alt={b.packageTitle}
                                                fill
                                                sizes="120px"
                                                className={styles.thumbImg}
                                                style={{ objectPosition: b.imagePosition }}
                                            />
                                        )}
                                    </div>
                                    <div className={styles.info}>
                                        <div className={styles.tags}>
                                            {b.packageLabel && <span className={styles.chip}>{b.packageLabel}</span>}
                                            <span className={`${styles.badge} ${bd.cls}`}>{bd.text}</span>
                                        </div>
                                        <h2 className={styles.title}>{b.packageTitle}</h2>
                                        <p className={styles.meta}>
                                            <CalendarDays size={13} aria-hidden /> {formatBookingDate(b.bookingDate)}
                                            <Clock size={13} aria-hidden /> {b.startTime} - {b.endTime} WIB
                                        </p>
                                        <p className={styles.small}>
                                            No. Pesanan {b.orderId} • {PAYMENT_METHOD_LABEL[b.paymentMethod]}
                                        </p>
                                        <p className={styles.price}>
                                            {formatRupiah(b.paidAmount)}
                                            {b.paymentScheme === 'dp' && (
                                                <span> DP 30% dari {formatRupiah(b.totalAmount)}, sisa dibayar di studio</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className={styles.actions}>
                                        {b.phase === 'waiting' && b.paymentUrl && (
                                            <a href={b.paymentUrl} className={styles.btnDark}>Lanjutkan Pembayaran</a>
                                        )}
                                        {(b.phase === 'done' || b.phase === 'failed') && (
                                            <Link href="/katalog" className={styles.btnLight}>Pesan Lagi</Link>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import type { ReactNode } from 'react';
import BookingStepper from '@/components/BookingStepper/BookingStepper';
import SchedulePicker from '@/components/SchedulePicker/SchedulePicker';
import ContactForm from '@/components/ContactForm/ContactForm';
import PaymentOptions from '@/components/PaymentOptions/PaymentOptions';
import OrderSummary from '@/components/OrderSummary/OrderSummary';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';


import { getPackageBySlug, getAvailableStartTimes } from '@/lib/bookings';
import { getDefaultDate } from '@/lib/scheduleUtils';
import type { CatalogPackage } from '@/lib/catalogTypes';
import type { BookingFormData, TimeSlot, PaymentScheme, PaymentMethod } from '@/lib/bookingTypes';
import { saveOrderId } from '@/lib/myBookingsStorage';

import styles from './page.module.css';

interface BookingPageProps {
    searchParams: Promise<{ paket?: string }>;
}

export default function BookingPage({ searchParams, footer }: BookingPageProps & { footer: ReactNode }) {
    const params = use(searchParams);
    const packageSlug = params.paket || 'graduation-solo-editorial';

    const [packageData, setPackageData] = useState<CatalogPackage | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State Form Booking
    const [selectedDate, setSelectedDate] = useState<string>(() => getDefaultDate());
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [paymentScheme, setPaymentScheme] = useState<PaymentScheme>('full');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');

    const [scheduleAttempt, setScheduleAttempt] = useState(0);
    const [schedule, setSchedule] = useState<{
        key: string;
        starts: string[];
        failed: boolean;
    } | null>(null);
    const scheduleKey = JSON.stringify([packageSlug, selectedDate, scheduleAttempt]);
    const currentSchedule = schedule?.key === scheduleKey ? schedule : null;
    const submitting = useRef(false);
    const checkout = useRef<{ key: string; id: string } | null>(null);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const [formData, setFormData] = useState<BookingFormData>({
        packageSlug,
        bookingDate: getDefaultDate(),
        startTime: '',
        endTime: '',
        fullName: '',
        whatsapp: '',
        email: '',
        specialNotes: '',
        paymentScheme: 'full',
        paymentMethod: 'qris',
    });

    // Effect untuk mengambil data paket
    useEffect(() => {
        async function fetchPackage() {
            try {
                const pkg = await getPackageBySlug(packageSlug);
                setPackageData(pkg);
            } catch (err) {
                console.error('Gagal memuat paket:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchPackage();
    }, [packageSlug]);

    useEffect(() => {
        const controller = new AbortController();
        getAvailableStartTimes(selectedDate, packageSlug, controller.signal)
            .then((starts) => {
                if (!controller.signal.aborted) setSchedule({ key: scheduleKey, starts, failed: false });
            })
            .catch(() => {
                if (!controller.signal.aborted) setSchedule({ key: scheduleKey, starts: [], failed: true });
            });
        return () => controller.abort();
    }, [selectedDate, packageSlug, scheduleKey]);

    // Ganti tanggal: jam yang dipilih direset karena ketersediaan tiap hari berbeda
    const handleSelectDate = (date: string) => {
        setSelectedDate(date);
        setSelectedSlot(null);
        setFormData((prev) => ({ ...prev, bookingDate: date, startTime: '', endTime: '' }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSlotSelect = (slot: TimeSlot) => {
        setSelectedSlot(slot);
        setFormData((prev) => ({
            ...prev,
            startTime: slot.startTime,
            endTime: slot.endTime,
        }));
    };

    // Klik "Konfirmasi & Lanjut Bayar": cek isian, lalu buka popup konfirmasi
    const handleOpenConfirm = () => {
        if (!packageData || !selectedSlot || !currentSchedule?.starts.includes(selectedSlot.startTime)) {
            alert('Silakan pilih jadwal terlebih dahulu.');
            return;
        }

        if (!formData.fullName || !formData.whatsapp || !formData.email) {
            alert('Mohon lengkapi data diri Anda.');
            return;
        }

        setIsConfirmOpen(true);
    };

    const handleSubmit = async () => {
        if (!packageData || !selectedSlot || submitting.current ||
            !currentSchedule?.starts.includes(selectedSlot.startTime)) return;

        submitting.current = true;
        setIsSubmitting(true);
        try {
            const payload = {
                packageSlug: packageData.slug,
                bookingDate: selectedDate,
                startTime: selectedSlot.startTime,
                fullName: formData.fullName.trim(),
                whatsapp: formData.whatsapp.trim(),
                email: formData.email.trim(),
                specialNotes: formData.specialNotes.trim(),
                paymentScheme,
                paymentMethod,
            };
            // Pertahankan nomor percobaan ketika permintaan harus dikirim ulang.
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
            const key = 'ipho-checkout:' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
            const requestId = checkout.current?.key === key
                ? checkout.current.id : sessionStorage.getItem(key) ?? crypto.randomUUID();
            checkout.current = { key, id: requestId };
            sessionStorage.setItem(key, requestId);

            const res = await fetch('/api/payments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, requestId }),
            });
            const data = await res.json();
            if (data.orderId) saveOrderId(data.orderId);
            if (!res.ok) {
                if (data.retryWithNewRequest) {
                    sessionStorage.removeItem(key);
                    checkout.current = null;
                }
                if (data.slotUnavailable) {
                    setIsConfirmOpen(false);
                    setSelectedSlot(null);
                    setScheduleAttempt((n) => n + 1);
                }
                throw new Error(data.error || 'Gagal membuat pembayaran.');
            }

            window.location.href = data.redirectUrl || '/paket-saya';
        } catch (err: unknown) {
            alert((err as Error).message || 'Terjadi kesalahan saat memproses pesanan.');
        } finally {
            submitting.current = false;
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main className={styles.loadingContainer}>
                <p>Memuat halaman pemesanan...</p>
            </main>
        );
    }

    if (!packageData) {
        return (
            <main className={styles.loadingContainer}>
                <p>Paket tidak ditemukan.</p>
            </main>
        );
    }

    return (
        <>
            <Navbar />
            <main className={styles.pageWrapper}>
                <div className={styles.container}>
                    {/* Breadcrumbs */}
                    <nav className={styles.breadcrumb}>
                        <span>Beranda</span> &gt; <span>Katalog Paket</span> &gt; <span className={styles.activeBreadcrumb}>Alur Pemesanan</span>
                    </nav>

                    {/* Stepper Header */}
                    <BookingStepper currentStep={1} />

                    {/* Grid Layout (2 Kolom) */}
                    <div className={styles.gridContainer}>
                        {/* Kolom Kiri - Form Utama */}
                        <div className={styles.mainColumn}>
                            <SchedulePicker
                                selectedDate={selectedDate}
                                onSelectDate={handleSelectDate}
                                selectedSlot={selectedSlot}
                                onSelectSlot={handleSlotSelect}
                                durationMinutes={packageData.durationMinutes}
                                availableStartTimes={currentSchedule?.starts ?? []}
                                availabilityLoading={!currentSchedule}
                                availabilityError={currentSchedule?.failed ?? false}
                                onRetryAvailability={() => setScheduleAttempt((n) => n + 1)}
                            />

                            <ContactForm
                                formData={formData}
                                onChange={handleInputChange}
                            />

                            <PaymentOptions
                                packagePrice={packageData.price}
                                paymentScheme={paymentScheme}
                                onSelectScheme={setPaymentScheme}
                                paymentMethod={paymentMethod}
                                onSelectMethod={setPaymentMethod}
                            />
                        </div>

                        {/* Kolom Kanan - Ringkasan Pesanan */}
                        <div className={styles.sidebarColumn}>
                            <OrderSummary
                                packageData={packageData}
                                selectedDate={selectedDate}
                                selectedSlot={selectedSlot}
                                paymentScheme={paymentScheme}
                                onConfirm={handleOpenConfirm}
                                isSubmitting={isSubmitting}
                            />
                        </div>
                    </div>
                </div>
            </main>
            {selectedSlot && (
                <ConfirmationModal
                    open={isConfirmOpen}
                    packageData={packageData}
                    selectedDate={selectedDate}
                    selectedSlot={selectedSlot}
                    formData={formData}
                    paymentScheme={paymentScheme}
                    paymentMethod={paymentMethod}
                    amountDue={
                        paymentScheme === 'dp' ? Math.round(packageData.price * 0.3) : packageData.price
                    }
                    isSubmitting={isSubmitting}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleSubmit}
                />
            )}
            {footer}
        </>
    );
}
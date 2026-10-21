'use client';

import React, { useState, useEffect, use } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import BookingStepper from '@/components/BookingStepper/BookingStepper';
import SchedulePicker from '@/components/SchedulePicker/SchedulePicker';
import ContactForm from '@/components/ContactForm/ContactForm';
import PaymentOptions from '@/components/PaymentOptions/PaymentOptions';
import OrderSummary from '@/components/OrderSummary/OrderSummary';

// TAMBAHAN 1: Import getBookedSlots
import { getPackageBySlug, createBooking, getBookedSlots } from '@/lib/bookings';
import type { CatalogPackage } from '@/lib/catalogTypes';
import type { BookingFormData, TimeSlot, PaymentScheme, PaymentMethod } from '@/lib/bookingTypes';

import styles from './page.module.css';

interface BookingPageProps {
    searchParams: Promise<{ paket?: string }>;
}

export default function BookingPage({ searchParams }: BookingPageProps) {
    const params = use(searchParams);
    const packageSlug = params.paket || 'editorial-portrait';

    const [packageData, setPackageData] = useState<CatalogPackage | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State Form Booking
    const [selectedDate, setSelectedDate] = useState('2026-10-28');
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [paymentScheme, setPaymentScheme] = useState<PaymentScheme>('full');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');

    // TAMBAHAN 2: State untuk menyimpan jam yang sudah dipesan
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);

    const [formData, setFormData] = useState<BookingFormData>({
    packageSlug,
    bookingDate: '2026-10-28', 
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

    // TAMBAHAN 3: Effect untuk mengecek ketersediaan jam setiap kali tanggal berubah
    useEffect(() => {
        async function fetchBookedSlots() {
            try {
                const slots = await getBookedSlots(selectedDate);
                setBookedSlots(slots);
                
                // Jika jam yang sedang dipilih ternyata sudah penuh di tanggal yang baru, reset pilihannya
                if (selectedSlot && slots.includes(selectedSlot.startTime)) {
                    setSelectedSlot(null);
                    setFormData((prev) => ({ ...prev, startTime: '', endTime: '' }));
                }
            } catch (err) {
                console.error('Gagal mengecek ketersediaan slot:', err);
            }
        }
        fetchBookedSlots();
    }, [selectedDate, selectedSlot]);

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

    const handleSubmit = async () => {
        if (!packageData || !selectedSlot) {
            alert('Silakan pilih jadwal terlebih dahulu.');
            return;
        }

        if (!formData.fullName || !formData.whatsapp || !formData.email) {
            alert('Mohon lengkapi data diri Anda.');
            return;
        }

        setIsSubmitting(true);
        try {
            const paidAmount = paymentScheme === 'dp' ? packageData.price * 0.3 : packageData.price;

            await createBooking({
                ...formData,
                packageId: packageData.id,
                bookingDate: selectedDate,
                paymentScheme,
                paymentMethod,
                totalAmount: packageData.price,
                paidAmount,
            });

            alert('Pemesanan berhasil dibuat! Anda akan diarahkan ke instruksi pembayaran.');
        } catch (err: unknown) {
            const error = err as Error;
            alert(error.message || 'Terjadi kesalahan saat memproses pesanan.');
        } finally {
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
                                onSelectDate={setSelectedDate}
                                selectedSlot={selectedSlot}
                                onSelectSlot={handleSlotSelect}
                                durationMinutes={packageData.durationMinutes}
                                // TAMBAHAN 4: Lempar data slot penuh ke komponen
                                bookedSlots={bookedSlots}
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
                                onConfirm={handleSubmit}
                                isSubmitting={isSubmitting}
                            />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
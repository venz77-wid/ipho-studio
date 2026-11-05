// Tipe bersama untuk "Paket Saya" (aman dipakai di server & client).
export type BookingPhase = 'waiting' | 'active' | 'done' | 'failed';

// Contoh: IPHO-MH3K9X2A-1A2B3C4D5E6F7A8B
export const ORDER_ID_RE = /^IPHO-[A-Z0-9]{4,12}-[A-F0-9]{16}$/;

export interface MyBooking {
    orderId: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
    phase: BookingPhase;
    packageTitle: string;
    packageLabel: string;
    imageSrc: string | null;
    imagePosition: string;
    durationMinutes: number;
    bookingDate: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    paymentScheme: 'dp' | 'full';
    paymentMethod: 'qris' | 'bca_va' | 'mandiri_va';
    totalAmount: number;
    paidAmount: number;
    paymentUrl: string | null;
    createdAt: string;
}
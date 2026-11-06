// Tipe & helper bersama untuk data admin (aman dipakai di server dan client).
export type AdminTab = 'Semua' | 'Hari Ini' | 'Menunggu Konfirmasi' | 'Lunas';
export const ADMIN_TABS: AdminTab[] = ['Semua', 'Hari Ini', 'Menunggu Konfirmasi', 'Lunas'];
export const ADMIN_PAGE_SIZE = 10;

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';
export type Scheme = 'dp' | 'full';

export function paymentStatusLabel(status: BookingStatus, scheme: Scheme): string {
    if (status === 'confirmed') return scheme === 'dp' ? 'DP 30% Terverifikasi' : 'Lunas 100%';
    if (status === 'pending') return 'Menunggu Pembayaran';
    if (status === 'expired') return 'Kedaluwarsa';
    return 'Dibatalkan';
}

export interface AdminOrderRow {
    orderId: string;
    customerName: string;
    customerEmail: string;
    packageLabel: string;
    packageTitle: string;
    bookingDate: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    durationMinutes: number;
    status: BookingStatus;
    paymentScheme: Scheme;
    paymentLabel: string;
}

export interface AdminDashboardResponse {
    stats: {
        totalSessionsToday: number;
        completedSessions: number;
        upcomingSessions: number;
        revenueMonth: number;
        paidOrdersMonth: number;
        pendingPayments: number;
        monthLabel: string;
    };
    orders: AdminOrderRow[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        showingStart: number;
        showingEnd: number;
    };
}

export interface AdminOrderDetail {
    orderId: string;
    status: BookingStatus;
    paymentScheme: Scheme;
    paymentMethod: 'qris' | 'bca_va' | 'mandiri_va';
    createdAt: string | null; // ISO
    paidAt: string | null; // ISO
    bookingDate: string;
    startTime: string;
    endTime: string;
    fullName: string;
    whatsapp: string;
    email: string;
    specialNotes: string | null;
    roomName: string | null;
    requiresScheduleReview: boolean;
    totalAmount: number;
    paidAmount: number;
    package: {
        title: string;
        label: string;
        description: string;
        imageSrc: string | null;
        durationMinutes: number;
    };
}

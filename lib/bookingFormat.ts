// Helper format tampilan untuk halaman booking (file baru, tidak mengubah file lama).
import type { PaymentMethod, PaymentScheme } from './bookingTypes';

export const STUDIO_NAME = 'Studio Room A (Daylight Cyclorama)';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** '2026-10-28' -> 'Rabu, 28 Okt 2026' (tanpa efek zona waktu) */
export function formatBookingDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    const date = new Date(y, m - 1, d);
    return `${DAYS[date.getDay()]}, ${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
    qris: 'QRIS Instant',
    bca_va: 'BCA Virtual Account',
    mandiri_va: 'Mandiri Virtual Account',
};

export const PAYMENT_SCHEME_LABEL: Record<PaymentScheme, string> = {
    dp: 'Uang Muka DP 30%',
    full: 'Bayar Lunas 100%',
};
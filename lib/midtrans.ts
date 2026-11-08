// Pembungkus API Midtrans (Snap + Status). Hanya dipakai di server.
import crypto from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';
import type { PaymentMethod } from './bookingTypes';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';

const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const SNAP_URL = isProd
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const API_URL = isProd ? 'https://api.midtrans.com/v2' : 'https://api.sandbox.midtrans.com/v2';

/** Pesanan yang belum dibayar otomatis batal setelah sekian menit (ubah angka ini saja). */
export const PENDING_TTL_MINUTES = 10;
export const SNAP_EXPIRY_MINUTES = PENDING_TTL_MINUTES; // batas waktu di halaman Midtrans
export const STALE_MS = PENDING_TTL_MINUTES * 60 * 1000;

/** Pemetaan metode di website -> kode channel Snap. */
export const ENABLED_PAYMENTS: Record<PaymentMethod, string[]> = {
    qris: ['other_qris'],
    bca_va: ['bca_va'],
    mandiri_va: ['echannel'], // Mandiri Bill Payment
};

function authHeader(): string {
    const key = process.env.MIDTRANS_SERVER_KEY;
    if (!key) throw new Error('MIDTRANS_SERVER_KEY belum diisi di .env.local');
    return 'Basic ' + Buffer.from(key + ':').toString('base64');
}

export function buildOrderId(requestId: string): string {
    const key = process.env.MIDTRANS_SERVER_KEY;
    if (!key) throw new Error('MIDTRANS_SERVER_KEY belum diisi.');
    const digest = crypto.createHmac('sha256', key)
        .update('ipho-checkout:' + requestId.toLowerCase()).digest('hex').toUpperCase();
    return `IPHO-${digest.slice(0, 12)}-${digest.slice(12, 28)}`;
}

export interface SnapPayload {
    transaction_details: { order_id: string; gross_amount: number };
    item_details: { id: string; price: number; quantity: number; name: string }[];
    customer_details: { first_name: string; email: string; phone: string };
    enabled_payments: string[];
    expiry: { unit: 'minutes'; duration: number };
    callbacks: { finish: string };
}

export async function createSnapTransaction(
    payload: SnapPayload,
): Promise<{ token: string; redirect_url: string }> {
    const res = await fetch(SNAP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: authHeader() },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        redirect_url?: string;
        error_messages?: string[];
    };
    if (!res.ok || !data.token || !data.redirect_url) {
        throw new Error(data.error_messages?.join(', ') || `Midtrans menolak permintaan (${res.status})`);
    }
    return { token: data.token, redirect_url: data.redirect_url };
}

/** Status transaksi di Midtrans. null = Midtrans belum mengenal pesanan ini. */
export async function getTransactionStatus(
    orderId: string,
): Promise<{ transaction_status: string; fraud_status?: string } | null> {
    const res = await fetch(`${API_URL}/${encodeURIComponent(orderId)}/status`, {
        headers: { Accept: 'application/json', Authorization: authHeader() },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as {
        status_code?: string;
        transaction_status?: string;
        fraud_status?: string;
    } | null;
    if (data?.status_code === '401') throw new Error('Server Key Midtrans salah atau tidak aktif');
    if (data?.status_code === '404' || res.status === 404) return null;
    if (!res.ok || !data?.transaction_status) throw new Error('Status Midtrans tidak dapat dipastikan.');
    return { transaction_status: data.transaction_status, fraud_status: data.fraud_status };
}

export function mapTransactionStatus(ts: string, fraud?: string): BookingStatus {
    if (ts === 'settlement' || (ts === 'capture' && fraud !== 'challenge')) return 'confirmed';
    if (ts === 'expire') return 'expired';
    if (['cancel', 'deny', 'failure', 'refund', 'partial_refund', 'chargeback'].includes(ts)) return 'cancelled';
    return 'pending';
}

/** Simpan hasil dari Midtrans ke database. */
export async function applyTransactionResult(
    orderId: string,
    ts: string,
    fraud?: string,
): Promise<BookingStatus> {
    const status = mapTransactionStatus(ts, fraud);
    if (status === 'pending') {
        const { data, error } = await supabaseAdmin.from('bookings')
            .select('status').eq('order_id', orderId).maybeSingle();
        if (error) throw error;
        return (data?.status ?? 'pending') as BookingStatus;
    }
    const patch: Record<string, string> = { midtrans_status: ts, status };
    if (status === 'confirmed') patch.paid_at = new Date().toISOString();

    let query = supabaseAdmin.from('bookings').update(patch).eq('order_id', orderId);
    // Pembayaran yang masuk terlambat tetap diakui selama jamnya belum diambil orang lain
    // (aturan database menolak jika jam itu sudah terisi).
    query = status === 'confirmed' ? query.in('status', ['pending', 'expired']) : query.eq('status', 'pending');

    const { data: updated, error } = await query.select('status').maybeSingle();
    if (error) {
        if (status !== 'confirmed' || !['23P01', '23514'].includes(error.code)) throw error;

        // Pembayaran berhasil, tetapi jadwalnya perlu ditangani manual.
        const { data: flagged, error: flagError } = await supabaseAdmin.from('bookings')
            .update({ midtrans_status: 'paid_room_conflict', paid_at: patch.paid_at })
            .eq('order_id', orderId).in('status', ['pending', 'expired'])
            .select('status').maybeSingle();
        if (flagError) throw flagError;
        if (flagged) {
            console.error('Pembayaran perlu rekonsiliasi ruangan:', orderId);
            return flagged.status as BookingStatus;
        }
    }

    if (updated) return updated.status as BookingStatus;
    const { data: current, error: readError } = await supabaseAdmin.from('bookings')
        .select('status').eq('order_id', orderId).maybeSingle();
    if (readError) throw readError;
    return (current?.status ?? status) as BookingStatus;
}

/** Tutup transaksi dan biarkan pengecekan status memastikan hasilnya. */
async function expireTransaction(orderId: string): Promise<void> {
    await fetch(`${API_URL}/${encodeURIComponent(orderId)}/expire`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: authHeader() },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
    });
}

export async function syncPendingBooking(orderId: string, createdAt: string): Promise<BookingStatus> {
    const isStale = Date.now() - new Date(createdAt).getTime() >= STALE_MS;

    let tx = await getTransactionStatus(orderId);
    if (tx && mapTransactionStatus(tx.transaction_status, tx.fraud_status) !== 'pending') {
        return applyTransactionResult(orderId, tx.transaction_status, tx.fraud_status);
    }
    if (!isStale) return 'pending';

    if (tx) {
        await expireTransaction(orderId);
        tx = await getTransactionStatus(orderId);
        return tx ? applyTransactionResult(orderId, tx.transaction_status, tx.fraud_status) : 'pending';
    }

    const { data, error } = await supabaseAdmin.from('bookings')
        .update({ status: 'expired', midtrans_status: 'expire' })
        .eq('order_id', orderId).eq('status', 'pending')
        .select('status').maybeSingle();
    if (error) throw error;
    if (data) return 'expired';

    const { data: current, error: readError } = await supabaseAdmin.from('bookings')
        .select('status').eq('order_id', orderId).maybeSingle();
    if (readError) throw readError;
    return (current?.status ?? 'expired') as BookingStatus;
}

export async function syncStaleBookingsForDate(date: string): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const { data, error } = await supabaseAdmin.from('bookings')
        .select('order_id, created_at')
        .eq('booking_date', date).eq('status', 'pending')
        .not('order_id', 'is', null).lt('created_at', cutoff)
        .or('midtrans_status.is.null,midtrans_status.neq.paid_room_conflict')
        .order('created_at').limit(12);
    if (error) throw error;
    const results = await Promise.allSettled((data ?? []).map(
        (row) => syncPendingBooking(row.order_id, row.created_at),
    ));
    for (const result of results) {
        if (result.status === 'rejected') console.error('Sinkronisasi pesanan tertunda:', result.reason);
    }
}

/** Rapikan semua pesanan pending sekaligus (dipakai dashboard admin). */
export async function syncPendingBatch(limit = 50): Promise<void> {
    // Sisa data lama tanpa nomor pesanan tidak mungkin dibayar -> langsung kedaluwarsa
    await supabaseAdmin.from('bookings').update({ status: 'expired' }).eq('status', 'pending').is('order_id', null);

    const { data } = await supabaseAdmin
        .from('bookings')
        .select('order_id, created_at')
        .eq('status', 'pending')
        .not('order_id', 'is', null)
        .order('created_at', { ascending: true }) // yang paling lama dibereskan dulu
        .limit(limit);

    const rows = data ?? [];
    for (let i = 0; i < rows.length; i += 10) {
        await Promise.all(
            rows.slice(i, i + 10).map(async (r) => {
                try {
                    await syncPendingBooking(r.order_id as string, r.created_at as string);
                } catch (e) {
                    console.error('Sinkron status gagal:', e);
                }
            }),
        );
    }
}

/** Verifikasi tanda tangan notifikasi (webhook) dari Midtrans. */
export function verifySignature(n: {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
}): boolean {
    const key = process.env.MIDTRANS_SERVER_KEY;
    if (!key || !n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false;
    const expected = crypto
        .createHash('sha512')
        .update(n.order_id + n.status_code + n.gross_amount + key)
        .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(n.signature_key);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
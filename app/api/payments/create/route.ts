import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { studioSlots, calculateEndTime, isSlotInPast } from '@/lib/scheduleUtils';
import { isBookingDate, loadRoomAvailability } from '@/lib/roomAvailability';
import {
    ENABLED_PAYMENTS,
    SNAP_EXPIRY_MINUTES,
    buildOrderId,
    createSnapTransaction,
    syncStaleBookingsForDate,
} from '@/lib/midtrans';
import type { PaymentMethod, PaymentScheme } from '@/lib/bookingTypes';

interface CreateBody {
    packageSlug: string;
    bookingDate: string;
    startTime: string;
    requestId: string;
    fullName: string;
    whatsapp: string;
    email: string;
    specialNotes?: string;
    paymentScheme: PaymentScheme;
    paymentMethod: PaymentMethod;
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

function validate(b: Partial<CreateBody>): string | null {
    if (typeof b.packageSlug !== 'string' || !b.packageSlug) return 'Paket tidak valid.';
    if (typeof b.bookingDate !== 'string' || !isBookingDate(b.bookingDate)) return 'Tanggal tidak valid.';
    if (typeof b.startTime !== 'string' || !studioSlots(b.bookingDate).some((s) => s.startTime === b.startTime)) {
        return 'Jam sesi tidak valid.';
    }
    if (typeof b.requestId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(b.requestId)) {
        return 'Percobaan checkout tidak valid. Muat ulang halaman booking.';
    }
    if (typeof b.fullName !== 'string' || b.fullName.trim().length < 2) return 'Nama lengkap wajib diisi.';
    if (typeof b.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())) return 'Email tidak valid.';
    if (typeof b.whatsapp !== 'string' || b.whatsapp.replace(/\D/g, '').length < 9) return 'Nomor WhatsApp tidak valid.';
    if (b.specialNotes != null && typeof b.specialNotes !== 'string') return 'Catatan tidak valid.';
    if (b.paymentScheme !== 'dp' && b.paymentScheme !== 'full') return 'Skema pembayaran tidak valid.';
    if (typeof b.paymentMethod !== 'string' || !Object.hasOwn(ENABLED_PAYMENTS, b.paymentMethod)) return 'Metode pembayaran tidak valid.';
    return null;
}

export async function POST(req: Request): Promise<NextResponse> {
    const body = (await req.json().catch(() => null)) as Partial<CreateBody> | null;
    if (!body) return fail(400, 'Permintaan tidak valid.');
    const invalid = validate(body);
    if (invalid) return fail(400, invalid);
    const b = body as CreateBody;

    if (isSlotInPast(b.bookingDate, b.startTime)) return fail(400, 'Jadwal sudah lewat. Pilih jam lain.');

    try {
        return await createPayment(b);
    } catch (error) {
        console.error('Gagal memulai checkout:', error);
        return fail(500, 'Gagal memulai checkout. Coba lagi.');
    }
}

async function createPayment(b: CreateBody): Promise<NextResponse> {
    const { data: pkg, error: packageError } = await supabaseAdmin
        .from('packages')
        .select('id, slug, title, price, duration_minutes')
        .eq('slug', b.packageSlug)
        .eq('is_active', true)
        .maybeSingle();
    if (packageError) throw packageError;
    if (!pkg) return fail(404, 'Paket tidak ditemukan.');

    const amountDue = b.paymentScheme === 'dp' ? Math.round(pkg.price * 0.3) : pkg.price;
    const endTime = calculateEndTime(b.startTime, pkg.duration_minutes);
    const orderId = buildOrderId(b.requestId);
    const email = b.email.trim();
    const packageId = pkg.id;

    async function findExistingOrder(): Promise<NextResponse | null> {
        const { data, error } = await supabaseAdmin.from('bookings')
            .select('status, payment_url, midtrans_status, email, package_id, booking_date, start_time, payment_scheme, payment_method')
            .eq('order_id', orderId).maybeSingle();
        if (error) throw error;
        if (!data) return null;

        if (data.email !== email || data.package_id !== packageId ||
            data.booking_date !== b.bookingDate || data.start_time.slice(0, 5) !== b.startTime ||
            data.payment_scheme !== b.paymentScheme || data.payment_method !== b.paymentMethod) {
            return fail(409, 'Data percobaan checkout tidak cocok. Muat ulang halaman booking.');
        }

        if (data.midtrans_status === 'paid_room_conflict') {
            return NextResponse.json({ orderId }, { status: 200 });
        }
        if (data.status === 'pending' && data.payment_url) {
            return NextResponse.json({ orderId, redirectUrl: data.payment_url });
        }
        if (data.status === 'confirmed') return NextResponse.json({ orderId });
        if (data.status === 'pending') {
            return NextResponse.json({ orderId, error: 'Pembayaran masih diproses. Tunggu sebentar lalu coba lagi.' }, { status: 409 });
        }
        return NextResponse.json({
            error: 'Pesanan ini sudah berakhir. Tekan lanjut bayar lagi untuk membuat pesanan baru.',
            retryWithNewRequest: true,
        }, { status: 409 });
    }

    await syncStaleBookingsForDate(b.bookingDate);
    const existing = await findExistingOrder();
    if (existing) return existing;

    const availableRooms = await loadRoomAvailability(b.bookingDate);
    let bookingId: string | undefined;
    for (const room of availableRooms(b.startTime, endTime)) {
        const reserveRoom = () => supabaseAdmin.from('bookings').insert({
            order_id: orderId,
            package_id: pkg.id,
            room_id: room.id,
            booking_date: b.bookingDate,
            start_time: b.startTime,
            end_time: endTime,
            full_name: b.fullName.trim(),
            whatsapp: b.whatsapp.trim(),
            email,
            special_notes: b.specialNotes?.trim() || null,
            payment_scheme: b.paymentScheme,
            payment_method: b.paymentMethod,
            total_amount: pkg.price,
            paid_amount: amountDue,
            status: 'pending',
        }).select('id').single();

        let result = await reserveRoom();
        // Dua transaksi bersamaan bisa membuat PostgreSQL membatalkan salah satunya.
        if (result.error?.code === '40P01') result = await reserveRoom();
        const { data, error } = result;

        if (!error) {
            bookingId = data.id;
            break;
        }
        if (error.code === '23514' && error.message.includes('jam operasional')) return fail(409, error.message);
        if (error.code !== '23P01' && error.code !== '23505') throw error;
        const concurrentOrder = await findExistingOrder();
        if (concurrentOrder) return concurrentOrder;
        if (error.code !== '23P01') throw error;
    }

    if (!bookingId) {
        const concurrentOrder = await findExistingOrder();
        if (concurrentOrder) return concurrentOrder;
        return NextResponse.json({ slotUnavailable: true, error: 'Semua ruangan untuk jam ini sudah terisi. Pilih jam lain.' }, { status: 409 });
    }

    // 4. Minta link pembayaran ke Midtrans
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    try {
        const snap = await createSnapTransaction({
            transaction_details: { order_id: orderId, gross_amount: amountDue },
            item_details: [
                {
                    id: pkg.slug,
                    price: amountDue,
                    quantity: 1,
                    name: `${pkg.title}${b.paymentScheme === 'dp' ? ' (DP 30%)' : ''}`.slice(0, 50),
                },
            ],
            customer_details: { first_name: b.fullName.trim(), email: b.email.trim(), phone: b.whatsapp.trim() },
            enabled_payments: ENABLED_PAYMENTS[b.paymentMethod],
            expiry: { unit: 'minutes', duration: SNAP_EXPIRY_MINUTES },
            callbacks: { finish: `${siteUrl}/paket-saya` },
        });

        const { error } = await supabaseAdmin.from('bookings')
            .update({ payment_url: snap.redirect_url }).eq('id', bookingId);
        if (error) throw error;
        return NextResponse.json({ orderId, redirectUrl: snap.redirect_url });
    } catch (error) {
        // Jika hasil permintaan Midtrans belum pasti, tahan ruangan sampai sinkronisasi.
        console.error('Tautan pembayaran belum tersimpan:', error);
        return NextResponse.json({ orderId, error: 'Tautan pembayaran belum tersedia. Coba lagi dengan pesanan yang sama.' }, { status: 502 });
    }
}

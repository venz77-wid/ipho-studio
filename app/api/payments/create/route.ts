import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { SLOT_START_TIMES, calculateEndTime, isSlotInPast, overlapsAny } from '@/lib/scheduleUtils';
import {
    ENABLED_PAYMENTS,
    SNAP_EXPIRY_MINUTES,
    STALE_MS,
    buildOrderId,
    createSnapTransaction,
    syncPendingBooking,
} from '@/lib/midtrans';
import type { PaymentMethod, PaymentScheme } from '@/lib/bookingTypes';

interface CreateBody {
    packageSlug: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    fullName: string;
    whatsapp: string;
    email: string;
    specialNotes?: string;
    paymentScheme: PaymentScheme;
    paymentMethod: PaymentMethod;
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

function validate(b: Partial<CreateBody>): string | null {
    if (!b.packageSlug) return 'Paket tidak valid.';
    if (!b.bookingDate || !/^\d{4}-\d{2}-\d{2}$/.test(b.bookingDate)) return 'Tanggal tidak valid.';
    if (!b.startTime || !/^\d{2}:\d{2}$/.test(b.startTime)) return 'Jam mulai tidak valid.';
    if (!b.endTime || !/^\d{2}:\d{2}$/.test(b.endTime)) return 'Jam selesai tidak valid.';
    if (!b.fullName || b.fullName.trim().length < 2) return 'Nama lengkap wajib diisi.';
    if (!b.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return 'Email tidak valid.';
    if (!b.whatsapp || b.whatsapp.replace(/\D/g, '').length < 9) return 'Nomor WhatsApp tidak valid.';
    if (b.paymentScheme !== 'dp' && b.paymentScheme !== 'full') return 'Skema pembayaran tidak valid.';
    if (!b.paymentMethod || !(b.paymentMethod in ENABLED_PAYMENTS)) return 'Metode pembayaran tidak valid.';
    return null;
}

export async function POST(req: Request): Promise<NextResponse> {
    const body = (await req.json().catch(() => null)) as Partial<CreateBody> | null;
    if (!body) return fail(400, 'Permintaan tidak valid.');
    const invalid = validate(body);
    if (invalid) return fail(400, invalid);
    const b = body as CreateBody;

    if (!SLOT_START_TIMES.some((s) => s.startTime === b.startTime)) return fail(400, 'Jam sesi tidak valid.');
    if (isSlotInPast(b.bookingDate, b.startTime)) return fail(400, 'Jadwal yang dipilih sudah lewat. Pilih jam lain.');

    // 1. Harga SELALU dari database, bukan dari browser
    const { data: pkg } = await supabaseAdmin
        .from('packages')
        .select('id, slug, title, price, duration_minutes')
        .eq('slug', b.packageSlug)
        .eq('is_active', true)
        .maybeSingle();
    if (!pkg) return fail(404, 'Paket tidak ditemukan.');

    const amountDue = b.paymentScheme === 'dp' ? Math.round(pkg.price * 0.3) : pkg.price;
    // Jam selesai dihitung server dari durasi paket (tidak memercayai browser)
    const endTime = calculateEndTime(b.startTime, pkg.duration_minutes);

    // 2. Bebaskan slot dari pesanan pending lama yang sudah tidak berlaku
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const { data: stale } = await supabaseAdmin
        .from('bookings')
        .select('id, order_id, created_at')
        .eq('booking_date', b.bookingDate)
        .eq('status', 'pending')
        .or(`created_at.lt.${cutoff},order_id.is.null`);
    for (const r of stale ?? []) {
        if (r.order_id) await syncPendingBooking(r.order_id, r.created_at);
        else await supabaseAdmin.from('bookings').update({ status: 'expired' }).eq('id', r.id);
    }

    // 3. Simpan pesanan (pending). Indeks unik di database mencegah slot ganda.
    // Cek bentrok: jam yang beririsan tidak boleh dipesan dua kali (satu studio)

    const { data: active } = await supabaseAdmin

        .from('bookings')

        .select('start_time, end_time')

        .eq('booking_date', b.bookingDate)

        .in('status', ['pending', 'confirmed']);

    const taken = (active ?? []).map((x) => ({ start: String(x.start_time).slice(0, 5), end: String(x.end_time).slice(0, 5) }));

    if (overlapsAny(b.startTime, endTime, taken)) {

        return fail(409, 'Maaf, jam tersebut baru saja dipesan orang lain. Pilih jam lain.');

    }


    const orderId = buildOrderId();
    const { data: booking, error: insertError } = await supabaseAdmin
        .from('bookings')
        .insert({
            order_id: orderId,
            package_id: pkg.id,
            booking_date: b.bookingDate,
            start_time: b.startTime,
            end_time: endTime,
            full_name: b.fullName.trim(),
            whatsapp: b.whatsapp.trim(),
            email: b.email.trim(),
            special_notes: b.specialNotes?.trim() || null,
            payment_scheme: b.paymentScheme,
            payment_method: b.paymentMethod,
            total_amount: pkg.price,
            paid_amount: amountDue,
            status: 'pending',
        })
        .select('id')
        .single();

    if (insertError || !booking) {
        if ((insertError?.code === '23505' || insertError?.code === '23P01')) return fail(409, 'Maaf, jam tersebut baru saja dipesan orang lain. Pilih jam lain.');
        return fail(500, 'Gagal menyimpan pesanan.');
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

        await supabaseAdmin.from('bookings').update({ payment_url: snap.redirect_url }).eq('id', booking.id);
        return NextResponse.json({ orderId, redirectUrl: snap.redirect_url });
    } catch (err) {
        // Midtrans gagal -> lepas slot agar tidak terkunci
        await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
        const msg = err instanceof Error ? err.message : 'Tidak dapat menghubungi Midtrans.';
        return fail(502, `Gagal membuat pembayaran: ${msg}`);
    }
}
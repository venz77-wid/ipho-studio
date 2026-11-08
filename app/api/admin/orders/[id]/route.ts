import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { syncPendingBooking } from '@/lib/midtrans';
import { ORDER_ID_RE } from '@/lib/myBookingTypes';
import type { AdminOrderDetail, BookingStatus, Scheme } from '@/lib/adminTypes';

interface PackageJoin {
    title: string;
    label: string;
    description: string;
    image_path: string | null;
    duration_minutes: number;
}
interface Row {
    order_id: string;
    status: BookingStatus;
    payment_scheme: Scheme;
    payment_method: AdminOrderDetail['paymentMethod'];
    created_at: string;
    paid_at: string | null;
    booking_date: string;
    start_time: string;
    end_time: string;
    full_name: string;
    whatsapp: string;
    email: string;
    special_notes: string | null;
    total_amount: number;
    paid_amount: number;
    package: PackageJoin | PackageJoin[] | null;
}

const COLUMNS = `order_id, status, payment_scheme, payment_method, created_at, paid_at, booking_date,
  start_time, end_time, full_name, whatsapp, email, special_notes, total_amount, paid_amount,
  package:packages(title, label, description, image_path, duration_minutes)`;

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await ctx.params;
    const orderId = decodeURIComponent(id).replace(/^#/, '').toUpperCase();
    if (!ORDER_ID_RE.test(orderId)) {
        return NextResponse.json({ error: 'Nomor pesanan tidak valid.' }, { status: 400 });
    }

    const load = () => supabaseAdmin.from('bookings').select(COLUMNS).eq('order_id', orderId).maybeSingle();
    let { data } = await load();
    if (!data) return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });

    if ((data as unknown as Row).status === 'pending') {
        try {
            await syncPendingBooking(orderId, (data as unknown as Row).created_at);
            data = (await load()).data ?? data;
        } catch (e) {
            console.error('Sinkron status gagal:', e);
        }
    }

    const r = data as unknown as Row;
    const p = Array.isArray(r.package) ? r.package[0] : r.package;
    const order: AdminOrderDetail = {
        orderId: r.order_id,
        status: r.status,
        paymentScheme: r.payment_scheme,
        paymentMethod: r.payment_method,
        createdAt: r.created_at,
        paidAt: r.paid_at,
        bookingDate: r.booking_date,
        startTime: String(r.start_time).slice(0, 5),
        endTime: String(r.end_time).slice(0, 5),
        fullName: r.full_name,
        whatsapp: r.whatsapp,
        email: r.email,
        specialNotes: r.special_notes,
        totalAmount: r.total_amount,
        paidAmount: r.paid_amount,
        package: {
            title: p?.title ?? 'Paket Foto',
            label: p?.label ?? '',
            description: p?.description ?? '',
            imageSrc: p?.image_path ?? null,
            durationMinutes: p?.duration_minutes ?? 0,
        },
    };
    return NextResponse.json({ order }, { headers: { 'Cache-Control': 'no-store' } });
}

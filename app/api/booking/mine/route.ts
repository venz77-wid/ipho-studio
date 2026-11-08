import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { syncPendingBooking } from '@/lib/midtrans';
import { ORDER_ID_RE, type BookingPhase, type MyBooking } from '@/lib/myBookingTypes';

interface PackageJoin {
    title: string;
    label: string;
    image_path: string | null;
    image_position: string | null;
    duration_minutes: number;
}

interface Row {
    order_id: string;
    status: MyBooking['status'];
    booking_date: string;
    start_time: string;
    end_time: string;
    payment_scheme: MyBooking['paymentScheme'];
    payment_method: MyBooking['paymentMethod'];
    total_amount: number;
    paid_amount: number;
    payment_url: string | null;
    midtrans_status: string | null;
    room: { name: string } | { name: string }[] | null;
    created_at: string;
    package: PackageJoin | PackageJoin[] | null;
}

function toPhase(status: Row['status'], date: string, end: string): BookingPhase {
    if (status === 'pending') return 'waiting';
    if (status === 'confirmed') {
        const endAt = new Date(`${date}T${end.slice(0, 5)}:00+07:00`).getTime(); // WIB
        return Date.now() > endAt ? 'done' : 'active';
    }
    return 'failed';
}

export async function POST(req: Request): Promise<NextResponse> {
    const body = (await req.json().catch(() => null)) as { orderIds?: unknown } | null;
    const ids = Array.isArray(body?.orderIds)
        ? body.orderIds.filter((x): x is string => typeof x === 'string' && ORDER_ID_RE.test(x)).slice(0, 20)
        : [];
    if (ids.length === 0) return NextResponse.json({ bookings: [] });

    const load = () => supabaseAdmin
        .from('bookings')
        .select(
            `order_id, status, booking_date, start_time, end_time, payment_scheme, payment_method,
       total_amount, paid_amount, payment_url, created_at, midtrans_status, room:rooms(name),
       package:packages(title, label, image_path, image_position, duration_minutes)`,
        )
        .in('order_id', ids)
        .eq('booking_source', 'online');
    const { data, error } = await load();
    if (error) return NextResponse.json({ error: 'Gagal memuat pesanan.' }, { status: 500 });

    let rows = (data ?? []) as unknown as Row[];

    // Pesanan yang masih menunggu: tanyakan statusnya ke Midtrans (tidak perlu webhook)
    const pending = rows.filter((r) => r.status === 'pending' && r.midtrans_status !== 'paid_room_conflict');
    await Promise.all(
        pending
            .map(async (r) => {
                try {
                    await syncPendingBooking(r.order_id, r.created_at);
                } catch (e) {
                    console.error('Sinkron status gagal:', e);
                }
            }),
    );

    if (pending.length) {
        const fresh = await load();
        if (fresh.error) return NextResponse.json({ error: 'Gagal memuat status terbaru.' }, { status: 500 });
        rows = (fresh.data ?? []) as unknown as Row[];
    }

    const bookings: MyBooking[] = rows
        .map((r) => {
            const p = Array.isArray(r.package) ? r.package[0] : r.package;
            const room = Array.isArray(r.room) ? r.room[0] : r.room;
            const phase = r.midtrans_status === 'paid_room_conflict'
                ? 'review' : toPhase(r.status, r.booking_date, r.end_time);
            return {
                orderId: r.order_id,
                status: r.status,
                phase,
                roomName: room?.name ?? null,
                packageTitle: p?.title ?? 'Paket Foto',
                packageLabel: p?.label ?? '',
                imageSrc: p?.image_path ?? null,
                imagePosition: p?.image_position ?? 'center',
                durationMinutes: p?.duration_minutes ?? 0,
                bookingDate: r.booking_date,
                startTime: r.start_time.slice(0, 5),
                endTime: r.end_time.slice(0, 5),
                paymentScheme: r.payment_scheme,
                paymentMethod: r.payment_method,
                totalAmount: r.total_amount,
                paidAmount: r.paid_amount,
                paymentUrl: phase === 'waiting' ? r.payment_url : null,
                createdAt: r.created_at,
            };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ bookings });
}
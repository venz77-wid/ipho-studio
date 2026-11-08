import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { syncPendingBatch } from '@/lib/midtrans';
import { adminPaymentLabel } from '@/lib/adminBookingOperations';
import { addDays, getStudioNow, toMinutes } from '@/lib/scheduleUtils';
import {
    ADMIN_PAGE_SIZE,
    ADMIN_TABS,
    type AdminDashboardResponse,
    type AdminOrderRow,
    type AdminTab,
    type BookingStatus,
    type Scheme,
} from '@/lib/adminTypes';

interface Row {
    order_id: string;
    full_name: string;
    email: string | null;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: BookingStatus;
    payment_scheme: Scheme;
    package_title: string | null;
    package_label: string | null;
    package_duration_minutes: number | null;
    effective_paid_amount: number;
    total_amount: number;
    midtrans_status: string | null;
}

const COLUMNS =
    'order_id, full_name, email, booking_date, start_time, end_time, status, payment_scheme, package_title, package_label, package_duration_minutes, effective_paid_amount, total_amount, midtrans_status';

const toRow = (r: Row): AdminOrderRow => {
    return {
        orderId: r.order_id,
        customerName: r.full_name,
        customerEmail: r.email ?? '',
        packageLabel: r.package_label ?? '',
        packageTitle: r.package_title ?? 'Paket Foto',
        bookingDate: r.booking_date,
        startTime: String(r.start_time).slice(0, 5),
        endTime: String(r.end_time).slice(0, 5),
        durationMinutes: r.package_duration_minutes ?? 0,
        status: r.status,
        paymentScheme: r.payment_scheme,
        paymentLabel: adminPaymentLabel(r.status, Number(r.effective_paid_amount), Number(r.total_amount), r.midtrans_status === 'paid_room_conflict'),
    };
};

export async function GET(req: Request): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const sp = new URL(req.url).searchParams;
    const tabRaw = sp.get('tab') ?? 'Semua';
    const tab: AdminTab = (ADMIN_TABS as string[]).includes(tabRaw) ? (tabRaw as AdminTab) : 'Semua';
    const term = (sp.get('q') ?? '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 60);
    let page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);

    const now = getStudioNow();

    // 1) Rapikan status pesanan: yang sudah dibayar dikonfirmasi, yang lewat batas waktu dibatalkan
    await syncPendingBatch();

    // 2) Statistik
    const monthStart = `${now.date.slice(0, 7)}-01`;
    const nextMonthStart = `${addDays(monthStart, 32).slice(0, 7)}-01`;
    const [todayRes, monthRes, pendingRes] = await Promise.all([
        supabaseAdmin.from('admin_booking_summary').select('start_time, completed_at').eq('booking_date', now.date).eq('status', 'confirmed'),
        supabaseAdmin
            .from('admin_booking_summary')
            .select('effective_paid_amount')
            .eq('status', 'confirmed')
            .gte('booking_date', monthStart)
            .lt('booking_date', nextMonthStart),
        supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const todayRows = todayRes.data ?? [];
    if (todayRes.error || monthRes.error || pendingRes.error) {
        return NextResponse.json({ error: 'Gagal memuat ringkasan dashboard.' }, { status: 500 });
    }
    const completed = todayRows.filter((r) => r.completed_at).length;
    const monthRows = monthRes.data ?? [];
    const [y, m] = now.date.split('-').map(Number);

    const stats: AdminDashboardResponse['stats'] = {
        totalSessionsToday: todayRows.length,
        completedSessions: completed,
        upcomingSessions: todayRows.filter((r) => !r.completed_at && toMinutes(r.start_time) > now.minutes).length,
        revenueMonth: monthRows.reduce((sum, r) => sum + (Number(r.effective_paid_amount) || 0), 0),
        paidOrdersMonth: monthRows.filter((r) => Number(r.effective_paid_amount) > 0).length,
        pendingPayments: pendingRes.count ?? 0,
        monthLabel: new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    };

    // 3) Daftar pesanan (filter tab + pencarian + halaman)
    async function list(p: number) {
        let q = supabaseAdmin
            .from('admin_booking_summary')
            .select(COLUMNS, { count: 'exact' })
            .not('order_id', 'is', null)
            .in('status', ['pending', 'confirmed']);

        if (tab === 'Hari Ini') q = q.eq('booking_date', now.date);
        if (tab === 'Menunggu Konfirmasi') q = q.eq('status', 'pending');
        if (tab === 'Lunas') q = q.eq('is_paid_full', true);

        if (term) {
            const parts = [`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `order_id.ilike.%${term}%`];
            parts.push(`package_title.ilike.%${term}%`);
            q = q.or(parts.join(','));
        }

        const from = (p - 1) * ADMIN_PAGE_SIZE;
        return q.order('created_at', { ascending: false }).range(from, from + ADMIN_PAGE_SIZE - 1);
    }

    let res = await list(page);
    if (res.error?.code === 'PGRST103' && page > 1) {
        page = 1;
        res = await list(1);
    }
    if (res.error) {
        console.error('Gagal memuat pesanan admin:', res.error);
        return NextResponse.json({ error: 'Gagal memuat pesanan.' }, { status: 500 });
    }

    const orders = ((res.data ?? []) as unknown as Row[]).map(toRow);
    const total = res.count ?? 0;
    const body: AdminDashboardResponse = {
        stats,
        orders,
        pagination: {
            page,
            pageSize: ADMIN_PAGE_SIZE,
            total,
            totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
            showingStart: total === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + 1,
            showingEnd: total === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + orders.length,
        },
    };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
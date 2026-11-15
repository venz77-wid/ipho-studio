import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Receipt, RotateCcw, Search } from 'lucide-react';
import AdminScheduleShell from '@/components/AdminSchedule/AdminScheduleShell';
import { requireScheduleAdmin } from '@/lib/adminScheduleData';
import type { ScheduleParams } from '@/lib/adminSchedule';
import { formatBookingDate } from '@/lib/bookingFormat';
import { formatRupiah } from '@/lib/catalogTypes';
import { ORDER_ID_RE } from '@/lib/myBookingTypes';
import { loadAdminOrders, ORDER_PAGE_SIZE } from '@/lib/adminOrdersData';
import { ORDERS_PATH, PAYMENT_LABELS, SESSION_LABELS, orderListHref, orderListQuery, readOrderFilters } from '@/lib/adminOrderFilters';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pesanan Studio | IPHO Studio' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<ScheduleParams> }) {
    await requireScheduleAdmin();
    const filters = readOrderFilters(await searchParams);
    const result = filters.invalidDates ? null : await loadAdminOrders(filters).catch(() => null);
    const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / ORDER_PAGE_SIZE));
    if (result && filters.page > totalPages) redirect(orderListHref(orderListQuery(filters, totalPages)));

    const hasFilters = Boolean(filters.search || filters.from || filters.to || filters.source || filters.payment || filters.session);
    const retry = orderListHref(orderListQuery(filters));
    const offset = (filters.page - 1) * ORDER_PAGE_SIZE;
    const pageStart = Math.max(1, Math.min(filters.page - 2, totalPages - 4));
    const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageStart + index);
    const listQuery = orderListQuery(filters);

    return (
        <AdminScheduleShell section="orders">
            <div className={styles.orders}>
                <header className={styles.heading}>
                    <h2>Pesanan Studio</h2>
                    <p>Cari dan kelola booking online serta walk-in.</p>
                </header>

                <form action={ORDERS_PATH} method="get" key={listQuery} className={styles.filters}>
                    <label className={styles.search}>
                        <Search size={18} aria-hidden />
                        <input type="search" name="q" maxLength={100} defaultValue={filters.search}
                            aria-label="Cari kode pesanan, nama, atau nomor WhatsApp"
                            placeholder="Cari kode pesanan, nama, atau nomor WhatsApp…" />
                    </label>
                    <div className={styles.fields}>
                        <fieldset className={styles.dateRange}>
                            <legend>Tanggal Sesi</legend>
                            <label><span>Dari</span><input name="mulai" type="date" defaultValue={filters.from} /></label>
                            <label><span>Sampai</span><input name="sampai" type="date" defaultValue={filters.to} /></label>
                        </fieldset>
                        <label>Sumber Pesanan
                            <select name="sumber" defaultValue={filters.source}>
                                <option value="">Semua sumber</option>
                                <option value="online">Online</option>
                                <option value="walk_in">Walk-in</option>
                            </select>
                        </label>
                        <label>Status Pembayaran
                            <select name="bayar" defaultValue={filters.payment}>
                                <option value="">Semua pembayaran</option>
                                {Object.entries(PAYMENT_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
                            </select>
                        </label>
                        <label>Status Sesi
                            <select name="sesi" defaultValue={filters.session}>
                                <option value="">Semua sesi</option>
                                {Object.entries(SESSION_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
                            </select>
                        </label>
                        <div className={styles.filterActions}>
                            {hasFilters || filters.invalidDates ? <Link className={styles.secondary} href={ORDERS_PATH}><RotateCcw size={14} aria-hidden /> Reset Filter</Link> : null}
                            <button className={styles.primary} type="submit">Terapkan</button>
                        </div>
                    </div>
                </form>

                {!result ? (
                    <div className={styles.empty} role="alert">
                        <p>{filters.invalidDates ? 'Periksa tanggal sesi. Tanggal akhir harus sama dengan atau setelah tanggal awal.'
                            : 'Pesanan belum bisa dimuat.'}</p>
                        <Link className={styles.secondary} href={filters.invalidDates ? ORDERS_PATH : retry}>
                            {filters.invalidDates ? 'Reset Filter' : 'Coba Lagi'}
                        </Link>
                    </div>
                ) : !result.items.length ? (
                    <section className={styles.empty} aria-labelledby="orders-empty">
                        <Receipt size={27} aria-hidden />
                        <h3 id="orders-empty">{hasFilters ? 'Tidak ada pesanan yang cocok' : 'Belum ada pesanan'}</h3>
                        <p>{hasFilters ? 'Coba kata kunci lain atau reset filter.' : 'Booking online dan walk-in akan muncul di sini.'}</p>
                        {hasFilters && <Link className={styles.primary} href={ORDERS_PATH}><RotateCcw size={15} aria-hidden /> Reset Filter</Link>}
                    </section>
                ) : (
                    <section className={styles.results} aria-label="Daftar pesanan">
                        <div className={styles.tableArea}>
                            <table className={styles.table}>
                                <thead><tr>
                                    <th scope="col">Pesanan</th><th scope="col">Paket</th><th scope="col">Jadwal Sesi (WITA)</th>
                                    <th scope="col">Sumber</th><th scope="col">Total Tagihan</th><th scope="col">Status</th><th scope="col">Aksi</th>
                                </tr></thead>
                                <tbody>{result.items.map((order) => (
                                    <tr key={order.id}>
                                        <th scope="row" className={styles.order}>
                                            <strong>{order.orderId ? '#' + order.orderId : 'Kode belum tercatat'}</strong>
                                            <span>{order.name}</span>
                                            {order.whatsapp && <small>{order.whatsapp}</small>}
                                        </th>
                                        <td className={styles.package}>
                                            <span className={styles.mobileLabel}>Paket</span>
                                            {order.packageTitle}
                                        </td>
                                        <td className={styles.schedule}>
                                            <span className={styles.mobileLabel}>Jadwal Sesi</span>
                                            <span>{formatBookingDate(order.date).split(', ')[1] ?? order.date}</span>
                                            <small><Clock size={13} aria-hidden /> {order.start}–{order.end} WITA</small>
                                        </td>
                                        <td><span className={styles.source} data-source={order.source}>
                                            {order.source === 'walk_in' ? 'Walk-in' : 'Online'}
                                        </span></td>
                                        <td className={styles.amount}>
                                            <span className={styles.mobileLabel}>Total Tagihan</span>
                                            <strong>{formatRupiah(order.totalAmount)}</strong>
                                            {order.paidAmount > 0 && <small>
                                                {order.payment === 'deposit' ? 'DP' : 'Terbayar'} {formatRupiah(order.paidAmount)}
                                            </small>}
                                        </td>
                                        <td className={styles.status}>
                                            <span className={styles.payment} data-state={order.payment}>{PAYMENT_LABELS[order.payment]}</span>
                                            <span className={styles.session} data-state={order.session}>{SESSION_LABELS[order.session]}</span>
                                        </td>
                                        <td className={styles.action}>
                                            {order.orderId && ORDER_ID_RE.test(order.orderId) ? (
                                                <Link className={styles.primary} prefetch={false} href={{
                                                    pathname: ORDERS_PATH + '/' + encodeURIComponent(order.orderId),
                                                    query: { daftar: listQuery },
                                                }}>Lihat Detail <ArrowRight size={15} aria-hidden /></Link>
                                            ) : <small>Detail tidak tersedia</small>}
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <footer className={styles.pagination}>
                            <span>Menampilkan {offset + 1}–{offset + result.items.length} dari {result.total} pesanan</span>
                            {totalPages > 1 && <nav aria-label="Halaman pesanan">
                                {filters.page > 1 && <Link aria-label="Halaman sebelumnya" prefetch={false} href={orderListHref(orderListQuery(filters, filters.page - 1))}><ChevronLeft size={15} /></Link>}
                                {pageNumbers.map((page) => page === filters.page
                                    ? <span key={page} aria-current="page">{page}</span>
                                    : <Link prefetch={false} key={page} aria-label={`Halaman ${page}`} href={orderListHref(orderListQuery(filters, page))}>{page}</Link>)}
                                {filters.page < totalPages && <Link aria-label="Halaman selanjutnya" prefetch={false} href={orderListHref(orderListQuery(filters, filters.page + 1))}><ChevronRight size={15} /></Link>}
                            </nav>}
                        </footer>
                    </section>
                )}
            </div>
        </AdminScheduleShell>
    );
}

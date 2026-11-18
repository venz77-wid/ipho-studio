import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Info, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import AdminScheduleShell from '@/components/AdminSchedule/AdminScheduleShell';
import { requireScheduleAdmin } from '@/lib/adminScheduleData';
import type { ScheduleParams } from '@/lib/adminSchedule';
import { loadFinanceReport } from '@/lib/adminFinanceData';
import { FINANCE_PAGE_SIZE, FINANCE_PATH, MAX_FINANCE_DAYS, financeHref, financeQuery, readFinanceFilters, type FinanceFilters } from '@/lib/adminFinanceFilters';
import { STUDIO_TIME_ZONE } from '@/lib/scheduleUtils';
import { formatRupiah } from '@/lib/catalogTypes';
import { ORDER_ID_RE } from '@/lib/myBookingTypes';
import IncomeChart from './IncomeChart';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Laporan & Keuangan | IPHO Studio' };

const localDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: STUDIO_TIME_ZONE });
const localTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: STUDIO_TIME_ZONE });
const sessionDate = (value: string) => localDate.format(new Date(value + 'T00:00:00+08:00'));
const percent = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 1 });

function PeriodControl({ filters }: { filters: FinanceFilters }) {
    return (
        <section className={styles.period} aria-label="Periode pembayaran">
            <div className={styles.periodBar}>
                <strong><CalendarDays size={16} aria-hidden /> Tanggal Pembayaran · WITA</strong>
                <nav className={styles.periodLinks} aria-label="Pilih periode">
                    {([
                        ['hari', 'Hari Ini'], ['bulan', 'Bulan Ini'], ['pilih', 'Pilih Tanggal'],
                    ] as const).map(([period, label]) => (
                        <Link key={period} prefetch={false} aria-current={filters.period === period ? 'page' : undefined}
                            href={financeHref({
                                ...filters, period, page: 1,
                                from: filters.invalid ? filters.today.slice(0, 7) + '-01' : filters.from,
                                to: filters.invalid ? filters.today : filters.to,
                            })}>{label}</Link>
                    ))}
                </nav>
                {!filters.invalid && <span className={styles.range}>{sessionDate(filters.from)} – {sessionDate(filters.to)}</span>}
            </div>
            {filters.period === 'pilih' && <form className={styles.custom} action={FINANCE_PATH} method="get">
                <input type="hidden" name="periode" value="pilih" />
                <input type="hidden" name="tab" value={filters.tab} />
                <label>Dari <input required type="date" name="mulai" max={filters.today} defaultValue={filters.from} /></label>
                <label>Sampai <input required type="date" name="sampai" max={filters.today} defaultValue={filters.to} /></label>
                <button type="submit" className={styles.primary}>Terapkan</button>
            </form>}
        </section>
    );
}

function OrderLink({ orderId, filters, children, button = false }: {
    orderId: string | null; filters: FinanceFilters; children: ReactNode; button?: boolean;
}) {
    if (!orderId || !ORDER_ID_RE.test(orderId)) return <span>{button ? 'Detail tidak tersedia' : children}</span>;
    return <Link prefetch={false} className={button ? styles.primary : styles.orderLink} href={{
        pathname: '/admin/pesanan/' + encodeURIComponent(orderId), query: { laporan: financeQuery(filters) },
    }}>{children}</Link>;
}

function Pagination({ filters, count }: { filters: FinanceFilters; count: number }) {
    const limit = Math.ceil(count / FINANCE_PAGE_SIZE);
    const start = Math.max(1, Math.min(filters.page - 2, limit - 4));
    const offset = (filters.page - 1) * FINANCE_PAGE_SIZE;
    return (
        <footer className={styles.pagination}>
            <span>Menampilkan {offset + 1}–{Math.min(offset + FINANCE_PAGE_SIZE, count)} dari {count} {filters.tab === 'masuk' ? 'transaksi' : 'pesanan'}</span>
            {limit > 1 && <nav aria-label="Halaman laporan">
                {filters.page > 1 && <Link prefetch={false} aria-label="Halaman sebelumnya" href={financeHref({ ...filters, page: filters.page - 1 })}><ChevronLeft size={15} /></Link>}
                {Array.from({ length: Math.min(limit, 5) }, (_, i) => start + i).map((page) => page === filters.page
                    ? <span aria-current="page" key={page}>{page}</span>
                    : <Link prefetch={false} key={page} aria-label={`Halaman ${page}`} href={financeHref({ ...filters, page })}>{page}</Link>)}
                {filters.page < limit && <Link prefetch={false} aria-label="Halaman selanjutnya" href={financeHref({ ...filters, page: filters.page + 1 })}><ChevronRight size={15} /></Link>}
            </nav>}
        </footer>
    );
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<ScheduleParams> }) {
    await requireScheduleAdmin();
    const filters = readFinanceFilters(await searchParams);
    const report = filters.invalid ? null : await loadFinanceReport(filters).catch(() => null);
    const count = filters.tab === 'masuk' ? report?.events.length ?? 0 : report?.outstanding.length ?? 0;
    const lastPage = Math.max(1, Math.ceil(count / FINANCE_PAGE_SIZE));
    if (report && filters.page > lastPage) redirect(financeHref({ ...filters, page: lastPage }));
    const offset = (filters.page - 1) * FINANCE_PAGE_SIZE;
    const share = (value: number) => percent.format(report?.total ? value / report.total : 0);

    return (
        <AdminScheduleShell section="finance">
            <div className={styles.report}>
                <header className={styles.heading}>
                    <h2>Laporan &amp; Keuangan</h2>
                    <p>Pantau pemasukan studio dan tagihan yang belum lunas.</p>
                </header>
                <PeriodControl filters={filters} />
                {!report ? (
                    <section className={styles.empty} role="alert">
                        <p>{filters.invalid
                            ? `Pilih rentang tanggal yang valid hingga hari ini, maksimal ${MAX_FINANCE_DAYS} hari.`
                            : 'Laporan belum bisa dimuat. Coba muat ulang halaman.'}</p>
                        {!filters.invalid && <Link className={styles.primary} href={financeHref(filters)} prefetch={false}>Coba Lagi</Link>}
                    </section>
                ) : (
                    <>
                        <section className={styles.summary} aria-label="Ringkasan pemasukan">
                            <article className={styles.metric}>
                                <div><h3>Total Uang Masuk</h3><Wallet size={18} aria-hidden /></div>
                                <strong>{formatRupiah(report.total)}</strong>
                                <p>Gabungan Midtrans dan kasir pada periode ini.</p>
                                <div className={styles.mix} aria-hidden="true">
                                    <span className={styles.midtrans} style={{ flexGrow: report.midtrans }} />
                                    <span className={styles.cashier} style={{ flexGrow: report.cashier }} />
                                </div>
                            </article>
                            <article className={styles.metric}>
                                <div><h3><i className={styles.midtrans} /> Pembayaran Midtrans</h3><small>{share(report.midtrans)} total</small></div>
                                <strong>{formatRupiah(report.midtrans)}</strong>
                                <p>Pembayaran online yang tercatat.</p>
                            </article>
                            <article className={styles.metric}>
                                <div><h3><i className={styles.cashier} /> Pembayaran Kasir</h3><small>{share(report.cashier)} total</small></div>
                                <strong>{formatRupiah(report.cashier)}</strong>
                                <p>Tunai, QRIS kasir, dan EDC yang tercatat.</p>
                            </article>
                        </section>
                        <IncomeChart key={filters.from + ':' + filters.to} days={report.days} />
                        <section className={styles.results} aria-label="Rincian keuangan">
                            <nav className={styles.tabs} aria-label="Bagian laporan">
                                {([
                                    ['masuk', 'Uang Masuk', report.events.length],
                                    ['tagihan', 'Sisa Tagihan', report.outstanding.length],
                                ] as const).map(([tab, label, amount]) => (
                                    <Link key={tab} prefetch={false} aria-current={filters.tab === tab ? 'page' : undefined}
                                        href={financeHref({ ...filters, tab, page: 1 })}>{label} <span>{amount}</span></Link>
                                ))}
                            </nav>
                            {filters.tab === 'masuk' ? (
                                count ? <table className={styles.table} aria-label="Riwayat pembayaran">
                                    <thead><tr><th scope="col">Tanggal &amp; Jam (WITA)</th><th scope="col">Kode Pesanan</th>
                                        <th scope="col">Pelanggan</th><th scope="col">Sumber</th>
                                        <th scope="col">Metode Pembayaran</th><th scope="col" className={styles.number}>Nominal</th></tr></thead>
                                    <tbody>{report.events.slice(offset, offset + FINANCE_PAGE_SIZE).map((event) => (
                                        <tr key={event.key}>
                                            <td><time dateTime={event.timestamp}>{localDate.format(new Date(event.timestamp))}
                                                <small>{localTime.format(new Date(event.timestamp)).replace('.', ':')} WITA</small></time></td>
                                            <th scope="row"><OrderLink orderId={event.orderId} filters={filters}>{event.orderId ? '#' + event.orderId : 'Kode belum tercatat'}</OrderLink></th>
                                            <td><small className={styles.mobileLabel}>Pelanggan</small>{event.customer}</td>
                                            <td><span className={styles.chip}>{event.source === 'walk_in' ? 'Walk-in' : event.source === 'online' ? 'Online' : '—'}</span></td>
                                            <td><small className={styles.mobileLabel}>Metode Pembayaran</small>{event.method}</td>
                                            <td className={styles.number}><small className={styles.mobileLabel}>Nominal</small><strong>{formatRupiah(event.amount)}</strong></td>
                                        </tr>
                                    ))}</tbody>
                                </table> : <div className={styles.empty}><p>Belum ada pembayaran di periode ini.</p>
                                    <Link className={styles.primary} prefetch={false} href={financeHref({ ...filters, period: 'pilih' })}>Ubah Periode</Link>
                                </div>
                            ) : (
                                <>
                                    <p className={styles.info}><Info size={16} aria-hidden /> Sisa Tagihan mencakup semua pesanan terkonfirmasi yang belum lunas. Filter tanggal pembayaran berlaku untuk ringkasan, grafik, dan riwayat Uang Masuk.</p>
                                    {count ? <table className={`${styles.table} ${styles.outstandingTable}`} aria-label="Sisa tagihan">
                                        <thead><tr><th scope="col">Pesanan</th><th scope="col">Pelanggan</th><th scope="col">Tanggal Sesi (WITA)</th>
                                            <th scope="col" className={styles.number}>Total Tagihan</th><th scope="col" className={styles.number}>Sudah Dibayar</th>
                                            <th scope="col" className={styles.number}>Sisa Tagihan</th><th scope="col" className={styles.number}>Aksi</th></tr></thead>
                                        <tbody>{report.outstanding.slice(offset, offset + FINANCE_PAGE_SIZE).map((order) => (
                                            <tr key={order.id}>
                                                <th scope="row">{order.orderId ? '#' + order.orderId : 'Kode belum tercatat'}<small>{order.packageTitle}</small></th>
                                                <td><small className={styles.mobileLabel}>Pelanggan</small>{order.customer}{order.whatsapp && <small>{order.whatsapp}</small>}</td>
                                                <td><small className={styles.mobileLabel}>Tanggal Sesi</small>{sessionDate(order.date)}<small>{order.start} WITA</small></td>
                                                <td className={styles.number}><small className={styles.mobileLabel}>Total Tagihan</small>{formatRupiah(order.total)}</td>
                                                <td className={styles.number}><small className={styles.mobileLabel}>Sudah Dibayar</small>{formatRupiah(order.paid)}</td>
                                                <td className={styles.number}><small className={styles.mobileLabel}>Sisa Tagihan</small><span className={styles.balance}>{formatRupiah(order.remaining)}</span></td>
                                                <td className={styles.number}><OrderLink orderId={order.orderId} filters={filters} button>Lihat Detail <ArrowRight size={14} aria-hidden /></OrderLink></td>
                                            </tr>
                                        ))}</tbody>
                                    </table> : <div className={styles.empty}><p>Tidak ada sisa tagihan.</p></div>}
                                </>
                            )}
                            {count > 0 && <Pagination filters={filters} count={count} />}
                            {filters.tab === 'tagihan' && count > 0 && <div className={styles.outstandingTotal}>
                                <span>Total sisa tagihan · {report.outstanding.length} pesanan</span>
                                <strong>{formatRupiah(report.remaining)}</strong>
                            </div>}
                        </section>
                    </>
                )}
            </div>
        </AdminScheduleShell>
    );
}

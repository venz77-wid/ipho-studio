'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatRupiah } from '@/lib/catalogTypes';
import type { DailyIncome } from '@/lib/adminFinanceFilters';
import styles from './page.module.css';

const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' });
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
const dayTotal = (day: DailyIncome) => day.midtrans + day.cashier;
const calendarDate = (date: string) => new Date(date + 'T00:00:00Z');

function axisStep(max: number) {
    const scale = 10 ** Math.floor(Math.log10(max / 4));
    return ([1, 2, 2.5, 5, 10].find((value) => value * scale >= max / 4) ?? 10) * scale;
}

export default function IncomeChart({ days }: { days: DailyIncome[] }) {
    const [selected, setSelected] = useState<string>();
    const max = Math.max(0, ...days.map(dayTotal));
    const step = max > 0 ? axisStep(max) : 1;
    const top = step * 4;
    const active = days.find((day) => day.date === selected) ?? days.findLast((day) => dayTotal(day) > 0);

    return (
        <section className={styles.chartCard} aria-labelledby="income-chart-title">
            <header className={styles.chartHeading}>
                <div>
                    <h3 id="income-chart-title">Tren Pembayaran Harian (WITA)</h3>
                    <p>Berdasarkan tanggal pembayaran yang tercatat.</p>
                </div>
                <ul className={styles.legend} aria-label="Kanal pembayaran">
                    <li><span className={styles.midtrans} /> Midtrans</li>
                    <li><span className={styles.cashier} /> Kasir</li>
                </ul>
            </header>
            {!active ? (
                <div className={styles.chartEmpty}><BarChart3 size={24} aria-hidden /><p>Belum ada pembayaran di periode ini.</p></div>
            ) : (
                <>
                    <div className={styles.chartFrame}>
                        <div className={styles.axis} aria-hidden="true">
                            {[4, 3, 2, 1, 0].map((level) => <span key={level}>Rp {compact.format(step * level)}</span>)}
                        </div>
                        <div className={styles.chartScroll} role="region" aria-label="Grafik harian, geser untuk melihat tanggal lainnya" tabIndex={0}>
                            <div className={styles.bars} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(38px, 1fr))` }}>
                                {days.map((day) => {
                                    const total = dayTotal(day);
                                    const date = calendarDate(day.date);
                                    const label = longDate.format(date);
                                    return <button type="button" key={day.date} className={styles.bar}
                                        aria-pressed={active.date === day.date}
                                        aria-label={`${label}, Midtrans ${formatRupiah(day.midtrans)}, Kasir ${formatRupiah(day.cashier)}, total ${formatRupiah(total)}`}
                                        title={`${label} · ${formatRupiah(total)}`}
                                        onClick={() => setSelected(day.date)}
                                        onFocus={() => setSelected(day.date)}>
                                        <span className={styles.barTrack} aria-hidden="true">
                                            <span className={styles.stack} style={{ height: Math.max((total / top) * 100, total > 0 ? 1 : 0) + '%' }}>
                                                <span className={styles.cashier} style={{ flexGrow: day.cashier }} />
                                                <span className={styles.midtrans} style={{ flexGrow: day.midtrans }} />
                                            </span>
                                        </span>
                                        <span className={styles.day}>{shortDate.format(date)}</span>
                                    </button>;
                                })}
                            </div>
                        </div>
                    </div>
                    <div className={styles.chartDetail} aria-live="polite">
                        <strong>{longDate.format(calendarDate(active.date))}</strong>
                        <span>Midtrans {formatRupiah(active.midtrans)}</span>
                        <span>Kasir {formatRupiah(active.cashier)}</span>
                        <strong>Total {formatRupiah(dayTotal(active))}</strong>
                    </div>
                </>
            )}
        </section>
    );
}

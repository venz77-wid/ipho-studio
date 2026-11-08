'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DAY_NAMES, type HoursRange, type StudioHours } from '@/lib/studioHours';
import styles from './StudioEditor.module.css';

const defaultRange = { start: '08:00', end: '22:00' };

function RangeList({ ranges, onChange }: { ranges: HoursRange[]; onChange: (ranges: HoursRange[]) => void }) {
    function change(index: number, patch: Partial<HoursRange>) {
        onChange(ranges.map((range, i) => i === index ? { ...range, ...patch } : range));
    }

    return <>
        {!ranges.length && <p>Tutup sepanjang hari.</p>}
        {ranges.map((range, i) => <div key={i} className={styles.row}>
            <label className={styles.field}>Buka
                <input type="time" required value={range.start} onChange={(event) => change(i, { start: event.target.value })} />
            </label>
            <label className={styles.field}>Tutup
                <input type="time" required value={range.end} onChange={(event) => change(i, { end: event.target.value })} />
            </label>
            <button type="button" title="Hapus rentang" aria-label="Hapus rentang"
                onClick={() => onChange(ranges.filter((_, index) => index !== i))}><Trash2 size={16} /></button>
        </div>)}
        <button type="button" disabled={ranges.length >= 8}
            onClick={() => onChange([...ranges, defaultRange])}><Plus size={16} /> Tambah Rentang</button>
    </>;
}

export default function HoursEditor({ initial, initialRevision, today }: {
    initial: StudioHours; initialRevision: number; today: string;
}) {
    const [hours, setHours] = useState(initial);
    const [revision, setRevision] = useState(initialRevision);
    const [saved, setSaved] = useState(initial);
    const [date, setDate] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
    const changed = JSON.stringify(hours) !== JSON.stringify(saved);

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy || !changed) return;
        setBusy(true);
        setMessage(null);
        try {
            const response = await fetch('/api/admin/studio-hours', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hours, revision }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data) throw new Error(data?.error ?? 'Gagal menyimpan jadwal.');
            setHours(data.hours);
            setSaved(data.hours);
            setRevision(data.revision);
            setMessage({ error: false, text: 'Jam operasional berhasil disimpan.' });
        } catch (error) {
            setMessage({ error: true, text: error instanceof Error ? error.message : 'Gagal menyimpan jadwal.' });
        } finally {
            setBusy(false);
        }
    }

    return <div className={styles.editor}>
        <header className={styles.pageHeader}>
            <p className={styles.breadcrumb}>Admin / Ruangan &amp; Operasional</p>
            <h1>Jam Operasional Studio</h1>
            <p>Atur jam buka yang tampil di website dan berlaku untuk sesi foto. Semua jam menggunakan WITA.</p>
        </header>
        <form onSubmit={save}>
            <fieldset className={styles.formBody} disabled={busy}>
                <section className={styles.card}>
                    <h2>Jadwal Mingguan</h2>
                    <p>Tambahkan beberapa rentang jika studio tutup sementara di tengah hari. Kosongkan rentang untuk hari tutup.</p>
                    {hours.week.map((ranges, i) => <div key={DAY_NAMES[i]} className={styles.item}>
                        <strong>{DAY_NAMES[i]}</strong>
                        <RangeList ranges={ranges} onChange={(next) => setHours({
                            ...hours, week: hours.week.map((day, index) => i === index ? next : day),
                        })} />
                    </div>)}
                </section>
                <section className={styles.card}>
                    <h2>Tanggal Khusus</h2>
                    <p>Jam pada tanggal khusus menggantikan jadwal mingguan. Kosongkan rentang untuk menutup studio sepanjang hari.</p>
                    <div className={styles.row}>
                        <label className={styles.field}>Tanggal
                            <input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} />
                        </label>
                        <button type="button" disabled={date < today || Object.hasOwn(hours.exceptions, date)}
                            onClick={() => {
                                setHours({ ...hours, exceptions: { ...hours.exceptions, [date]: [] } });
                                setDate('');
                            }}><Plus size={16} /> Tambah Tanggal</button>
                    </div>
                    {Object.keys(hours.exceptions).sort().map((day) => <div className={styles.item} key={day}>
                        <div className={styles.itemHeader}>
                            <strong>{day.split('-').reverse().join('/')}</strong>
                            <button type="button" className={styles.danger} onClick={() => {
                                const exceptions = { ...hours.exceptions };
                                delete exceptions[day];
                                setHours({ ...hours, exceptions });
                            }}>Hapus Pengecualian</button>
                        </div>
                        <RangeList ranges={hours.exceptions[day]}
                            onChange={(next) => setHours({ ...hours, exceptions: { ...hours.exceptions, [day]: next } })} />
                    </div>)}
                </section>
            </fieldset>
            <div className={styles.actionsBar}>
                <div aria-live="polite">
                    {message && <p className={message.error ? styles.error : styles.success}>{message.text}</p>}
                    <small>{changed ? 'Ada perubahan belum disimpan' : 'Jadwal tersimpan'}</small>
                </div>
                <div className={styles.row}>
                    <button type="button" disabled={busy || !changed} onClick={() => {
                        if (window.confirm('Batalkan perubahan jam operasional?')) {
                            setHours(saved);
                            setMessage(null);
                        }
                    }}>Batalkan Perubahan</button>
                    <button type="submit" className={styles.primary} disabled={busy || !changed}>{busy ? 'Menyimpan…' : 'Simpan Jam Operasional'}</button>
                </div>
            </div>
        </form>
    </div>;
}

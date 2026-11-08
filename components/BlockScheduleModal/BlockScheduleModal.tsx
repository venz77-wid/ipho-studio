'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import type { BlockInput, RoomFilter, StudioRoom } from '@/lib/adminSchedule';
import styles from './BlockScheduleModal.module.css';

export default function BlockScheduleModal({ rooms, date, room, onClose, onConfirm }: {
    rooms: StudioRoom[];
    date: string;
    room: RoomFilter;
    onClose: () => void;
    onConfirm: (input: BlockInput) => Promise<void>;
}) {
    const [form, setForm] = useState<BlockInput>({
        room: rooms.some((item) => item.code === room) ? room : 'all',
        startDate: date, endDate: date, isAllDay: true, startTime: '10:00', endTime: '11:00', reason: '',
    });
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const dialog = useRef<HTMLDialogElement>(null);
    const running = useRef(false);

    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);

    function change<K extends keyof BlockInput>(key: K, value: BlockInput[K]) {
        setForm((previous) => ({ ...previous, [key]: value }));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (running.current) return;
        running.current = true;
        setPending(true);
        setError('');
        try {
            await onConfirm(form);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Blokir tidak dapat disimpan.');
        } finally {
            running.current = false;
            setPending(false);
        }
    }

    return (
        <dialog ref={dialog} className={styles.scheduleDialog} aria-labelledby="schedule-block-title"
            onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }}>
            <div className={styles.modalCard}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 id="schedule-block-title" className={styles.modalTitle}>Blokir Jadwal</h2>
                        <p className={styles.modalSubtitle}>Ruangan yang diblokir tidak bisa dipesan pada rentang ini.</p>
                    </div>
                </div>
                <form className={styles.formContainer} onSubmit={submit}>
                    <label className={styles.formGroup}>
                        <span className={styles.labelTitle}>Ruangan</span>
                        <select className={styles.inputField} value={form.room} disabled={pending}
                            onChange={(event) => change('room', event.target.value as RoomFilter)}>
                            <option value="all">Semua Room aktif</option>
                            {rooms.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
                        </select>
                    </label>
                    <div className={styles.dateRow}>
                        <label className={styles.formGroup}>
                            <span className={styles.labelTitle}>Tanggal mulai</span>
                            <input required type="date" className={styles.inputField} value={form.startDate} disabled={pending}
                                onChange={(event) => setForm((previous) => ({
                                    ...previous, startDate: event.target.value,
                                    endDate: previous.endDate < event.target.value ? event.target.value : previous.endDate,
                                }))} />
                        </label>
                        <label className={styles.formGroup}>
                            <span className={styles.labelTitle}>Tanggal akhir</span>
                            <input required type="date" className={styles.inputField} value={form.endDate} disabled={pending}
                                min={form.startDate} onChange={(event) => change('endDate', event.target.value)} />
                        </label>
                    </div>
                    <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={form.isAllDay} disabled={pending}
                            onChange={(event) => change('isAllDay', event.target.checked)} />
                        Seharian, termasuk tanggal akhir
                    </label>
                    {!form.isAllDay && (
                        <div className={styles.dateRow}>
                            <label className={styles.formGroup}>
                                <span className={styles.labelTitle}>Jam mulai WIB</span>
                                <input required type="time" className={styles.inputField} value={form.startTime} disabled={pending}
                                    onChange={(event) => change('startTime', event.target.value)} />
                            </label>
                            <label className={styles.formGroup}>
                                <span className={styles.labelTitle}>Jam akhir WIB</span>
                                <input required type="time" className={styles.inputField} value={form.endTime} disabled={pending}
                                    onChange={(event) => change('endTime', event.target.value)} />
                            </label>
                        </div>
                    )}
                    <label className={styles.formGroup}>
                        <span className={styles.labelTitle}>Alasan blokir</span>
                        <textarea required rows={3} maxLength={300} className={styles.textareaField} value={form.reason}
                            disabled={pending} onChange={(event) => change('reason', event.target.value)} />
                    </label>
                    {error && <p role="alert" className={styles.infoAlertText}>{error}</p>}
                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} disabled={pending} className={styles.batalBtn}>Batal</button>
                        <button type="submit" disabled={pending} className={styles.konfirmasiBtn}>
                            <Lock size={16} /> {pending ? 'Menyimpan…' : 'Simpan Blokir'}
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
}

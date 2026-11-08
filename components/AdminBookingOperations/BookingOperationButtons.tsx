'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, CheckCircle2, MessageCircle, Plus, Receipt, X } from 'lucide-react';
import { dateLabel, type StudioRoom } from '@/lib/adminSchedule';
import { CASHIER_METHODS, normalizeWhatsApp, type AdminPackageOption, type AdminSlot } from '@/lib/adminBookingOperations';
import type { AdminOrderDetail } from '@/lib/adminTypes';
import { formatRupiah } from '@/lib/catalogTypes';
import { getStudioNow, toMinutes } from '@/lib/scheduleUtils';
import styles from './BookingOperationButtons.module.css';

const endpoint = '/api/admin/booking-operations';

function MethodField() {
    return <label>Metode pembayaran
        <select name="method" required>
            {Object.entries(CASHIER_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
    </label>;
}

function OperationDialog({ title, children, submitText, blocked, onClose, onSubmit }: {
    title: string; children: ReactNode; submitText: string; blocked?: boolean; onClose: () => void;
    onSubmit: (fields: FormData, requestId: string) => Promise<void>;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const requestId = useRef('');
    const running = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { dialog.current?.showModal(); }, []);

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (blocked || running.current) return;
        running.current = true;
        requestId.current ||= crypto.randomUUID();
        setBusy(true);
        setError('');
        try {
            await onSubmit(new FormData(event.currentTarget), requestId.current);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Gagal menyimpan perubahan.');
        } finally {
            running.current = false;
            setBusy(false);
        }
    }

    return (
        <dialog ref={dialog} className={styles.dialog} aria-label={title}
            onCancel={(e) => { e.preventDefault(); if (!running.current) onClose(); }}>
            <div className={styles.heading}>
                <h2>{title}</h2>
                <button type="button" aria-label="Tutup" disabled={busy} onClick={onClose}><X size={20} /></button>
            </div>
            <form onSubmit={save}>
                <fieldset disabled={busy}>{children}</fieldset>
                {error && <p role="alert" className={styles.error}>{error}</p>}
                <div className={styles.footer}>
                    <button type="button" disabled={busy} onClick={onClose}>Batal</button>
                    <button className={styles.primary} type="submit" disabled={busy || blocked}>
                        {busy ? 'Menyimpan…' : submitText}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

async function submitOperation(payload: Record<string, unknown>): Promise<string> {
    const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || typeof result?.orderId !== 'string') {
        throw new Error(result?.error ?? 'Perubahan belum bisa dikonfirmasi. Coba ulang dengan data yang sama.');
    }
    return result.orderId;
}

function SlotField({ query, value, onChange }: { query: string; value: string; onChange: (value: string) => void }) {
    const [state, setState] = useState<{ slots: AdminSlot[]; message: string } | null>(null);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        if (!query) return;
        const controller = new AbortController();
        (async () => {
            try {
                const response = await fetch(endpoint + '?' + query, { signal: controller.signal, cache: 'no-store' });
                const body = await response.json();
                if (!response.ok) throw new Error(body.error ?? 'Gagal memuat slot.');
                setState({ slots: body.slots, message: body.slots.length ? '' : 'Tidak ada slot tersedia.' });
            } catch (error) {
                if (!controller.signal.aborted) {
                    setState({ slots: [], message: error instanceof Error ? error.message : 'Gagal memuat slot.' });
                }
            }
        })();
        return () => controller.abort();
    }, [query, revision]);

    return <div className={styles.slotRow}>
        <label>Jam sesi (WITA)
            <select value={value} onChange={(e) => onChange(e.target.value)} required disabled={!state?.slots.length}>
                <option value="">{!query ? 'Lengkapi pilihan' : !state ? 'Memuat slot…' : 'Pilih jam sesi'}</option>
                {state?.slots.map((slot) => <option key={slot.start} value={slot.start}>{slot.start}–{slot.end}</option>)}
            </select>
        </label>
        {state?.message && <small role="status">{state.message}</small>}
        {query && <button type="button" onClick={() => { setState(null); onChange(''); setRevision(revision + 1); }}>
            Muat ulang slot
        </button>}
    </div>;
}

export function WalkInButton({ date, room, rooms, packages, className }: {
    date: string; room: string; rooms: StudioRoom[]; packages: AdminPackageOption[]; className?: string;
}) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const active = rooms.filter((item) => item.is_active);
    return <>
        <button type="button" className={className} onClick={() => setOpen(true)}
            disabled={!active.length || !packages.length}>
            <Plus size={16} /> Tambah Sesi Walk-in
        </button>
        {open && active.length > 0 && packages.length > 0 && <WalkInForm date={date} rooms={active} packages={packages}
            initialRoom={active.find((item) => item.code === room)?.id ?? active[0].id}
            onClose={() => setOpen(false)}
            onSaved={(orderId) => router.push('/admin/pesanan/' + encodeURIComponent(orderId))} />}
    </>;
}

function WalkInForm({ date, rooms, packages, initialRoom, onClose, onSaved }: {
    date: string; rooms: StudioRoom[]; packages: AdminPackageOption[]; initialRoom: string;
    onClose: () => void; onSaved: (id: string) => void;
}) {
    const [packageId, setPackageId] = useState(packages[0].id);
    const [roomId, setRoomId] = useState(initialRoom);
    const [startTime, setStartTime] = useState('');
    const pkg = packages.find((item) => item.id === packageId)!;
    const query = new URLSearchParams({ date, roomId, packageId }).toString();
    return <OperationDialog title="Tambah Sesi Walk-in" submitText="Simpan pesanan" blocked={!startTime} onClose={onClose}
        onSubmit={async (fields, requestId) => {
            const orderId = await submitOperation({
                ...Object.fromEntries(fields), requestId, expectedPrice: pkg.price, action: 'walk_in', date, roomId, packageId, startTime,
                paymentConfirmed: fields.get('confirmed') === 'on',
            });
            onSaved(orderId);
        }}>
        <p className={styles.intro}>Catat tamu yang datang langsung dan pembayaran yang diterima di kasir.</p>
        <div className={styles.grid}>
            <div className={styles.column}>
                <h3>Data klien</h3>
                <label>Nama lengkap<input name="fullName" required maxLength={120} /></label>
                <label>Nomor WhatsApp<input name="whatsapp" type="tel" required maxLength={25} placeholder="08…" /></label>
                <label>Email (opsional)<input name="email" type="email" maxLength={254} /></label>
                <label>Catatan (opsional)<textarea name="notes" maxLength={500} rows={2} /></label>
            </div>
            <div className={styles.column}>
                <h3>Detail sesi</h3>
                <p>{dateLabel(date)} · WITA</p>
                <label>Paket studio<select value={packageId} onChange={(e) => { setPackageId(e.target.value); setStartTime(''); }}>
                    {packages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select></label>
                <label>Ruangan<select value={roomId} onChange={(e) => { setRoomId(e.target.value); setStartTime(''); }}>
                    {rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select></label>
                <SlotField key={query} query={query} value={startTime} onChange={setStartTime} />
                <MethodField />
            </div>
        </div>
        <div className={styles.total}><span>{pkg.duration_minutes} menit · Total tagihan</span><strong>{formatRupiah(pkg.price)}</strong></div>
        <label className={styles.check}><input type="checkbox" name="confirmed" required /> Pembayaran penuh sudah diterima.</label>
    </OperationDialog>;
}

export function OrderOperationButtons({ order, onSaved }: { order: AdminOrderDetail; onSaved: () => Promise<void> }) {
    const [action, setAction] = useState<'reschedule' | 'complete' | 'cashier' | null>(null);
    const now = getStudioNow();
    const startsLater = order.bookingDate > now.date ||
        (order.bookingDate === now.date && toMinutes(order.startTime) > now.minutes);
    const isConfirmed = order.status === 'confirmed' && !order.requiresScheduleReview;
    const remaining = Math.max(0, order.totalAmount - order.paidAmount);
    const phone = normalizeWhatsApp(order.whatsapp);
    const text = 'Halo ' + order.fullName + ', kami dari IPHO Studio ingin menghubungi Anda terkait pesanan #' + order.orderId + '.';
    const close = () => setAction(null);

    async function save(fields: FormData, requestId: string) {
        await submitOperation({
            requestId, action, orderId: order.orderId, method: fields.get('method'),
            amount: Number(fields.get('amount')), paymentConfirmed: fields.get('confirmed') === 'on',
        });
        await onSaved();
    }

    return <div className={styles.actions}>
        {/^62\d{8,13}$/.test(phone) && <a className={styles.primary} target="_blank" rel="noopener noreferrer"
            href={'https://wa.me/' + phone + '?text=' + encodeURIComponent(text)}><MessageCircle size={16} /> Hubungi WhatsApp Klien</a>}
        {isConfirmed && startsLater && !order.completedAt && order.rooms.length > 0 &&
            <button type="button" onClick={() => setAction('reschedule')}><CalendarClock size={16} /> Jadwalkan Ulang</button>}
        {isConfirmed && !startsLater && !order.completedAt &&
            <button type="button" onClick={() => setAction('complete')}><CheckCircle2 size={16} /> Tandai Sesi Selesai</button>}
        {isConfirmed && remaining > 0 &&
            <button type="button" onClick={() => setAction('cashier')}><Receipt size={16} /> Catat Pembayaran Kasir</button>}
        {action === 'reschedule' && <RescheduleForm order={order} onClose={close} onSaved={onSaved} />}
        {action === 'complete' && <OperationDialog title="Tandai Sesi Selesai" submitText="Tandai selesai" onClose={close} onSubmit={save}>
            <p>Konfirmasi bahwa sesi untuk pesanan #{order.orderId} sudah selesai.</p>
        </OperationDialog>}
        {action === 'cashier' && <OperationDialog title="Catat Pembayaran Kasir" submitText="Simpan pembayaran" onClose={close} onSubmit={save}>
            <p>Sisa tagihan {formatRupiah(remaining)}.</p>
            <label>Nominal (Rp)<input name="amount" type="number" required min={1} step={1} max={remaining} defaultValue={remaining} /></label>
            <MethodField />
            <label className={styles.check}><input type="checkbox" name="confirmed" required /> Pembayaran ini sudah diterima.</label>
        </OperationDialog>}
    </div>;
}

function RescheduleForm({ order, onClose, onSaved }: {
    order: AdminOrderDetail; onClose: () => void; onSaved: () => Promise<void>;
}) {
    const today = getStudioNow().date;
    const [date, setDate] = useState(order.bookingDate);
    const [roomId, setRoomId] = useState(order.rooms.find((room) => room.id === order.roomId)?.id ?? order.rooms[0].id);
    const [startTime, setStartTime] = useState('');
    const query = date ? new URLSearchParams({ orderId: order.orderId, date, roomId }).toString() : '';
    const same = date === order.bookingDate && roomId === order.roomId && startTime === order.startTime;
    return <OperationDialog title="Jadwalkan Ulang" submitText="Simpan jadwal baru" blocked={!startTime || same} onClose={onClose}
        onSubmit={async (fields, requestId) => {
            await submitOperation({
                action: 'reschedule', orderId: order.orderId, requestId, date, roomId, startTime,
                expectedDate: order.bookingDate, expectedRoom: order.roomId, expectedStart: order.startTime,
                reason: fields.get('reason'),
            });
            await onSaved();
        }}>
        <p>Jadwal saat ini {order.bookingDate} · {order.startTime}–{order.endTime} WITA · {order.roomName ?? 'Ruangan belum tercatat'}</p>
        <label>Tanggal baru<input type="date" required min={today} value={date}
            onChange={(e) => { setDate(e.target.value); setStartTime(''); }} /></label>
        <label>Ruangan<select value={roomId} onChange={(e) => { setRoomId(e.target.value); setStartTime(''); }}>
            {order.rooms.map((room) => <option value={room.id} key={room.id}>{room.name}</option>)}
        </select></label>
        <SlotField key={query} query={query} value={startTime} onChange={setStartTime} />
        {same && <small>Pilih jadwal yang berbeda.</small>}
        <label>Alasan<textarea name="reason" required maxLength={300} rows={2} /></label>
    </OperationDialog>;
}

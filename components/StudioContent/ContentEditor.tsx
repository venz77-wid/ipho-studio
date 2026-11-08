'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { FACILITY_ICONS, studioWhatsApp, type Facility, type Faq, type StudioContent, type StudioTextKey } from '@/lib/studioContent';
import type { StudioHours } from '@/lib/studioHours';
import { STUDIO_TIME_ZONE } from '@/lib/scheduleUtils';
import { normalizeWhatsApp } from '@/lib/adminBookingOperations';
import StudioAbout from './StudioAbout';
import StudioHoursSummary from './StudioHoursSummary';
import styles from './StudioEditor.module.css';

type Published = {
    content: StudioContent;
    photoUrl: string | null;
    revision: number;
    publishedAt: string | null;
};

const emptyFacility: Facility = { name: '', icon: 'camera', description: '', label: '', visible: true };
const emptyFaq: Faq = { question: '', answer: '', visible: true };

export default function ContentEditor({ initial, hours, today }: {
    initial: Published; hours: StudioHours; today: string;
}) {
    const [saved, setSaved] = useState(initial);
    const [draft, setDraft] = useState(initial.content);
    const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
    const dialog = useRef<HTMLDialogElement>(null);
    const changed = !!photo || removePhoto || JSON.stringify(draft) !== JSON.stringify(saved.content);
    const photoUrl = photo?.url ?? (removePhoto ? null : saved.photoUrl);
    const chat = studioWhatsApp(normalizeWhatsApp(draft.whatsapp));

    useEffect(() => () => {
        if (photo) URL.revokeObjectURL(photo.url);
    }, [photo]);

    useEffect(() => {
        if (!changed) return;
        const warn = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [changed]);

    function discard() {
        if (!window.confirm('Batalkan perubahan yang belum dipublikasikan?')) return;
        setDraft(saved.content);
        setPhoto(null);
        setRemovePhoto(false);
        setOpenFaq(null);
        setMessage(null);
    }

    async function publish(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy || !changed) return;
        setBusy(true);
        setMessage(null);
        const form = new FormData();
        form.set('revision', String(saved.revision));
        form.set('content', JSON.stringify(draft));
        form.set('photoAction', photo ? 'replace' : removePhoto ? 'remove' : 'keep');
        if (photo) form.set('photo', photo.file);
        try {
            const response = await fetch('/api/admin/studio-content', { method: 'POST', body: form });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data) throw new Error(data?.error ?? 'Publikasi belum dapat dikonfirmasi.');
            setSaved(data);
            setDraft(data.content);
            setPhoto(null);
            setRemovePhoto(false);
            setMessage({ error: false, text: 'Perubahan berhasil dipublikasikan.' });
        } catch (error) {
            setMessage({ error: true, text: error instanceof Error ? error.message : 'Publikasi gagal.' });
        } finally {
            setBusy(false);
        }
    }

    function field(key: StudioTextKey, label: string, options: { rows?: number; type?: string; required?: boolean } = {}) {
        const change = (value: string) => setDraft((previous) => ({ ...previous, [key]: value }));
        return <label className={styles.field}>
            <span>{label}</span>
            {options.rows ? (
                <textarea rows={options.rows} value={draft[key]} maxLength={key === 'about' ? 4000 : 1000}
                    required={options.required} onChange={(event) => change(event.target.value)} />
            ) : (
                <input type={options.type ?? 'text'} value={draft[key]} maxLength={1000}
                    required={options.required} onChange={(event) => change(event.target.value)} />
            )}
        </label>;
    }

    function listChange<K extends 'facilities' | 'faqs'>(key: K, items: StudioContent[K]) {
        setDraft((previous) => ({ ...previous, [key]: items }));
    }

    function move<K extends 'facilities' | 'faqs'>(key: K, index: number, delta: number) {
        const list = [...draft[key]];
        const target = index + delta;
        [list[index], list[target]] = [list[target], list[index]];
        if (key === 'faqs' && openFaq === index) setOpenFaq(target);
        else if (key === 'faqs' && openFaq === target) setOpenFaq(index);
        listChange(key, list as StudioContent[K]);
    }

    function itemActions(key: 'facilities' | 'faqs', index: number) {
        return <div className={styles.iconActions}>
            <button type="button" aria-label="Pindahkan ke atas" title="Pindahkan ke atas" disabled={index === 0}
                onClick={() => move(key, index, -1)}><ArrowUp size={15} /></button>
            <button type="button" aria-label="Pindahkan ke bawah" title="Pindahkan ke bawah" disabled={index === draft[key].length - 1}
                onClick={() => move(key, index, 1)}><ArrowDown size={15} /></button>
            <button type="button" aria-label="Hapus item" title="Hapus item" className={styles.danger}
                onClick={() => {
                    if (key === 'faqs') setOpenFaq(null);
                    if (key === 'faqs') listChange('faqs', draft.faqs.filter((_, position) => position !== index));
                    else listChange('facilities', draft.facilities.filter((_, position) => position !== index));
                }}><Trash2 size={15} /></button>
        </div>;
    }

    return <div className={styles.editor}>
        <header className={styles.pageHeader}>
            <Link href="/admin/kelola-website?tab=tentang">← Kembali ke Kelola Website</Link>
            <p className={styles.breadcrumb}>Admin / Kelola Website / Tentang &amp; Kontak</p>
            <h1>Edit Tentang &amp; Kontak</h1>
            <p>Kelola cerita studio, fasilitas, lokasi, dan kontak yang tampil di website.</p>
        </header>

        <form onSubmit={publish}>
            <fieldset disabled={busy} className={styles.formBody}>
                <Section number="01" title="Pembuka Halaman">
                    {field('title', 'Judul halaman', { required: true })}
                    {field('intro', 'Pengantar singkat', { rows: 2, required: true })}
                    {photoUrl && <figure className={styles.photo}>
                        {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Pratinjau file lokal.
                            <img src={photoUrl} alt={draft.photoAlt} />
                        ) : (
                            <Image src={photoUrl} width={1400} height={788} sizes="(max-width: 900px) 100vw, 850px" alt={draft.photoAlt} />
                        )}
                    </figure>}
                    <div className={styles.row}>
                        <label className={styles.field}><span>{photoUrl ? 'Ganti foto utama' : 'Pilih foto utama'}</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (!file) return;
                                if (file.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                                    setMessage({ error: true, text: 'Gunakan JPG, PNG, atau WebP maksimal 8 MB.' });
                                    return;
                                }
                                setPhoto({ file, url: URL.createObjectURL(file) });
                                setRemovePhoto(false);
                                setMessage(null);
                            }} />
                            <small>JPG, PNG, atau WebP. Maksimal 8 MB.</small>
                        </label>
                        {photoUrl && <button type="button" className={styles.danger} onClick={() => {
                            setPhoto(null);
                            setRemovePhoto(Boolean(saved.photoUrl));
                        }}>Hapus Foto</button>}
                    </div>
                    <div className={styles.grid}>
                        {field('photoCaption', 'Keterangan foto')}
                        {field('photoAlt', 'Teks alternatif foto', { required: Boolean(photoUrl) })}
                    </div>
                </Section>

                <Section number="02" title="Tentang Studio">
                    {field('about', 'Cerita studio', { rows: 6, required: true })}
                </Section>

                <Section number="03" title="Fasilitas Studio">
                    {draft.facilities.map((item, index) => {
                        const update = (patch: Partial<Facility>) =>
                            listChange('facilities', draft.facilities.map((entry, i) => i === index ? { ...entry, ...patch } : entry));
                        return <div className={styles.item} key={index}>
                            <div className={styles.itemHeader}>
                                <strong>{item.name || 'Fasilitas baru'}</strong>
                                <label className={styles.toggle}>
                                    <input type="checkbox" checked={item.visible} onChange={(event) => update({ visible: event.target.checked })} /> Tampilkan di website
                                </label>
                                {itemActions('facilities', index)}
                            </div>
                            <div className={styles.gridThree}>
                                <label className={styles.field}><span>Ikon</span>
                                    <select value={item.icon} onChange={(event) => update({ icon: event.target.value as Facility['icon'] })}>
                                        {Object.entries(FACILITY_ICONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                    </select>
                                </label>
                                <label className={styles.field}><span>Nama fasilitas</span>
                                    <input value={item.name} required maxLength={100} onChange={(event) => update({ name: event.target.value })} />
                                </label>
                                <label className={styles.field}><span>Label kecil</span>
                                    <input value={item.label} maxLength={80} onChange={(event) => update({ label: event.target.value })} />
                                </label>
                            </div>
                            <label className={styles.field}><span>Deskripsi fasilitas</span>
                                <textarea rows={2} required={item.visible} value={item.description} maxLength={500}
                                    onChange={(event) => update({ description: event.target.value })} />
                            </label>
                        </div>;
                    })}
                    <button type="button" onClick={() => listChange('facilities', [...draft.facilities, emptyFacility])}
                        disabled={draft.facilities.length >= 40}><Plus size={16} /> Tambah Fasilitas</button>
                </Section>

                <Section number="04" title="Lokasi Studio">
                    {field('address', 'Alamat lengkap', { required: true })}
                    {field('directions', 'Petunjuk akses atau patokan', { rows: 2 })}
                    <div className={styles.row}>
                        {field('maps', 'Tautan Google Maps', { type: 'url' })}
                        {draft.maps.startsWith('https://') && <a className={styles.button} href={draft.maps} target="_blank" rel="noreferrer">Uji Maps <ExternalLink size={14} /></a>}
                    </div>
                </Section>

                <Section number="05" title="Jam Operasional">
                    <div className={styles.item}>
                        <strong>Jadwal Studio · WITA</strong>
                        <StudioHoursSummary hours={hours} today={today} />
                    </div>
                    <Link href="/admin/operasional">Atur di Ruangan &amp; Operasional →</Link>
                </Section>

                <Section number="06" title="Hubungi Kami">
                    <div className={styles.grid}>
                        {field('contactTitle', 'Judul bagian')}
                        {field('contactCardTitle', 'Judul kartu kontak')}
                    </div>
                    {field('contactIntro', 'Pengantar konsultasi', { rows: 2 })}
                    {field('contactDescription', 'Deskripsi layanan konsultasi', { rows: 2 })}
                    <div className={styles.grid}>
                        {field('whatsapp', 'WhatsApp resmi', { type: 'tel', required: true })}
                        {field('phone', 'Telepon studio', { type: 'tel' })}
                        {field('email', 'Email resmi', { type: 'email' })}
                        {field('serviceHours', 'Keterangan jam layanan admin')}
                    </div>
                    {chat && <a className={styles.button} href={chat} target="_blank" rel="noreferrer">Uji WhatsApp <ExternalLink size={14} /></a>}
                </Section>

                <Section number="07" title="Media Sosial">
                    <div className={styles.grid}>
                        {field('instagram', 'Tautan Instagram', { type: 'url' })}
                        {field('tiktok', 'Tautan TikTok', { type: 'url' })}
                    </div>
                    <small>Tautan yang kosong disembunyikan di website.</small>
                </Section>

                <Section number="08" title="Pertanyaan Umum">
                    {draft.faqs.map((item, index) => {
                        const update = (patch: Partial<Faq>) =>
                            listChange('faqs', draft.faqs.map((entry, i) => i === index ? { ...entry, ...patch } : entry));
                        return <div key={index} className={styles.item}>
                            <div className={styles.itemHeader}>
                                <button type="button" className={styles.faqToggle} aria-expanded={openFaq === index}
                                    aria-controls={`faq-editor-${index}`} onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                                    {openFaq === index ? '▾' : '▸'} {item.question || 'Pertanyaan baru'}
                                </button>
                                <label className={styles.toggle}>
                                    <input type="checkbox" checked={item.visible} onChange={(event) => update({ visible: event.target.checked })} /> Tampilkan di website
                                </label>
                                {itemActions('faqs', index)}
                            </div>
                            <div id={`faq-editor-${index}`} hidden={openFaq !== index}>
                                <label className={styles.field}><span>Pertanyaan</span>
                                    <input value={item.question} maxLength={200} onChange={(event) => update({ question: event.target.value })} />
                                </label>
                                <label className={styles.field}><span>Jawaban</span>
                                    <textarea rows={3} value={item.answer} maxLength={2000} onChange={(event) => update({ answer: event.target.value })} />
                                </label>
                            </div>
                        </div>;
                    })}
                    <button type="button" disabled={draft.faqs.length >= 40} onClick={() => {
                        setOpenFaq(draft.faqs.length);
                        listChange('faqs', [...draft.faqs, emptyFaq]);
                    }}><Plus size={16} /> Tambah Pertanyaan</button>
                    <small>Sesuaikan jawaban dengan kebijakan studio yang berlaku.</small>
                </Section>

                <Section number="09" title="Ajakan Booking">
                    {field('bookingTitle', 'Judul ajakan', { required: true })}
                    {field('bookingDescription', 'Deskripsi singkat', { rows: 2 })}
                    <small>Tombol mengarah ke Katalog Paket dan WhatsApp resmi studio.</small>
                </Section>
            </fieldset>

            <div className={styles.actionsBar}>
                <div aria-live="polite">
                    {message && <p className={message.error ? styles.error : styles.success}>{message.text}</p>}
                    <small>{changed ? 'Ada perubahan belum disimpan' : saved.publishedAt
                        ? `Terakhir dipublikasikan ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: STUDIO_TIME_ZONE }).format(new Date(saved.publishedAt))} WITA`
                        : 'Konten awal studio'}</small>
                </div>
                <div className={styles.row}>
                    <button type="button" disabled={busy || !changed} onClick={discard}>Batalkan Perubahan</button>
                    <button type="button" onClick={() => dialog.current?.showModal()}>Pratinjau</button>
                    <button type="submit" className={styles.primary} disabled={busy || !changed}>{busy ? 'Menyimpan…' : 'Simpan & Publikasikan'}</button>
                </div>
            </div>
        </form>

        <dialog ref={dialog} className={styles.dialog} aria-label="Pratinjau Tentang & Kontak">
            <div className={styles.dialogHeader}>
                <strong>Pratinjau Tentang &amp; Kontak</strong>
                <button type="button" aria-label="Tutup pratinjau" onClick={() => dialog.current?.close()}><X size={18} /></button>
            </div>
            <StudioAbout content={{
                ...draft,
                whatsapp: normalizeWhatsApp(draft.whatsapp),
                maps: draft.maps.startsWith('https://') ? draft.maps : '',
                instagram: draft.instagram.startsWith('https://') ? draft.instagram : '',
                tiktok: draft.tiktok.startsWith('https://') ? draft.tiktok : '',
            }} photoUrl={photoUrl} hours={hours} today={today} />
        </dialog>
    </div>;
}

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
    return <section className={styles.card}>
        <h2><span>{number}</span> {title}</h2>
        {children}
    </section>;
}

'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
    ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, Check, Eye, GripVertical, Monitor, Plus, Search, Smartphone,
} from 'lucide-react';
import AdminRowAction from '@/components/AdminRowAction/AdminRowAction';
import PortfolioGallery from './PortfolioGallery';
import PortfolioPhotoDialog, { photoSrc, type DraftPhoto, type LocalPhoto } from './PortfolioPhotoDialog';
import { PORTFOLIO_MAX_PHOTOS, type PortfolioCategory, type PortfolioPackage, type PortfolioSnapshot } from '@/lib/portfolioTypes';
import styles from './PortfolioEditor.module.css';

const endpoint = '/api/admin/studio-portfolio';

interface Props {
    initial: PortfolioSnapshot;
    categories: PortfolioCategory[];
    packages: PortfolioPackage[];
    ready: boolean;
    storageBase: string;
    chat: string | null;
    previewHeader: ReactNode;
    previewFooter: ReactNode;
}

async function send(method: 'POST' | 'PUT', body: FormData | object) {
    const form = body instanceof FormData;
    const response = await fetch(endpoint, {
        method,
        headers: form ? undefined : { 'Content-Type': 'application/json' },
        body: form ? body : JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(data?.error ?? 'Perubahan belum dapat disimpan. Silakan coba lagi.');
    return data;
}

export default function PortfolioEditor({ initial, categories, packages, ready, storageBase, chat, previewHeader, previewFooter }: Props) {
    const [saved, setSaved] = useState(initial);
    const [title, setTitle] = useState(initial.content.title);
    const [description, setDescription] = useState(initial.content.description);
    const [photos, setPhotos] = useState<DraftPhoto[]>(initial.content.photos);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [visibility, setVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
    const [editing, setEditing] = useState<DraftPhoto | null | undefined>(undefined);
    const [preview, setPreview] = useState(false);
    const [mobile, setMobile] = useState(false);
    const [previewCategory, setPreviewCategory] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const previewDialog = useRef<HTMLDialogElement>(null);
    const dragging = useRef<string | null>(null);
    const localUrls = useRef(new Set<string>());
    const uploadedFiles = useRef(new WeakMap<LocalPhoto, string>());

    const dirty = title !== saved.content.title || description !== saved.content.description ||
        JSON.stringify(photos.map((photo) => photo.source.kind === 'local' ?
            { ...photo, source: photo.source.file.url } : photo)) !== JSON.stringify(saved.content.photos);
    const canReorder = !busy && !query.trim() && !category && visibility === 'all';
    const visibleCount = photos.filter((photo) => photo.visible).length;
    const filtered = photos.filter((photo) =>
        photo.title.toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id')) &&
        (!category || photo.categoryId === category) &&
        (visibility === 'all' || photo.visible === (visibility === 'visible')),
    );
    const publishDate = saved.publishedAt ? new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar',
    }).format(new Date(saved.publishedAt)) + ' WITA' : null;

    useEffect(() => {
        if (preview) previewDialog.current?.showModal();
    }, [preview]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    useEffect(() => {
        const urls = localUrls.current;
        return () => { for (const url of urls) URL.revokeObjectURL(url); };
    }, []);

    function acceptFile(file: File): LocalPhoto {
        const url = URL.createObjectURL(file);
        localUrls.current.add(url);
        return { file, url };
    }

    function setDraftPhoto(photo: DraftPhoto) {
        setPhotos((current) => current.some((item) => item.id === photo.id)
            ? current.map((item) => item.id === photo.id ? photo : item)
            : [...current, photo]);
        setEditing(undefined);
        setNotice('');
    }

    function reorder(from: string, to: string) {
        if (!canReorder || from === to) return;
        setPhotos((current) => {
            const start = current.findIndex((photo) => photo.id === from);
            const end = current.findIndex((photo) => photo.id === to);
            if (start < 0 || end < 0) return current;
            const updated = [...current];
            updated.splice(end, 0, ...updated.splice(start, 1));
            return updated;
        });
    }

    function discard() {
        if (!window.confirm('Batalkan semua perubahan yang belum dipublikasikan?')) return;
        setTitle(saved.content.title);
        setDescription(saved.content.description);
        setPhotos(saved.content.photos);
        setError('');
        setNotice('');
    }

    async function publish() {
        if (!ready || !dirty || busy) return;
        if (!title.trim() || !description.trim()) {
            setError('Isi judul dan deskripsi halaman sebelum publikasi.');
            return;
        }
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const outgoing: PortfolioSnapshot['content']['photos'] = [];
            for (const photo of photos) {
                if (photo.source.kind !== 'local') {
                    outgoing.push({ ...photo, source: photo.source });
                    continue;
                }
                const item = photo.source.file;
                let path = uploadedFiles.current.get(item);
                if (!path) {
                    const form = new FormData();
                    form.append('photo', item.file);
                    const uploaded = await send('POST', form);
                    if (typeof uploaded.path !== 'string') throw new Error('Foto unggahan belum tersedia.');
                    path = uploaded.path as string;
                    uploadedFiles.current.set(item, path);
                }
                outgoing.push({ ...photo, source: { kind: 'upload', path } });
            }
            const result: PortfolioSnapshot = await send('PUT', {
                content: { title, description, photos: outgoing }, revision: saved.revision,
            });
            setSaved(result);
            setTitle(result.content.title);
            setDescription(result.content.description);
            setPhotos(result.content.photos);
            setNotice('Portofolio berhasil dipublikasikan.');
        } catch (problem) {
            setError(problem instanceof Error ? problem.message : 'Publikasi gagal. Silakan coba lagi.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={styles.editor}>
            <header className={styles.heading}>
                <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
                    Admin / <Link href="/admin/kelola-website?tab=portofolio">Kelola Website</Link> / Galeri Portofolio
                </nav>
                <div className={styles.headingRow}>
                    <div><h1>Edit Galeri Portofolio</h1><p>Pilih foto dan atur susunannya di halaman Portofolio pelanggan.</p></div>
                    <Link href="/portofolio" className={styles.button} target="_blank" rel="noreferrer">Lihat Halaman Publik <ArrowUpRight size={16} /></Link>
                </div>
                {publishDate && <small>Terakhir dipublikasikan {publishDate}</small>}
            </header>

            {!ready && <p className={styles.error} role="status">Jalankan SQL pemasangan lalu muat ulang halaman untuk mengaktifkan publikasi.</p>}

            <details className={styles.card} open>
                <summary>Pembuka Halaman</summary>
                <div className={styles.introFields}>
                    <label>Judul Halaman<input value={title} maxLength={100} disabled={busy} onChange={(event) => setTitle(event.target.value)} /></label>
                    <label>Deskripsi Singkat<textarea value={description} maxLength={500} rows={3} disabled={busy}
                        onChange={(event) => setDescription(event.target.value)} /></label>
                </div>
            </details>

            <section className={styles.card} aria-labelledby="gallery-editor-title">
                <div className={styles.sectionHead}>
                    <div>
                        <div className={styles.sectionTitle}>
                            <h2 id="gallery-editor-title">Foto Galeri</h2><span className={styles.badge}>{photos.length} foto</span>
                        </div>
                        <p>Atur urutan dan pilih foto yang tampil di website.</p>
                    </div>
                    <button className={styles.primary} type="button" onClick={() => setEditing(null)}
                        disabled={busy || photos.length >= PORTFOLIO_MAX_PHOTOS}><Plus size={17} /> Tambah Foto</button>
                </div>
                <div className={styles.toolbar}>
                    <div className={styles.searchRow}>
                        <label className={styles.search}><Search size={16} aria-hidden /><input aria-label="Cari judul foto"
                            placeholder="Cari judul foto…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                        <select aria-label="Filter kategori" value={category} onChange={(event) => setCategory(event.target.value)}>
                            <option value="">Semua Kategori</option>
                            {categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                        </select>
                    </div>
                    <div className={styles.filterRow}>
                        <div className={styles.segments} aria-label="Filter status foto">
                            {([
                                ['all', `Semua (${photos.length})`],
                                ['visible', `Tampil (${visibleCount})`],
                                ['hidden', `Disembunyikan (${photos.length - visibleCount})`],
                            ] as const).map(([value, label]) => (
                                <button type="button" key={value} aria-pressed={visibility === value} onClick={() => setVisibility(value)}>{label}</button>
                            ))}
                        </div>
                        {!canReorder && !busy && <small>Untuk mengatur urutan, kosongkan pencarian dan pilih semua filter.</small>}
                    </div>
                </div>

                {filtered.length === 0 && <p className={styles.empty}>{photos.length ? 'Tidak ada foto yang cocok dengan filter.' : 'Belum ada foto. Klik Tambah Foto untuk mulai.'}</p>}
                <ol className={styles.list}>
                    {filtered.map((photo) => {
                        const index = photos.findIndex((item) => item.id === photo.id);
                        const categoryName = categories.find((item) => item.id === photo.categoryId)?.name ?? 'Kategori tidak tersedia';
                        return (
                            <li key={photo.id} className={styles.photoRow} data-hidden={!photo.visible}
                                onDragOver={(event) => { if (canReorder && dragging.current) event.preventDefault(); }}
                                onDrop={(event) => { event.preventDefault(); if (dragging.current) reorder(dragging.current, photo.id); dragging.current = null; }}>
                                <div className={styles.order}>
                                    {canReorder && <span className={styles.grip} draggable title="Seret untuk mengatur urutan"
                                        onDragStart={(event) => {
                                            dragging.current = photo.id;
                                            event.dataTransfer.effectAllowed = 'move';
                                            event.dataTransfer.setData('text/plain', photo.id);
                                        }} onDragEnd={() => { dragging.current = null; }}><GripVertical size={17} aria-hidden /></span>}
                                    <div className={styles.arrows}>
                                        <button type="button" disabled={!canReorder || index === 0} aria-label={`Pindahkan ${photo.title} ke atas`}
                                            onClick={() => reorder(photo.id, photos[index - 1].id)}><ArrowUp size={14} /></button>
                                        <button type="button" disabled={!canReorder || index === photos.length - 1} aria-label={`Pindahkan ${photo.title} ke bawah`}
                                            onClick={() => reorder(photo.id, photos[index + 1].id)}><ArrowDown size={14} /></button>
                                    </div>
                                    <span>#{String(index + 1).padStart(2, '0')}</span>
                                </div>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img className={styles.thumb} src={photoSrc(photo, storageBase)} alt="" loading="lazy" style={{ objectPosition: photo.position }} />
                                <div className={styles.photoText}>
                                    <strong>{photo.title}</strong>
                                    <span className={styles.badge}>{categoryName}</span>
                                    <p>{photo.source.kind === 'package' ? `Dari paket: ${photo.source.label}` : 'Foto unggahan'}</p>
                                </div>
                                <label className={styles.switchLabel}>
                                    <input type="checkbox" role="switch" checked={photo.visible} disabled={busy}
                                        aria-label={`Tampilkan ${photo.title} di website`}
                                        onChange={(event) => setPhotos((current) => current.map((item) =>
                                            item.id === photo.id ? { ...item, visible: event.target.checked } : item))} />
                                    {photo.visible ? 'Tampil' : 'Disembunyikan'}
                                </label>
                                <button className={styles.button} type="button" disabled={busy} onClick={() => setEditing(photo)}>Edit</button>
                                <AdminRowAction label={`Tindakan untuk ${photo.title}`} action="Hapus dari Portofolio" danger
                                    disabled={busy} onAction={() => {
                                        if (window.confirm(`Hapus “${photo.title}” dari portofolio? Foto sumber tetap tersedia.`)) {
                                            setPhotos((current) => current.filter((item) => item.id !== photo.id));
                                        }
                                    }} />
                            </li>
                        );
                    })}
                </ol>
            </section>

            <div className={styles.actionBar}>
                <div aria-live="polite">
                    {error ? <p className={styles.error} role="alert">{error}</p>
                        : <p><span className={dirty ? styles.dirtyDot : styles.savedDot} aria-hidden />{busy ? 'Sedang mempublikasikan…' :
                            dirty ? 'Ada perubahan belum disimpan' : notice || 'Belum ada perubahan'}</p>}
                </div>
                <div className={styles.actionButtons}>
                    <button className={styles.button} type="button" disabled={!dirty || busy} onClick={discard}>Batalkan Perubahan</button>
                    <button className={styles.button} type="button" disabled={busy} onClick={() => { setPreviewCategory(''); setPreview(true); }}><Eye size={16} /> Pratinjau</button>
                    <button className={styles.primary} type="button" disabled={!ready || !dirty || busy} onClick={publish}><Check size={16} /> Simpan &amp; Publikasikan</button>
                </div>
            </div>

            {editing !== undefined && <PortfolioPhotoDialog photo={editing} packages={packages} categories={categories}
                storageBase={storageBase} onFile={acceptFile} onSave={setDraftPhoto} onClose={() => setEditing(undefined)} />}

            {preview && (
                <dialog ref={previewDialog} className={styles.previewDialog} aria-labelledby="preview-title" onClose={() => setPreview(false)}
                    onCancel={(event) => { event.preventDefault(); setPreview(false); }}>
                    <div className={styles.previewBar}>
                        <button className={styles.button} type="button" onClick={() => setPreview(false)}><ArrowLeft size={16} /> Kembali ke Editor</button>
                        <strong id="preview-title">Pratinjau perubahan</strong>
                        <div className={styles.segments} aria-label="Ukuran pratinjau">
                            <button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor size={15} /> Desktop</button>
                            <button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone size={15} /> HP</button>
                        </div>
                    </div>
                    <div className={mobile ? styles.mobileFrame : styles.desktopFrame}
                        onClick={(event) => { if ((event.target as HTMLElement).closest('a')) event.preventDefault(); }}>
                        <div inert>{previewHeader}</div>
                        <PortfolioGallery title={title} description={description} categories={categories}
                            photos={photos.filter((photo) => photo.visible).map((photo) => ({
                                id: photo.id, title: photo.title, alt: photo.alt, categoryId: photo.categoryId,
                                aspectRatio: photo.aspectRatio, position: photo.position, src: photoSrc(photo, storageBase),
                            }))}
                            chat={chat} categorySlug={previewCategory} onCategoryChange={setPreviewCategory} />
                        <div inert>{previewFooter}</div>
                    </div>
                </dialog>
            )}
        </div>
    );
}

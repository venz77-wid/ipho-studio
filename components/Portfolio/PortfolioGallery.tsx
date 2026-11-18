'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MessageSquare } from 'lucide-react';
import type { GalleryPhoto, PortfolioCategory } from '@/lib/portfolioTypes';
import styles from '@/app/portofolio/page.module.css';

interface PortfolioGalleryProps {
    title: string;
    description: string;
    categories: PortfolioCategory[];
    photos: GalleryPhoto[];
    categorySlug?: string;
    chat: string | null;
    unavailable?: boolean;
    onCategoryChange?: (slug: string) => void;
}

export default function PortfolioGallery({
    title, description, categories, photos: allPhotos, categorySlug, chat, unavailable, onCategoryChange,
}: PortfolioGalleryProps) {
    const selected = categories.find((category) => category.slug === categorySlug);
    const photos = allPhotos.filter((photo) => !selected || photo.categoryId === selected.id);
    return (
        <div className={styles.page}>
            <div className={styles.surface}>
                <div className={styles.container}>
                    <section className={styles.intro} aria-labelledby="portfolio-title">
                        <p className={styles.eyebrow}><span aria-hidden /> Galeri Karya &amp; Inspirasi</p>
                        <h1 id="portfolio-title">{title}</h1>
                        <p className={styles.description}>
                            {description}
                        </p>
                    </section>

                    {!unavailable && (
                        <nav className={styles.filters} aria-label="Kategori portofolio">
                            {[{ id: '', slug: '', name: 'Semua' }, ...categories].map((category) => {
                                const active = (selected?.id ?? '') === category.id;
                                return onCategoryChange ? (
                                    <button key={category.id} type="button" aria-pressed={active}
                                        className={styles.filter} onClick={() => onCategoryChange(category.slug)}>
                                        {category.name}
                                    </button>
                                ) : (
                                    <Link key={category.id} className={styles.filter} aria-current={active ? 'page' : undefined}
                                        href={category.slug ? `/portofolio?kategori=${encodeURIComponent(category.slug)}` : '/portofolio'}>
                                        {category.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    )}

                    {unavailable || photos.length === 0 ? (
                        <p className={styles.empty}>
                            {!unavailable ? 'Belum ada foto di kategori ini.' : 'Galeri sedang tidak tersedia. Silakan coba lagi nanti.'}
                        </p>
                    ) : (
                        <ul className={styles.gallery} aria-label="Galeri foto IPHO Studio">
                            {photos.map((photo, index) => (
                                <li
                                    key={photo.id}
                                    className={styles.photo}
                                    style={{ aspectRatio: photo.aspectRatio }}
                                >
                                    <Image
                                        src={photo.src}
                                        alt={photo.alt}
                                        fill
                                        unoptimized={photo.src.startsWith('blob:')}
                                        sizes="(max-width: 540px) calc(100vw - 40px), (max-width: 860px) 46vw, (max-width: 1550px) 30vw, 470px"
                                        loading={index < 3 ? 'eager' : 'lazy'}
                                        className={styles.image}
                                        style={{ objectPosition: photo.position }}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}

                    <section className={styles.cta} aria-labelledby="portfolio-cta">
                        <p className={styles.eyebrow}>Konsultasi Kreatif</p>
                        <h2 id="portfolio-cta">Ingin hasil foto seperti ini?</h2>
                        <p className={styles.ctaDescription}>
                            Wujudkan narasi visual personal atau komersial Anda bersama fotografer profesional
                            dan ruang studio natural light. Diskusikan moodboard Anda bersama tim kami.
                        </p>
                        <div className={styles.actions}>
                            <Link href="/katalog" className={styles.primary}>
                                Lihat Paket Foto <ArrowRight size={16} aria-hidden />
                            </Link>
                            {chat ? (
                                <a href={chat} target="_blank" rel="noreferrer" className={styles.secondary}>
                                    <MessageSquare size={16} aria-hidden /> Tanya Admin
                                </a>
                            ) : (
                                <Link href="/tentang" className={styles.secondary}>
                                    <MessageSquare size={16} aria-hidden /> Tanya Admin
                                </Link>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

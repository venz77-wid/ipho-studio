import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Camera, Shirt, Star, Sun, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import PackageCard from '@/components/PackageCard/PackageCard';
import {
  getFeaturedPackages, getGalleryImages, getStudioFeatures,
  type StudioFeature,
} from '@/lib/supabaseMock';
import styles from './page.module.css';

const ICONS: Record<StudioFeature['icon'], LucideIcon> = {
  sun: Sun, zap: Zap, shirt: Shirt, camera: Camera,
};

export default async function HomePage(): Promise<React.JSX.Element> {
  const [packages, gallery, features] = await Promise.all([
    getFeaturedPackages(), getGalleryImages(), getStudioFeatures(),
  ]);

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div>
                <span className={styles.pill}>
                  <i className={styles.dot} aria-hidden />
                  STUDIO FOTOGRAFI PROFESIONAL
                </span>
                <h1 className={styles.h1}>
                  Abadikan Momen Berharga dengan Sentuhan Estetika Abadi.
                </h1>
                <p className={styles.lead}>
                  Layanan studio foto modern dengan pencahayaan profesional, set studio estetik,
                  dan fotografer berpengalaman untuk potret personal, wisuda, keluarga, maupun komersial.
                </p>
                <div className={styles.actions}>
                  <Link href="/booking" className={styles.btnDark}>
                    Booking Sekarang <ArrowRight size={14} aria-hidden />
                  </Link>
                  <Link href="/jadwal" className={styles.btnLight}>
                    <CalendarDays size={14} aria-hidden /> Lihat Jadwal Tersedia
                  </Link>
                </div>
                <div className={styles.rating}>
                  <span className={styles.stars} aria-label="Rating 5 bintang">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={14} fill="#f5a623" stroke="#f5a623" />
                    ))}
                  </span>
                  <strong>4.9/5</strong>
                  <span className={styles.sep} aria-hidden />
                  <span className={styles.trust}>Dipercaya 1.000+ klien individu &amp; perusahaan</span>
                </div>
              </div>

              <div className={styles.heroImage}>
                <Image
                  src="/images/hero.jpg"
                  alt="Fotografer dan model di IPHO Studio"
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className={styles.cover}
                />
                <div className={styles.floating}>
                  <i className={styles.dotGreen} aria-hidden />
                  <div>
                    <span>RENTAL OR PHOTO SESSION</span>
                    <strong>Available 7 Days a Week</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT + GALLERY */}
        <section className={styles.about}>
          <div className={styles.container}>
            <div className={styles.aboutHead}>
              <div>
                <span className={styles.eyebrow}>TENTANG IPHO STUDIO</span>
                <h2 className={styles.h2}>Ruang Kreatif Modern dengan Pencahayaan Presisi</h2>
              </div>
              <p className={styles.aboutText}>
                Dirancang dengan perpaduan natural daylight jendela utara, cyclorama wall tanpa
                sambungan, ruang ganti ber-AC privat, dan perlengkapan lighting standar industri
                demi mewujudkan atmosfer visual yang elegan dan murni.
              </p>
            </div>

            <ul className={styles.badges}>
              {features.map((f) => {
                const Icon = ICONS[f.icon];
                return (
                  <li key={f.id}><Icon size={16} aria-hidden /> {f.label}</li>
                );
              })}
            </ul>

            <div className={styles.gallery}>
              {gallery.map((g) => (
                <div key={g.id} className={styles.galleryItem}>
                  {/* File: public/images/gallery-1.jpg s/d gallery-6.jpg */}
                  <Image src={g.src} alt={g.alt} fill sizes="(max-width: 900px) 50vw, 33vw" className={styles.cover} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className={styles.pricing}>
          <div className={styles.container}>
            <div className={styles.pricingHead}>
              <div>
                <span className={styles.eyebrow}>PALING DIMINATI</span>
                <h2 className={styles.h2}>Paket Foto Favorit</h2>
                <p className={styles.sub}>
                  Pilihan paling diminati dengan fasilitas lengkap dan hasil berkualitas tinggi.
                </p>
              </div>
              <p className={styles.note}>Transparansi harga tanpa biaya tersembunyi.</p>
            </div>

            <div className={styles.cards}>
              {packages.map((p) => (
                <PackageCard key={p.id} data={p} />
              ))}
            </div>

            {/* CTA */}
            <div className={styles.cta}>
              <div className={styles.ctaIcon}><BookOpen size={20} aria-hidden /></div>
              <div className={styles.ctaText}>
                <h3>Mencari kebutuhan khusus atau sewa space studio saja?</h3>
                <p>
                  Katalog lengkap kami menyediakan sewa studio per jam, add-ons makeup artist,
                  dan opsi high impact up khusus.
                </p>
              </div>
              <Link href="/katalog" className={styles.ctaBtn}>
                Buka Katalog Lengkap <ArrowUpRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
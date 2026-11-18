import Link from 'next/link';
import Image from 'next/image';
import {
    Armchair, ArrowUpRight, Camera, ChevronDown, Clock, MapPin, MessageSquare, Palette, Shirt,
    Snowflake, SquareParking,
} from 'lucide-react';
import { studioWhatsApp, type StudioContent } from '@/lib/studioContent';
import type { StudioHours } from '@/lib/studioHours';
import StudioHoursSummary from './StudioHoursSummary';
import styles from './StudioAbout.module.css';

const icons = { snow: Snowflake, shirt: Shirt, palette: Palette, armchair: Armchair, parking: SquareParking, camera: Camera };
const illustration = '/images/tentang.jpg';

type AboutProps = {
    content: StudioContent;
    photoUrl: string | null;
    hours: StudioHours | null;
    today: string;
};

export default function StudioAbout({ content, photoUrl, hours, today }: AboutProps) {
    const chat = studioWhatsApp(content.whatsapp);
    const facilities = content.facilities.filter((item) => item.visible);
    const faqs = content.faqs.filter((item) => item.visible);
    const caption = photoUrl ? content.photoCaption : 'Ilustrasi ruang studio';

    return (
        <article className={styles.page}>
            <section>
                <p className={styles.eyebrow}>Informasi resmi studio</p>
                <h1>{content.title}</h1>
                <p className={styles.intro}>{content.intro}</p>
                <figure className={styles.heroPhoto}>
                    {photoUrl?.startsWith('blob:') ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Pratinjau foto lokal.
                        <img src={photoUrl} alt={content.photoAlt} />
                    ) : (
                        <Image
                            src={photoUrl || illustration}
                            alt={photoUrl ? content.photoAlt : 'Ilustrasi ruang foto dengan jendela besar dan latar putih'}
                            fill
                            sizes="(min-width: 1440px) 1328px, 92vw"
                            loading="eager"
                            fetchPriority="high"
                            unoptimized={!photoUrl}
                        />
                    )}
                    {caption && <figcaption>{caption}</figcaption>}
                </figure>
            </section>

            <section className={styles.section}>
                <p className={styles.eyebrow}>01 / Profil studio</p>
                <div className={styles.story}>
                    <h2>Tentang Kami</h2>
                    <p className={styles.multiline}>{content.about}</p>
                </div>
            </section>

            {facilities.length > 0 && <section className={styles.section}>
                <p className={styles.eyebrow}>02 / Fasilitas tersedia</p>
                <h2>Fasilitas Studio</h2>
                <div className={styles.facilities}>
                    {facilities.map((item, index) => {
                        const Icon = icons[item.icon] ?? Camera;
                        return <div className={styles.facility} key={index}>
                            <span className={styles.icon}><Icon size={19} aria-hidden /></span>
                            <h3>{item.name}</h3>
                            <p>{item.description}</p>
                            {item.label && <small>{item.label}</small>}
                        </div>;
                    })}
                </div>
            </section>}

            <section className={styles.section}>
                <p className={styles.eyebrow}>03 / Lokasi &amp; waktu</p>
                <h2>Informasi Kunjungan</h2>
                <div className={styles.columns}>
                    <div className={styles.card}>
                        <h3><MapPin size={19} aria-hidden /> Lokasi Studio</h3>
                        <p className={styles.eyebrow}>Alamat lengkap</p>
                        <p className={styles.address}>{content.address}</p>
                        {(content.directions || content.maps) && <div className={styles.note}>
                            <p className={styles.eyebrow}>Panduan akses</p>
                            <p>{content.directions || 'Gunakan pin Google Maps untuk petunjuk arah menuju studio.'}</p>
                        </div>}
                        {content.maps && <a className={styles.secondary} href={content.maps} target="_blank" rel="noreferrer">
                            Buka Google Maps <ArrowUpRight size={15} aria-hidden />
                        </a>}
                    </div>
                    <div className={styles.card}>
                        <h3><Clock size={19} aria-hidden /> Jam Operasional <span className={styles.timeZone}>WITA</span></h3>
                        <StudioHoursSummary hours={hours} today={today} />
                        <p className={styles.hoursNote}>Ketersediaan sesi mengikuti jadwal reservasi studio.</p>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <p className={styles.eyebrow}>04 / Komunikasi langsung</p>
                <h2>{content.contactTitle || 'Hubungi Kami'}</h2>
                {content.contactIntro && <p className={styles.contactIntro}>{content.contactIntro}</p>}
                <div className={`${styles.card} ${styles.contact}`}>
                    <div>
                        <h3><MessageSquare size={20} aria-hidden /> {content.contactCardTitle || 'Hubungi Admin Studio'}</h3>
                        {content.contactDescription && <p className={styles.contactDescription}>{content.contactDescription}</p>}
                        <div className={styles.contactMeta}>
                            {content.email && <p>Email resmi <a href={`mailto:${content.email}`}>{content.email}</a></p>}
                            {content.phone && <p>Telepon <a href={`tel:${content.phone.replace(/[^\d+]/g, '')}`}>{content.phone}</a></p>}
                            {content.serviceHours && <p>{content.serviceHours}</p>}
                        </div>
                    </div>
                    <div className={styles.contactActions}>
                        {chat && <a className={styles.primary} href={chat} target="_blank" rel="noreferrer">
                            <MessageSquare size={16} aria-hidden /> Chat Admin via WhatsApp
                        </a>}
                        {(content.instagram || content.tiktok) && <div className={styles.socials}>
                            {content.instagram && <a href={content.instagram} target="_blank" rel="noreferrer">Instagram</a>}
                            {content.tiktok && <a href={content.tiktok} target="_blank" rel="noreferrer">TikTok</a>}
                        </div>}
                    </div>
                </div>
            </section>

            {faqs.length > 0 && <section className={styles.section}>
                <p className={styles.eyebrow}>05 / Panduan pelanggan</p>
                <h2>Pertanyaan yang Sering Diajukan</h2>
                <div className={styles.faq}>
                    {faqs.map((item, index) => <details key={index}>
                        <summary>{item.question}<ChevronDown size={17} aria-hidden /></summary>
                        <p className={styles.multiline}>{item.answer}</p>
                    </details>)}
                </div>
            </section>}

            <section className={styles.banner}>
                <div>
                    <h2>{content.bookingTitle}</h2>
                    <p>{content.bookingDescription}</p>
                </div>
                <div className={styles.actions}>
                    <Link href="/katalog" className={styles.primary}>Lihat Katalog Paket</Link>
                    {chat && <a className={styles.secondary} href={chat} target="_blank" rel="noreferrer">Tanya Admin</a>}
                </div>
            </section>
        </article>
    );
}

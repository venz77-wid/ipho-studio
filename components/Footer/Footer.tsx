import Link from 'next/link';
import Image from 'next/image';
import { Camera, MessageSquare } from 'lucide-react';
import { loadStudioContent } from '@/lib/studioContentData';
import { loadStudioHours } from '@/lib/studioHoursData';
import { getStudioNow } from '@/lib/scheduleUtils';
import { DEFAULT_STUDIO_CONTENT, studioWhatsApp } from '@/lib/studioContent';
import StudioHoursSummary from '@/components/StudioContent/StudioHoursSummary';
import styles from './Footer.module.css';

export default async function Footer() {
    const [site, schedule] = await Promise.all([
        loadStudioContent().catch(() => null),
        loadStudioHours().catch(() => null),
    ]);
    const content = site?.content ?? DEFAULT_STUDIO_CONTENT;
    const chat = studioWhatsApp(content.whatsapp);
    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <div className={styles.top}>
                    <div>
                        <div className={styles.brand}>
                            <Image
                                src="/images/logo.png"
                                alt="IPHO Studio Logo"
                                width={50}
                                height={50}
                            />
                            <span className={styles.brandText}>IPHO STUDIO</span>
                        </div>
                        <p className={styles.tagline}>
                            Sewa Studio Foto &amp; Layanan Fotografi Profesional di Indonesia
                        </p>
                    </div>

                    <nav className={styles.links} aria-label="Tautan footer">
                        <Link href="/syarat-ketentuan">Syarat &amp; Ketentuan</Link>
                        <Link href="/kebijakan-privasi">Kebijakan Privasi</Link>
                        <Link href="/tentang">Tentang &amp; Kontak</Link>
                        {content.instagram && <a href={content.instagram} target="_blank" rel="noreferrer">
                            <Camera size={14} aria-hidden /> Instagram
                        </a>}
                        {chat && <a href={chat} target="_blank" rel="noreferrer">
                            <MessageSquare size={14} aria-hidden /> WhatsApp CS
                        </a>}
                    </nav>
                </div>
                <div className={styles.visit}>
                    <p>{content.address}</p>
                    <strong>Jam Operasional · WITA</strong>
                    <StudioHoursSummary hours={schedule?.hours ?? null} today={getStudioNow().date} />
                </div>

                <div className={styles.bottom}>
                    <span>© 2026 IPHO Studio. Seluruh hak cipta dilindungi.</span>
                    <span>Modern Aesthetic Daylight Studio</span>
                </div>
            </div>
        </footer>
    );
}
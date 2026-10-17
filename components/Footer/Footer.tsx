import Link from 'next/link';
import Image from 'next/image';
import { Camera, MessageSquare } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer(): React.JSX.Element {
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
                        <a href="https://instagram.com/iphostudio" target="_blank" rel="noreferrer">
                            <Camera size={14} aria-hidden /> Instagram @iphostudio
                        </a>
                        <a href="https://wa.me/" target="_blank" rel="noreferrer">
                            <MessageSquare size={14} aria-hidden /> WhatsApp CS
                        </a>
                    </nav>
                </div>

                <div className={styles.bottom}>
                    <span>© 2026 IPHO Studio. Seluruh hak cipta dilindungi.</span>
                    <span>Modern Aesthetic Daylight Studio</span>
                </div>
            </div>
        </footer>
    );
}
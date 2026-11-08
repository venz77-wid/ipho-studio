import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import StudioAbout from '@/components/StudioContent/StudioAbout';
import styles from '@/components/StudioContent/StudioAbout.module.css';
import { loadStudioContent, publicStudioContent } from '@/lib/studioContentData';
import { loadStudioHours } from '@/lib/studioHoursData';
import { getStudioNow } from '@/lib/scheduleUtils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tentang & Kontak | IPHO Studio' };

export default async function AboutPage() {
    const [{ content, photoUrl }, { hours }] = await Promise.all([loadStudioContent(), loadStudioHours()]);
    const today = getStudioNow().date;
    const publicContent = publicStudioContent(content);

    return <>
        <Navbar />
        <main className={styles.surface}>
            <StudioAbout content={publicContent} photoUrl={photoUrl} hours={hours} today={today} />
        </main>
        <Footer />
    </>;
}

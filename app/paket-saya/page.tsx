import Footer from '@/components/Footer/Footer';
import PaketSayaClient from './PaketSayaClient';

export const dynamic = 'force-dynamic';

export default function PaketSayaPage() {
    return <PaketSayaClient footer={<Footer />} />;
}

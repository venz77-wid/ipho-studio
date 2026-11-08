import Footer from '@/components/Footer/Footer';
import BookingClient from './BookingClient';

export const dynamic = 'force-dynamic';

export default function BookingPage({ searchParams }: { searchParams: Promise<{ paket?: string }> }) {
    return <BookingClient searchParams={searchParams} footer={<Footer />} />;
}

import { supabase } from './supabaseClient';
import type { BookingFormData, TimeSlot } from './bookingTypes';
import type { CatalogPackage, CapacityIcon } from './catalogTypes';

export async function getPackageBySlug(slug: string): Promise<CatalogPackage | null> {
    const { data, error } = await supabase
        .from('packages')
        .select(`
            id, slug, label, badge, title, description,
            capacity_label, capacity_icon, duration_minutes,
            price, price_unit, features, image_path, image_position
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

    if (error || !data) return null;

    return {
        id: data.id,
        slug: data.slug,
        label: data.label,
        badge: data.badge,
        title: data.title,
        description: data.description,
        capacityLabel: data.capacity_label,
        capacityIcon: data.capacity_icon as CapacityIcon,
        durationMinutes: data.duration_minutes,
        price: data.price,
        priceUnit: data.price_unit,
        features: data.features ?? [],
        imageSrc: data.image_path,
        imagePosition: data.image_position,
    };
}

export async function getBookedSlots(date: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('bookings')
        .select('start_time')
        .eq('booking_date', date)
        .in('status', ['pending', 'confirmed']);

    if (error || !data) return [];

    // Solusi: Tambahkan definisi tipe { start_time: string } pada parameter 'b'
    return data.map((b: { start_time: string }) => b.start_time.slice(0, 5));
}

// export async function createBooking(
//     payload: BookingFormData & {
//         packageId: string;
//         totalAmount: number;
//         paidAmount: number;
//     }
// ) {
//     const { data, error } = await supabase
//         .from('bookings')
//         .insert({
//             package_id: payload.packageId,
//             booking_date: payload.bookingDate,
//             start_time: payload.startTime,
//             end_time: payload.endTime,
//             full_name: payload.fullName,
//             whatsapp: payload.whatsapp,
//             email: payload.email,
//             special_notes: payload.specialNotes || null,
//             payment_scheme: payload.paymentScheme,
//             payment_method: payload.paymentMethod,
//             total_amount: payload.totalAmount,
//             paid_amount: payload.paidAmount,
//             status: 'pending',
//         })
//         .select()
//         .single();

//     if (error) throw new Error(`Gagal membuat pesanan: ${error.message}`);
//     return data;
// }
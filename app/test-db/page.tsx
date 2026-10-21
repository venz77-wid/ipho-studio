import { supabase } from '@/lib/supabaseClient';

export default async function TesDb() {
    const { data, error } = await supabase.from('packages').select('title, price');
    return <pre>{JSON.stringify(error ?? data, null, 2)}</pre>;
}
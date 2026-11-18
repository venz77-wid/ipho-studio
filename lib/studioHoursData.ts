import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from './supabaseAdmin';
import type { StudioHours } from './studioHours';

export const loadStudioHours = cache(async () => {
    const { data, error } = await supabaseAdmin.from('studio_operating_hours')
        .select('hours,revision').eq('id', 1).single();
    if (error) throw error;
    return { hours: data.hours as StudioHours, revision: data.revision as number };
});

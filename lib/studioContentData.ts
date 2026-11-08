import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from './supabaseAdmin';
import { DEFAULT_STUDIO_CONTENT, type StudioContent } from './studioContent';

export const STUDIO_BUCKET = 'studio-website';

export function studioPhotoUrl(path: string | null) {
    if (!path) return null;
    return supabaseAdmin.storage.from(STUDIO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export const loadStudioContent = cache(async () => {
    const { data, error } = await supabaseAdmin.from('studio_site_content')
        .select('content,revision,published_at').eq('id', 1).single();
    if (error) throw error;
    const content: StudioContent = { ...DEFAULT_STUDIO_CONTENT, ...data.content };
    return {
        content,
        photoUrl: studioPhotoUrl(content.photoPath),
        revision: data.revision as number,
        publishedAt: data.published_at as string | null,
    };
});

export function publicStudioContent(content: StudioContent): StudioContent {
    return {
        ...content,
        photoPath: null,
        facilities: content.facilities.filter((item) => item.visible),
        faqs: content.faqs.filter((item) => item.visible),
    };
}

import 'server-only';

import { supabaseAdmin } from './supabaseAdmin';
import { toPackage, type PackageRow } from './packages';
import type { AdminPackage, CatalogCategory } from './adminCatalogTypes';

export const PACKAGE_BUCKET = 'package-images';
export const ADMIN_PACKAGE_FIELDS = 'id,slug,category_id,title,description,label,badge,capacity_label,capacity_icon,duration_minutes,price,price_unit,features,image_path,image_position,is_active,is_featured,is_popular,sort_order';

type AdminRow = PackageRow & { category_id: string; is_active: boolean; is_featured: boolean; sort_order: number };

export function adminPackage(row: AdminRow): AdminPackage {
    return {
        ...toPackage(row), categoryId: row.category_id, active: row.is_active,
        featured: row.is_featured, sortOrder: row.sort_order,
    };
}

export async function loadAdminCatalog() {
    const categories = await supabaseAdmin.from('categories').select('id,name').order('sort_order');
    if (categories.error) throw categories.error;

    const packages: AdminPackage[] = [];
    const pageSize = 500;
    for (let start = 0; ; start += pageSize) {
        const { data, error } = await supabaseAdmin.from('packages').select(ADMIN_PACKAGE_FIELDS)
            .order('sort_order').order('id').range(start, start + pageSize - 1);
        if (error) throw error;
        packages.push(...data.map(adminPackage));
        if (data.length < pageSize) break;
    }

    return { categories: categories.data as CatalogCategory[], packages };
}

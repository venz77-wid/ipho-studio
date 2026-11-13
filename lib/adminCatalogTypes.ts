import type { CatalogPackage } from './catalogTypes';

export const CATALOG_PHOTO_LIMIT = 5_000_000;
export const CATALOG_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const CAPACITY_OPTIONS = [
    ['user', 'Tunggal'], ['users', 'Grup'], ['heart', 'Pasangan'], ['briefcase', 'Bisnis'],
] as const;

export type AdminPackage = CatalogPackage & { categoryId: string; active: boolean; featured: boolean; sortOrder: number };
export type CatalogCategory = { id: string; name: string };
export type PackageDraft = Omit<AdminPackage, 'id' | 'slug' | 'imageSrc' | 'sortOrder'>;

export const EMPTY_PACKAGE: PackageDraft = {
    title: '', description: '', categoryId: '', label: '', badge: null, capacityLabel: '',
    capacityIcon: 'user', durationMinutes: 0, price: 0, priceUnit: 'sesi total', features: [],
    imagePosition: 'center', active: false, featured: false,
};

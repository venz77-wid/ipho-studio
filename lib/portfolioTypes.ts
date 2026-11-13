export const PORTFOLIO_DEFAULTS = {
    title: 'Portofolio IPHO Studio',
    description: 'Temukan inspirasi untuk momen fotomu. Harmoni komposisi arsitektural, pencahayaan alami presisi, dan estetika timeless.',
};

export const PORTFOLIO_RATIOS = ['3 / 2', '4 / 3', '1 / 1', '4 / 5', '3 / 4', '2 / 3'] as const;
export const PORTFOLIO_MAX_PHOTOS = 100;
export const PORTFOLIO_UPLOAD_LIMIT = 4_000_000;

export type PortfolioCategory = { id: string; slug: string; name: string };
export type PortfolioPackage = { id: string; title: string; categoryId: string; src: string; position: string; aspectRatio: string };
type PhotoSource =
    | { kind: 'package'; packageId: string; label: string; src: string }
    | { kind: 'upload'; path: string };

export type PortfolioPhoto = {
    id: string;
    title: string;
    alt: string;
    categoryId: string;
    visible: boolean;
    aspectRatio: string;
    position: string;
    source: PhotoSource;
};

export type PortfolioContent = typeof PORTFOLIO_DEFAULTS & { photos: PortfolioPhoto[] };
export type PortfolioSnapshot = { content: PortfolioContent; revision: number; publishedAt: string | null };
export type GalleryPhoto = Pick<PortfolioPhoto, 'id' | 'title' | 'alt' | 'categoryId' | 'position' | 'aspectRatio'> & { src: string };

export interface PortfolioImageRead {
    id: number;
    worker_profile_id: number;
    image_url: string;
    created_at: string;
    updated_at: string | null;
}

/** Mirrors MAX_PORTFOLIO_IMAGES in api/v1/worker_profile.py. */
export const MAX_PORTFOLIO_IMAGES = 10;

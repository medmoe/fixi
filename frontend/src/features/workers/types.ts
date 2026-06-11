export interface WorkerPublicRead {
  id: number;
  service_category_id?: number | null;
  profession: string;
  hourly_rate: number;
  skills: string[];
  portfolio_image_urls: string[];
  years_of_experience?: number | null;
  is_verified: boolean;
  bio?: string | null;
  availability_status: 'available' | 'busy' | 'offline';
  average_rating?: number | null;
  total_rating: number;
  distance_km?: number | null;
}

export interface WorkersResponse {
  data: WorkerPublicRead[];
  total_count: number;
  page?: number;
  items_per_page?: number;
}

export interface WorkerReview {
  id: number;
  job_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface WorkerRatingSummary {
  worker_user_id: number;
  average_rating: number | null;
  total_reviews: number;
}

export interface WorkerNearbyRead {
  user_id: number;
  username: string;
  bio: string | null;
  location: string | null;
  distance_km: number;
}

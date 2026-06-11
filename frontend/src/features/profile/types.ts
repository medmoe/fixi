import type { UserRole } from '../auth/types';

export interface UserUpdate {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
  bio?: string | null;
  location?: string | null;
}

export interface UserRead {
  id: number;
  name: string;
  username: string;
  email: string;
  profile_image_url: string;
  bio?: string | null;
  location?: string | null;
  role_type: UserRole;
  tier_id?: number | null;
}

export interface WorkerRead {
  id: number;
  user_id: number;
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
}

export interface WorkerProfileUpdate {
  service_category_id?: number | null;
  profession?: string | null;
  hourly_rate?: number | null;
  skills?: string[] | null;
  portfolio_image_urls?: string[] | null;
}

export interface ServiceCategoryRead {
  id: number;
  name: string;
  description?: string | null;
}

export interface FileCreate {
  original_file_name: string;
  mime_type: string;
  file_size: number;
}

export interface FileRead extends FileCreate {
  id: number;
  belongs_to_user_id: number;
  uploaded_at: string;
  file_key: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  file_url: string;
}

export interface FileUploadResponse {
  file_url: string;
}

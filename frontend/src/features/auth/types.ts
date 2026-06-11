export type UserRole = 'customer' | 'handyman';

export interface AuthToken {
  access_token: string;
  token_type: 'bearer';
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
  is_superuser?: boolean;
}

export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

export interface RegisterBase {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterCustomer extends RegisterBase {
  role: 'customer';
  saved_addresses?: string[];
  loyalty_points?: number;
}

export interface RegisterHandyman extends RegisterBase {
  role: 'handyman';
  skill_category: string;
  skills: string[];
  certification_urls?: string[];
  hourly_rate: number;
  availability?: Record<string, string>;
}

export type RegisterRequest = RegisterCustomer | RegisterHandyman;

export interface LoginRequest {
  username_or_email: string;
  password: string;
}

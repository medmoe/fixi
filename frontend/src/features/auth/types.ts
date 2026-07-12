export type UserRole = 'customer' | 'worker';

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

export interface RegisterRequest {
  name: string;
  username: string;
  email: string;
  password: string;
  role_type: UserRole;
}
export interface LoginRequest {
  username_or_email: string;
  password: string;
}

export type UserRole = 'worker' | 'customer'

export interface UserCreatePayload {
    name: string;
    username: string;
    email: string;
    location?: string;
    password: string;
}

export interface UserRead {
    id: number;
    name: string;
    username: string;
    email: string;
    uuid: string;
    profile_image_url?: string;
    location?: string;
    role_type: UserRole;
}
import {RoleType} from "@/features/auth";

export interface UserRead {
    uuid: string,
    name: string,
    username: string,
    email: string,
    id: number,
    profile_image_url: string,
    role_type: RoleType,
    is_deleted: boolean,
    is_superuser: boolean,
    tier_id: number,
    location: string | null,
    deleted_at: string | null,
    created_at: string | null,
    updated_at: string | null,

}

export interface UserUpdate {
    name?: string,
    email?: string,
    username?: string,
    location?: string | null,
    profile_image_url?: string | null,
}

export interface UserChangePasswordPayload {
    current_password: string,
    new_password: string,
}
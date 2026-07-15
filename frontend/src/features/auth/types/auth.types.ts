export type RoleType = 'customer' | 'worker'

export interface RegisterPayload {
    name: string
    username: string
    email: string
    password: string
    role_type: RoleType
}

export interface RegisterResponse {
    id: number
    username: string
    email: string
    role_type: RoleType
}

export interface LoginPayload {
    username_or_email: string
    password: string
}

export interface LoginResponse {
    access_token: string
    token_type: string
}

export interface AuthState {
    accessToken: string | null
    isAuthenticated: boolean
    isLoading: boolean
}
export type SkillLevel = 'junior' | 'mid' | 'senior'

export interface Trade {
    id: number;
    name: string;
}

export interface WorkerTrade {
    trade_id: number;
    name?: string; // optional helper mapping from full trade entity
    skill_level: SkillLevel;
}

export interface WorkerProfile {
    id: number;
    bio?: string;
    hourly_rate?: number;
    service_radius_km?: number;
    avatar_url?: string;
    is_available: boolean;
    trades: WorkerTrade[];
}

export interface UpdateWorkerProfilePayload {
    bio?: string;
    hourly_rate?: number;
    service_radius_km?: number;
    trades?: WorkerTrade[];
}

export interface PaginatedResult<T> {
    data: T[];
}
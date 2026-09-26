export interface WorkerVerificationQueueRead {
    id: number;
    user_id: number;
    name: string;
    email: string;
    bio: string | null;
    years_of_experience: number | null;
}

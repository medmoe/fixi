export interface ReviewCreate {
  rating: number;
  comment?: string | null;
}

export interface ReviewUpdate {
  rating?: number | null;
  comment?: string | null;
}

export interface ReviewRead {
  id: number;
  job_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
}

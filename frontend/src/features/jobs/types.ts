export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface JobRead {
  id: number;
  service_category_id?: number | null;
  customer_id: number;
  worker_id?: number | null;
  title: string;
  description: string;
  status: JobStatus;
  created_at: string;
  updated_at?: string | null;
}

export interface JobCreate {
  service_category_id?: number | null;
  worker_id?: number | null;
  title: string;
  description: string;
}

export interface JobAssign {
  worker_id: number;
}

export interface JobStatusUpdate {
  status: JobStatus;
}

export interface NearbyJobRead {
  job_id: number;
  title: string;
  description: string;
  status: string;
  customer_id: number;
  customer_username: string;
  customer_location: string;
  distance_km: number;
}

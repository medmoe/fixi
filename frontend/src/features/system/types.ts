export interface SystemSummary {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  lastHeartbeat: string;
}

export interface SystemsResponse {
  data: SystemSummary[];
  metadata: {
    total: number;
    updatedAt: string;
  };
}

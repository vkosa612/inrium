export interface HealthDbStatus {
  status: 'ok' | 'error';
  latencyMs: number | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  db?: HealthDbStatus;
}

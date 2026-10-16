/**
 * Centralized API client for CampusFlow AI.
 * Uses configurable base URLs from environment variables with graceful fallback to relative /api proxy.
 */

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')) ? rawApiUrl.replace(/\/+$/, '') : '';

const rawMlUrl = (import.meta.env.VITE_ML_API_BASE_URL || '').trim();
const ML_API_BASE_URL = (rawMlUrl.startsWith('http://') || rawMlUrl.startsWith('https://')) ? rawMlUrl.replace(/\/+$/, '') : '';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const json = await res.json();
      if (json.detail) {
        errorDetail = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
      }
    } catch {
      // Keep default errorDetail
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export interface RecommendationQuery {
  date: string;
  start_hour: number;
  duration_hours: number;
  required_capacity: number;
  purpose: string;
  projector_required?: boolean;
  computers_required?: boolean;
  accessible_required?: boolean;
  preferred_building?: string;
}

export interface RoomRecommendation {
  room_id: string;
  building: string;
  floor: number;
  room_type: string;
  capacity: number;
  projector: boolean;
  computers: boolean;
  accessible: boolean;
  power_outlets: boolean;
  fit_score?: number;
  is_available: boolean;
  meets_facilities: boolean;
  has_conflicts: boolean;
  conflicts: Array<{
    type: string;
    details: string;
    time: string;
    overlap_window: string;
  }>;
  qualifications: string[];
}

export interface RecommendationsResponse {
  search_parameters: {
    target_date: string;
    weekday: string;
    start_hour: number;
    duration_hours: number;
    end_hour: number;
    required_capacity: number;
    projector_required: boolean;
    computers_required: boolean;
    accessible_required: boolean;
    preferred_building: string | null;
  };
  total_rooms_evaluated: number;
  available_count: number;
  unavailable_count: number;
  recommendations: RoomRecommendation[];
  unavailable_sample: RoomRecommendation[];
  availability_disclaimer: string;
  incomplete_schedule_disclosure: string;
}

export interface CreateRequestPayload {
  request_date: string;
  start_hour: number;
  duration_hours: number;
  required_capacity: number;
  purpose: string;
  requested_room_id?: string;
  projector_required?: boolean;
  computers_required?: boolean;
}

export const api = {
  // System & Health
  async getHealth() {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse<any>(res);
  },

  async getSystemStatus() {
    const res = await fetch(`${API_BASE_URL}/api/system/status`);
    return handleResponse<any>(res);
  },

  // Dashboard
  async getDashboardSummary() {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
    return handleResponse<any>(res);
  },

  // Rooms & Recommendations
  async getRooms(params?: { building?: string; room_type?: string; min_capacity?: number; accessible_only?: boolean }) {
    const query = new URLSearchParams();
    if (params?.building) query.append('building', params.building);
    if (params?.room_type) query.append('room_type', params.room_type);
    if (params?.min_capacity) query.append('min_capacity', params.min_capacity.toString());
    if (params?.accessible_only) query.append('accessible_only', 'true');

    const res = await fetch(`${API_BASE_URL}/api/rooms?${query.toString()}`);
    return handleResponse<any[]>(res);
  },

  async getRoomDetails(roomId: string) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`);
    return handleResponse<any>(res);
  },

  async getRecommendations(query: RecommendationQuery): Promise<RecommendationsResponse> {
    const res = await fetch(`${API_BASE_URL}/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    return handleResponse<RecommendationsResponse>(res);
  },

  // Requests
  async submitRequest(payload: CreateRequestPayload) {
    const res = await fetch(`${API_BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async getRecentRequests(limit = 25) {
    const res = await fetch(`${API_BASE_URL}/api/requests?limit=${limit}`);
    return handleResponse<any[]>(res);
  },

  // Analytics
  async getUtilizationAnalytics() {
    const res = await fetch(`${API_BASE_URL}/api/analytics/utilization`);
    return handleResponse<any>(res);
  },

  // ML Forecasting & Metrics
  async getForecast(days = 7, startDate?: string) {
    const query = new URLSearchParams();
    query.append('days', days.toString());
    if (startDate) query.append('start_date', startDate);

    const res = await fetch(`${API_BASE_URL}/api/forecast?${query.toString()}`);
    return handleResponse<any>(res);
  },

  async getModelMetrics() {
    const res = await fetch(`${API_BASE_URL}/api/model/metrics`);
    return handleResponse<any>(res);
  },

  async retrainModel() {
    // Can call via proxy or ML direct
    const url = ML_API_BASE_URL ? `${ML_API_BASE_URL}/api/model/retrain` : `/api/ml/model/retrain`;
    const res = await fetch(url, { method: 'POST' });
    return handleResponse<any>(res);
  },

  // Database re-import
  async triggerDataImport() {
    const res = await fetch(`${API_BASE_URL}/api/dataset/import`, { method: 'POST' });
    return handleResponse<any>(res);
  },
};

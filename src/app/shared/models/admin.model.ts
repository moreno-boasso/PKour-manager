export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface AdminUser {
  userId: string;
  email: string;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  pagination: Pagination;
  data: T[];
}

export interface AdminSpot {
  id: number;
  nome: string;
  posizione: { lat: number; lon: number };
  status: ModerationStatus;
  tipo: string | null;
  foto_principale_url: string | null;
}

export interface AdminSpotDetail {
  id: number;
  nome: string;
  posizione: { lat: number; lon: number };
  descrizione: string | null;
  tipo: string | null;
  status: ModerationStatus;
  features: string[];
  visitatori_count: number;
  foto: SpotPhoto[];
  aggiunto_da: SpotUser | null;
  recensioni: SpotReview[];
  segnalazioni: SpotReport[];
  rating: { qualita_avg: number | null; sicurezza_avg: number | null } | null;
}

export interface SpotPhoto {
  id: number;
  url: string;
  descrizione: string | null;
  created_at: string;
}

export interface SpotUser {
  user_id: string;
  nome: string | null;
  username: string | null;
  avatar_url?: string | null;
}

export interface SpotReview {
  user: SpotUser;
  qualita: number;
  sicurezza: number;
  commento: string | null;
  status: ModerationStatus;
  created_at: string;
}

export interface SpotReport {
  user: SpotUser;
  motivo: string;
  descrizione: string | null;
  created_at: string;
}

export interface Trick {
  id: string;
  nome: string;
  difficolta: string;
  video_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  required: string[];
}

export interface ManagerReview {
  spot_id: number;
  spot_nome: string;
  user_id: string;
  user_nome: string | null;
  user_username: string | null;
  user_avatar_url: string | null;
  qualita: number;
  sicurezza: number;
  commento: string | null;
  status: ModerationStatus;
  created_at: string;
}

export interface ManagerReport {
  id: number;
  spot_id: number;
  spot_nome: string;
  reported_by_user_id: string;
  user_nome: string | null;
  user_username: string | null;
  motivo: string;
  descrizione: string | null;
  status: string;
  created_at: string;
}

export interface ManagerPhoto {
  id: number;
  spot_id: number;
  spot_nome: string;
  url: string;
  uploaded_by_user_id: string | null;
  user_nome: string | null;
  user_username: string | null;
  status: ModerationStatus;
  created_at: string;
}

export interface ManagerStats {
  pending_spots: number;
  pending_reviews: number;
  pending_photos: number;
  pending_reports: number;
}

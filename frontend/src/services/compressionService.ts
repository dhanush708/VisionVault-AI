import api from './api';

export interface CompressionProgress {
  video_id: string;
  status: string;
  progress_percent: number;
  profile: string;
  encoder: string;
  started_at: string;
  completed_at?: string;
}

export interface CompressionQuality {
  ssim: number | null;
  psnr: number | null;
}

export interface CompressionReport {
  video_id: string;
  profile: string;
  profile_name: string;
  encoder: string;
  original_size_bytes: number;
  compressed_size_bytes: number;
  space_saved_percent: number;
  compression_ratio: number;
  processing_time_ms: number;
  quality: CompressionQuality;
  compressed_at: string;
  status: string;
}

export async function startCompression(videoId: string, profile: string = 'balanced'): Promise<any> {
  const response = await api.post(`/api/v1/videos/${videoId}/compress`, { profile });
  return response.data;
}

export async function pollProgress(videoId: string): Promise<CompressionProgress> {
  const response = await api.get<CompressionProgress>(`/api/v1/videos/${videoId}/compress/progress`);
  return response.data;
}

export async function fetchCompressionReport(videoId: string): Promise<CompressionReport> {
  const response = await api.get<CompressionReport>(`/api/v1/videos/${videoId}/compress/report`);
  return response.data;
}

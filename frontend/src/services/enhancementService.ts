import api from './api';

export interface EnhancementState {
  video_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress_percent: number;
  stage: string;
  gpu: string;
  gpu_name?: string;
  gpu_utilization_percent?: number;
  vram_used_mb?: number;
  vram_total_mb?: number;
  total_frames?: number;
  frames_enhanced?: number;
  eta_seconds?: number;
  processing_time_ms?: number;
  output_resolution?: string;
  model: string;
  started_at: string;
  completed_at?: string;
  output_path?: string;
  enhancement_label?: string;
  original_size_bytes?: number;
  enhanced_size_bytes?: number;
}

export interface EnhancementReport {
  video_id: string;
  generated_at: string;
  device: string;
  model_used: string;
  processing_summary: {
    total_frames: number;
    processing_time_seconds: number;
    average_speed_fps: number;
    peak_vram_mb: number;
    avg_gpu_utilization_percent: number;
  };
  video_metrics: {
    original_resolution: string;
    compressed_resolution: string;
    output_resolution: string;
    original_size_bytes: number;
    compressed_size_bytes: number;
    enhanced_size_bytes: number;
    compression_ratio: number;
    restored_ssim: number;
    restored_psnr_db: number;
  };
  forensic_analysis: string;
}

export async function startEnhancement(videoId: string): Promise<{ message: string; state: EnhancementState }> {
  const response = await api.post(`/api/v1/pipeline/${videoId}/enhance`);
  return response.data;
}

export async function getEnhancementStatus(videoId: string): Promise<EnhancementState> {
  const response = await api.get<EnhancementState>(`/api/v1/pipeline/${videoId}/enhance/status`);
  return response.data;
}

export async function getEnhancementReport(videoId: string): Promise<EnhancementReport> {
  const response = await api.get<EnhancementReport>(`/api/v1/pipeline/${videoId}/enhance/report`);
  return response.data;
}

export function getDownloadUrl(videoId: string, type: 'original' | 'compressed' | 'enhanced', inline = false): string {
  return `/api/v1/pipeline/${videoId}/download/${type}${inline ? '?inline=true' : ''}`;
}

import api from './api';

export interface VideoMetadata {
  video_id: string;
  file_name: string;
  width: number;
  height: number;
  resolution: string;
  fps: number;
  codec: string;
  bitrate_kbps: number;
  duration_seconds: number;
  file_size_bytes: number;
  container_format: string;
  audio_present: boolean;
  video_stream_count: number;
  audio_stream_count: number;
  creation_time: string | null;
  extraction_timestamp: string;
  status: string;
}

export async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const response = await api.get<VideoMetadata>(`/api/v1/videos/${videoId}/metadata`);
  return response.data;
}

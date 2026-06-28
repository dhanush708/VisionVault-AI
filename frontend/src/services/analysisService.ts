import api from './api';

export interface AnalysisScores {
  motion: number;
  brightness: number;
  noise: number;
  sharpness: number;
  edge_density: number;
  scene_complexity: number;
  frame_difference_variance: number;
  entropy: number;
}

export interface VideoAnalysis {
  video_id: string;
  analysis_timestamp: string;
  scores: AnalysisScores;
  compression_potential: number;
  confidence: number;
  recommended_profile: string;
  reasoning: string;
  frames_analyzed: number;
  status: string;
}

export async function fetchVideoAnalysis(videoId: string): Promise<VideoAnalysis> {
  const response = await api.get<VideoAnalysis>(`/api/v1/videos/${videoId}/analysis`);
  return response.data;
}

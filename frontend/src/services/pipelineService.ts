import api from './api';

export interface PipelineStages {
  upload: string;
  metadata: string;
  analysis: string;
  compression: string;
  quality: string;
  s3_upload: string;
  dynamodb: string;
  bedrock: string;
}

export interface ActivityLogEntry {
  timestamp: string;
  message: string;
  stage: string;
}

export interface PipelineState {
  video_id: string;
  status: string;
  current_stage: string;
  stages: PipelineStages;
  activity_log: ActivityLogEntry[];
  started_at: string;
  completed_at?: string;
}

export interface PipelineResult {
  video_id: string;
  metadata: any;
  analysis: any;
  compression: any;
  s3: any;
  bedrock_summary: string;
  summary_source?: string;
}

export async function startPipeline(videoId: string, profile: string = 'balanced') {
  const response = await api.post('/api/v1/pipeline/start', { video_id: videoId, profile });
  return response.data;
}

export async function getPipelineState(videoId: string): Promise<PipelineState> {
  const response = await api.get<PipelineState>(`/api/v1/pipeline/${videoId}/state`);
  return response.data;
}

export async function getPipelineResult(videoId: string): Promise<PipelineResult> {
  const response = await api.get<PipelineResult>(`/api/v1/pipeline/${videoId}/result`);
  return response.data;
}

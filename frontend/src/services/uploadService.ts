import api from './api';

export interface UploadResponse {
  video_id: string;
  file_name: string;
  file_size_bytes: number;
  upload_timestamp: string;
  local_path: string;
  status: string;
}

export async function uploadVideo(
  file: File,
  profile: string = 'balanced',
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('profile', profile);

  const response = await api.post<UploadResponse>('/api/v1/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return response.data;
}

const ALLOWED_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv'];
const MAX_FILE_SIZE_MB = 2048;

export function validateFile(file: File): string | null {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `Unsupported format: ${extension}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return `File too large: ${sizeMB.toFixed(0)} MB. Maximum: ${MAX_FILE_SIZE_MB} MB`;
  }
  return null;
}

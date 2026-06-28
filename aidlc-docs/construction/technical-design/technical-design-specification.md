# VisionVault AI — Technical Design Specification

**Document Version**: 1.0  
**Date**: 2026-06-25  
**Project**: VisionVault AI  
**Methodology**: AWS AI-DLC (AI-Driven Development Life Cycle)  
**Phase**: CONSTRUCTION — Functional Design  
**Status**: Draft — Implementation Blueprint

---

## 1. Complete Folder Structure

```
visionvault-ai/
|
|--- frontend/
|    |--- public/
|    |    |--- vite.svg
|    |--- src/
|    |    |--- components/
|    |    |    |--- common/
|    |    |    |    |--- Sidebar.tsx
|    |    |    |    |--- Header.tsx
|    |    |    |    |--- LoadingSpinner.tsx
|    |    |    |    |--- ErrorBoundary.tsx
|    |    |    |    |--- NotificationToast.tsx
|    |    |    |    |--- ProtectedRoute.tsx
|    |    |    |    |--- MetricCard.tsx
|    |    |    |    |--- Badge.tsx
|    |    |    |--- upload/
|    |    |    |    |--- DropZone.tsx
|    |    |    |    |--- UploadProgress.tsx
|    |    |    |    |--- FormatValidator.tsx
|    |    |    |    |--- UploadQueue.tsx
|    |    |    |--- dashboard/
|    |    |    |    |--- StatsOverview.tsx
|    |    |    |    |--- RecentUploads.tsx
|    |    |    |    |--- SavingsChart.tsx
|    |    |    |    |--- CompressionTrend.tsx
|    |    |    |    |--- RetentionChart.tsx
|    |    |    |--- library/
|    |    |    |    |--- VideoGrid.tsx
|    |    |    |    |--- VideoCard.tsx
|    |    |    |    |--- SearchBar.tsx
|    |    |    |    |--- FilterPanel.tsx
|    |    |    |--- player/
|    |    |    |    |--- VideoPlayer.tsx
|    |    |    |    |--- EnhanceButton.tsx
|    |    |    |    |--- QualityToggle.tsx
|    |    |    |    |--- MetricsPanel.tsx
|    |    |    |    |--- BedrockSummary.tsx
|    |    |    |--- analytics/
|    |    |    |    |--- CostSavingsChart.tsx
|    |    |    |    |--- TrendAnalysis.tsx
|    |    |    |    |--- ROIPanel.tsx
|    |    |    |--- settings/
|    |    |    |    |--- ProfileSettings.tsx
|    |    |    |    |--- CompressionDefaults.tsx
|    |    |    |--- auth/
|    |    |         |--- LoginButton.tsx
|    |    |         |--- AuthCallback.tsx
|    |    |--- pages/
|    |    |    |--- HomePage.tsx
|    |    |    |--- UploadPage.tsx
|    |    |    |--- LibraryPage.tsx
|    |    |    |--- VideoDetailPage.tsx
|    |    |    |--- AnalyticsPage.tsx
|    |    |    |--- SettingsPage.tsx
|    |    |    |--- LoginPage.tsx
|    |    |--- services/
|    |    |    |--- api.ts
|    |    |    |--- authService.ts
|    |    |    |--- uploadService.ts
|    |    |    |--- videoService.ts
|    |    |    |--- dashboardService.ts
|    |    |    |--- bedrockService.ts
|    |    |--- hooks/
|    |    |    |--- useAuth.ts
|    |    |    |--- useUpload.ts
|    |    |    |--- useVideos.ts
|    |    |    |--- useDashboard.ts
|    |    |--- store/
|    |    |    |--- authStore.ts
|    |    |    |--- videoStore.ts
|    |    |    |--- uploadStore.ts
|    |    |    |--- dashboardStore.ts
|    |    |    |--- uiStore.ts
|    |    |--- types/
|    |    |    |--- video.ts
|    |    |    |--- auth.ts
|    |    |    |--- dashboard.ts
|    |    |    |--- api.ts
|    |    |--- utils/
|    |    |    |--- formatters.ts
|    |    |    |--- validators.ts
|    |    |    |--- constants.ts
|    |    |--- App.tsx
|    |    |--- main.tsx
|    |    |--- index.css
|    |--- index.html
|    |--- vite.config.ts
|    |--- tailwind.config.js
|    |--- tsconfig.json
|    |--- package.json
|
|--- backend/
|    |--- app/
|    |    |--- __init__.py
|    |    |--- main.py
|    |    |--- config.py
|    |    |--- dependencies.py
|    |    |--- routers/
|    |    |    |--- __init__.py
|    |    |    |--- auth.py
|    |    |    |--- upload.py
|    |    |    |--- videos.py
|    |    |    |--- dashboard.py
|    |    |    |--- playback.py
|    |    |    |--- bedrock.py
|    |    |--- services/
|    |    |    |--- __init__.py
|    |    |    |--- auth_service.py
|    |    |    |--- upload_service.py
|    |    |    |--- metadata_service.py
|    |    |    |--- optimization_service.py
|    |    |    |--- compression_service.py
|    |    |    |--- quality_service.py
|    |    |    |--- storage_service.py
|    |    |    |--- dashboard_service.py
|    |    |    |--- playback_service.py
|    |    |    |--- enhancement_service.py
|    |    |    |--- bedrock_service.py
|    |    |    |--- notification_service.py
|    |    |--- models/
|    |    |    |--- __init__.py
|    |    |    |--- video.py
|    |    |    |--- metadata.py
|    |    |    |--- metrics.py
|    |    |    |--- user.py
|    |    |--- schemas/
|    |    |    |--- __init__.py
|    |    |    |--- requests.py
|    |    |    |--- responses.py
|    |    |--- middleware/
|    |    |    |--- __init__.py
|    |    |    |--- auth_middleware.py
|    |    |    |--- tenant_middleware.py
|    |    |    |--- logging_middleware.py
|    |    |--- ai/
|    |    |    |--- __init__.py
|    |    |    |--- optimization_engine/
|    |    |    |    |--- __init__.py
|    |    |    |    |--- engine.py
|    |    |    |    |--- metadata_analyzer.py
|    |    |    |    |--- scene_analyzer.py
|    |    |    |    |--- motion_estimator.py
|    |    |    |    |--- brightness_analyzer.py
|    |    |    |    |--- noise_estimator.py
|    |    |    |    |--- recommendation_engine.py
|    |    |    |--- enhancement/
|    |    |    |    |--- __init__.py
|    |    |    |    |--- real_esrgan.py
|    |    |    |    |--- frame_processor.py
|    |    |--- utils/
|    |    |    |--- __init__.py
|    |    |    |--- ffmpeg.py
|    |    |    |--- ffprobe.py
|    |    |    |--- s3.py
|    |    |    |--- dynamodb.py
|    |    |    |--- cloudwatch.py
|    |    |    |--- helpers.py
|    |--- tests/
|    |    |--- __init__.py
|    |    |--- conftest.py
|    |    |--- test_upload.py
|    |    |--- test_metadata.py
|    |    |--- test_optimization.py
|    |    |--- test_compression.py
|    |    |--- test_quality.py
|    |    |--- test_storage.py
|    |    |--- test_enhancement.py
|    |    |--- test_bedrock.py
|    |    |--- test_auth.py
|    |    |--- test_dashboard.py
|    |--- requirements.txt
|    |--- pyproject.toml
|
|--- models/
|    |--- realesrgan/
|         |--- RealESRGAN_x4plus.pth
|
|--- scripts/
|    |--- setup_aws.py
|    |--- seed_demo_data.py
|
|--- .env.example
|--- .gitignore
|--- README.md
```

---

## 2. Backend Python Files — Complete Specification

### 2.1 app/main.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| create_app() | Initialize FastAPI application, register routers, add middleware | None | FastAPI instance |
| lifespan(app) | Startup/shutdown events — load AI models, init AWS clients | FastAPI app | AsyncGenerator |

### 2.2 app/config.py
| Class/Function | Responsibility | Input | Output |
|---|---|---|---|
| class Settings(BaseSettings) | Load environment config via pydantic-settings | .env file | Settings instance |
| get_settings() | Cached dependency injection for settings | None | Settings |

Settings fields: AWS_REGION, S3_BUCKET, DYNAMODB_TABLE, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_DOMAIN, BEDROCK_MODEL_ID, FFMPEG_PATH, FFPROBE_PATH, ESRGAN_MODEL_PATH, CUDA_DEVICE, MAX_UPLOAD_SIZE_MB, CORS_ORIGINS, LOG_LEVEL

### 2.3 app/dependencies.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| get_s3_client() | Provide boto3 S3 client | None | boto3.client("s3") |
| get_dynamodb_resource() | Provide boto3 DynamoDB resource | None | boto3.resource("dynamodb") |
| get_bedrock_client() | Provide boto3 Bedrock Runtime client | None | boto3.client("bedrock-runtime") |
| get_cloudwatch_client() | Provide boto3 CloudWatch client | None | boto3.client("cloudwatch") |
| get_current_user() | Extract and validate JWT from request | Request | UserContext |
| get_tenant_id() | Extract tenant_id from validated user | UserContext | str |

### 2.4 app/routers/auth.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| login() | Return Cognito hosted UI redirect URL | None | LoginRedirectResponse |
| callback(code) | Exchange auth code for tokens | authorization_code: str | TokenResponse |
| refresh(refresh_token) | Refresh access token | refresh_token: str | TokenResponse |
| logout() | Invalidate current session | current_user | SuccessResponse |
| me() | Return current user profile | current_user | UserProfileResponse |

### 2.5 app/routers/upload.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| upload_video(file, camera_id, description) | Accept multipart upload, validate, trigger pipeline | UploadFile, Optional[str], Optional[str] | UploadResponse |
| get_upload_status(video_id) | Return processing status | video_id: str | StatusResponse |

### 2.6 app/routers/videos.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| list_videos(page, page_size, camera_id, status, date_from, date_to) | Query paginated video list | Query params | VideoListResponse |
| get_video(video_id) | Get single video details with all metrics | video_id: str | VideoDetailResponse |
| delete_video(video_id) | Delete video from S3 + DynamoDB | video_id: str | SuccessResponse |
| search_videos(query, camera_id, date_from, date_to) | Full-text search on name/camera | Query params | VideoListResponse |
| stream_video(video_id, quality) | Generate presigned URL for video streaming | video_id: str, quality: str | StreamURLResponse |

### 2.7 app/routers/dashboard.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| get_summary() | Aggregate metrics for dashboard home | tenant_id | DashboardSummaryResponse |
| get_analytics(period) | Time-series analytics data | period: str (week/month/year) | AnalyticsResponse |
| get_savings() | Cost savings breakdown | tenant_id | SavingsResponse |

### 2.8 app/routers/playback.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| trigger_enhancement(video_id) | Start on-demand AI enhancement | video_id: str | EnhancementResponse |
| get_enhanced_stream(video_id) | Return presigned URL for enhanced video | video_id: str | StreamURLResponse |
| get_comparison(video_id) | Return URLs for original and enhanced side-by-side | video_id: str | ComparisonResponse |

### 2.9 app/routers/bedrock.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| generate_summary(video_id) | Generate per-video business summary | video_id: str | BedrockSummaryResponse |
| generate_aggregate() | Generate aggregate ROI report | tenant_id | BedrockAggregateResponse |
| get_cached_summary(video_id) | Retrieve cached summary from DynamoDB | video_id: str | BedrockSummaryResponse |

---

### 2.10 app/services/auth_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| get_login_url() | Construct Cognito hosted UI URL | None | str (URL) |
| exchange_code(code) | Call Cognito token endpoint | code: str | TokenSet |
| refresh_token(refresh_token) | Call Cognito refresh endpoint | refresh_token: str | TokenSet |
| validate_token(token) | Verify JWT signature and claims | token: str | UserClaims |
| revoke_token(token) | Call Cognito revoke endpoint | token: str | bool |
| get_user_profile(sub) | Get user attributes from Cognito | sub: str | UserProfile |

### 2.11 app/services/upload_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| validate_file(file) | Check format (MP4/AVI/MOV/MKV), size (<=2GB) | UploadFile | ValidationResult |
| save_temp_file(file) | Write uploaded bytes to temp directory | UploadFile | Path |
| initiate_processing(temp_path, video_id, tenant_id, camera_id) | Orchestrate full pipeline | Path, str, str, Optional[str] | ProcessingResult |
| cleanup_temp(temp_path) | Remove temporary file after processing | Path | None |

### 2.12 app/services/metadata_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| extract_metadata(file_path) | Run FFprobe and parse output | Path | VideoMetadata |
| parse_ffprobe_output(raw_json) | Parse FFprobe JSON into structured model | dict | VideoMetadata |
| get_file_size(file_path) | Get file size in bytes | Path | int |

### 2.13 app/services/optimization_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| analyze_video(file_path, metadata) | Run all 6 analyzers | Path, VideoMetadata | AnalysisResult |
| get_recommendation(analysis) | Get compression params from analysis | AnalysisResult | CompressionRecommendation |
| run_full_optimization(file_path, metadata) | Orchestrate analysis + recommendation | Path, VideoMetadata | CompressionRecommendation |

### 2.14 app/services/compression_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| compress_video(input_path, recommendation) | Execute FFmpeg H.265 compression | Path, CompressionRecommendation | CompressionResult |
| build_ffmpeg_command(input_path, output_path, recommendation) | Construct FFmpeg CLI arguments | Path, Path, CompressionRecommendation | list[str] |
| execute_ffmpeg(command) | Run FFmpeg subprocess, capture progress | list[str] | CompletedProcess |
| get_output_path(input_path) | Generate output file path | Path | Path |

### 2.15 app/services/quality_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| verify_quality(original_path, compressed_path) | Calculate all quality metrics | Path, Path | QualityMetrics |
| calculate_ssim(original_path, compressed_path) | Compute SSIM between videos | Path, Path | float |
| calculate_psnr(original_path, compressed_path) | Compute PSNR between videos | Path, Path | float |
| calculate_compression_ratio(original_size, compressed_size) | Ratio calculation | int, int | float |
| calculate_processing_time(start_time) | Elapsed time since start | datetime | int (ms) |

### 2.16 app/services/storage_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| upload_to_s3(file_path, s3_key) | Upload file to S3 bucket | Path, str | str (s3_key) |
| download_from_s3(s3_key, local_path) | Download file from S3 | str, Path | Path |
| generate_presigned_url(s3_key, expiry) | Generate time-limited access URL | str, int | str (URL) |
| delete_from_s3(s3_key) | Delete object from S3 | str | bool |
| save_metadata(video_record) | Write video record to DynamoDB | VideoRecord | bool |
| get_metadata(tenant_id, video_id) | Read single video record | str, str | VideoRecord |
| query_videos(tenant_id, filters) | Query videos with filters | str, QueryFilters | list[VideoRecord] |
| delete_metadata(tenant_id, video_id) | Delete DynamoDB record | str, str | bool |
| update_metadata(tenant_id, video_id, updates) | Partial update record | str, str, dict | bool |

### 2.17 app/services/dashboard_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| get_aggregate_metrics(tenant_id) | Sum/avg all video metrics | str | AggregateMetrics |
| get_recent_uploads(tenant_id, limit) | Last N processed videos | str, int | list[VideoSummary] |
| get_time_series(tenant_id, period, metric) | Time-bucketed metric data | str, str, str | list[TimePoint] |
| calculate_savings(total_original, total_optimized) | Compute cost savings | int, int | SavingsBreakdown |
| calculate_retention_improvement(compression_ratio) | Estimate extra retention days | float | int |

### 2.18 app/services/playback_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| get_stream_url(tenant_id, video_id, quality) | Get presigned URL for playback | str, str, str | str |
| get_thumbnail_url(tenant_id, video_id) | Get thumbnail presigned URL | str, str | str |

### 2.19 app/services/enhancement_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| enhance_video(video_id, tenant_id) | Full enhancement pipeline | str, str | EnhancementResult |
| extract_frames(video_path, max_frames) | Extract frames using OpenCV | Path, int | list[ndarray] |
| enhance_frames(frames) | Run Real-ESRGAN on frame batch | list[ndarray] | list[ndarray] |
| reassemble_video(frames, fps, output_path) | Write enhanced frames to video | list[ndarray], float, Path | Path |
| get_model() | Load/cache Real-ESRGAN model | None | RealESRGANer |

### 2.20 app/services/bedrock_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| generate_video_summary(video_record) | Generate per-video narrative | VideoRecord | str |
| generate_aggregate_summary(metrics) | Generate org-wide ROI report | AggregateMetrics | str |
| build_prompt(template, data) | Populate prompt template with data | str, dict | str |
| invoke_bedrock(prompt) | Call Bedrock InvokeModel API | str | str |
| cache_summary(tenant_id, video_id, summary) | Store summary in DynamoDB | str, str, str | bool |

### 2.21 app/services/notification_service.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| notify_processing_complete(video_id, tenant_id) | Emit completion event | str, str | None |
| notify_processing_failed(video_id, tenant_id, error) | Emit failure event | str, str, str | None |
| emit_cloudwatch_metric(metric_name, value, unit) | Push custom metric | str, float, str | None |

---

## 3. AI Module — Complete Specification

### 3.1 app/ai/optimization_engine/engine.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| class OptimizationEngine | Orchestrates all analyzers | None | Instance |
| analyze(file_path, metadata) | Run all analyzers, collect scores | Path, VideoMetadata | AnalysisResult |
| _sample_frames(file_path, interval) | Extract sample frames for analysis | Path, int | list[ndarray] |

### 3.2 app/ai/optimization_engine/metadata_analyzer.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| class MetadataAnalyzer | Analyze video technical metadata | None | Instance |
| analyze(metadata) | Parse and score metadata | VideoMetadata | MetadataScore |

**Algorithm**: Parse FFprobe metadata. Score resolution (4K=1.0, 1080p=0.7, 720p=0.5, SD=0.3). Score bitrate relative to resolution norm. Flag high/low values.  
**Complexity**: O(1) — direct field access  
**Dependencies**: VideoMetadata model

### 3.3 app/ai/optimization_engine/scene_analyzer.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| class SceneAnalyzer | Detect scene complexity | None | Instance |
| analyze(frames) | Compute scene complexity score | list[ndarray] | SceneScore |
| _compute_histogram(frame) | Calculate color histogram | ndarray | ndarray |
| _compare_histograms(hist1, hist2) | Compare consecutive histograms | ndarray, ndarray | float |

**Algorithm**: Sample every 30th frame. Compute color histograms (cv2.calcHist). Compare consecutive histograms using cv2.compareHist (correlation method). High variation = high complexity.  
**Complexity**: O(N) where N = number of sampled frames  
**Dependencies**: OpenCV (cv2), numpy

### 3.4 app/ai/optimization_engine/motion_estimator.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| class MotionEstimator | Estimate motion level | None | Instance |
| analyze(frames) | Compute motion score | list[ndarray] | MotionScore |
| _frame_difference(frame1, frame2) | Absolute diff between grayscale frames | ndarray, ndarray | float |

**Algorithm**: Convert consecutive frames to grayscale. Compute absolute difference (cv2.absdiff). Calculate mean pixel change as percentage of max (255). Average across all pairs. Score: 0.0 (static) to 1.0 (high motion).  
**Complexity**: O(N) where N = number of frame pairs  
**Dependencies**: OpenCV (cv2), numpy

### 3.5 app/ai/optimization_engine/brightness_analyzer.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| class BrightnessAnalyzer | Analyze luminance characteristics | None | Instance |
| analyze(frames) | Compute brightness statistics | list[ndarray] | BrightnessScore |
| _compute_luminance(frame) | Get average pixel intensity | ndarray | float |

**Algorithm**: Convert frames to grayscale. Compute mean pixel intensity (0-255). Calculate dynamic range (max_luminance - min_luminance across frames). Flag as dark if avg < 60, overexposed if avg > 200.  
**Complexity**: O(N * W * H) where N=frames, W*H=pixels  
**Dependencies**: OpenCV (cv2), numpy

### 3.6 app/ai/optimization_engine/noise_estimator.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| class NoiseEstimator | Estimate noise/grain level | None | Instance |
| analyze(frames) | Compute noise score | list[ndarray] | NoiseScore |
| _laplacian_variance(frame) | Compute Laplacian variance as noise proxy | ndarray | float |

**Algorithm**: Apply Laplacian filter (cv2.Laplacian with ksize=3). Compute variance of the result. Low variance = clean image; high variance = noisy. Normalize to 0-1 scale based on empirical thresholds (clean: <100, moderate: 100-500, noisy: >500).  
**Complexity**: O(N * W * H)  
**Dependencies**: OpenCV (cv2), numpy

### 3.7 app/ai/optimization_engine/recommendation_engine.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| class RecommendationEngine | Generate compression parameters | None | Instance |
| recommend(analysis) | Produce CRF, bitrate, preset | AnalysisResult | CompressionRecommendation |
| _select_profile(motion, scene, noise) | Choose compression profile | float, float, float | CompressionProfile |
| _calculate_crf(profile, adjustments) | Compute final CRF value | CompressionProfile, dict | int |
| _calculate_bitrate(profile, resolution, fps) | Compute target bitrate | CompressionProfile, tuple, float | int |

**Algorithm**:
```
Step 1: Select Profile
  IF motion_score < 0.3 AND noise_level < 0.3: profile = MAX_STORAGE
  ELIF motion_score > 0.7 OR scene_complexity > 0.7: profile = MAX_QUALITY
  ELSE: profile = BALANCED

Step 2: Calculate CRF
  base_crf = profile.base_crf
  IF is_dark: crf += 2
  IF noise_level > 0.5: crf -= 2
  IF resolution >= 3840: crf -= 1
  Clamp to [18, 35]

Step 3: Calculate Bitrate
  base_bitrate = profile.base_bitrate_per_pixel * width * height * fps
  Apply same adjustments as CRF (inverse relationship)

Step 4: Select Preset
  profile.preset (medium for MAX_STORAGE/BALANCED, slow for MAX_QUALITY)
```
**Complexity**: O(1) — rule-based decision  
**Dependencies**: AnalysisResult from all analyzers

### 3.8 app/ai/enhancement/real_esrgan.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| class RealESRGANEnhancer | Manage model loading and inference | None | Instance |
| load_model() | Load RealESRGAN_x4plus.pth to GPU | None | RealESRGANer |
| enhance_frame(frame) | Upscale single frame 4x | ndarray (H,W,3) | ndarray (4H,4W,3) |
| enhance_batch(frames, batch_size) | Batch process frames | list[ndarray], int | list[ndarray] |
| unload_model() | Free GPU memory | None | None |

**Dependencies**: basicsr, realesrgan, torch, numpy

### 3.9 app/ai/enhancement/frame_processor.py
| Function | Responsibility | Input | Output |
|---|---|---|---|
| extract_frames(video_path, max_frames, fps) | Read frames from video | Path, int, float | list[ndarray] |
| write_enhanced_video(frames, output_path, fps) | Encode frames to H.264 video | list[ndarray], Path, float | Path |
| get_video_fps(video_path) | Read FPS from video file | Path | float |

**Dependencies**: OpenCV (cv2)

---

## 4. Frontend React Files — Complete Specification

### 4.1 Pages

| File | Responsibility | Key State | API Calls |
|---|---|---|---|
| HomePage.tsx | Show stats overview, recent uploads, quick actions | dashboardStore.summary | GET /api/dashboard/summary |
| UploadPage.tsx | Drag-drop zone, upload queue, progress | uploadStore | POST /api/upload |
| LibraryPage.tsx | Video grid with search and filters | videoStore.list | GET /api/videos |
| VideoDetailPage.tsx | Player + metrics + enhance + summary | videoStore.current | GET /api/videos/:id |
| AnalyticsPage.tsx | Charts and trend analysis | dashboardStore.analytics | GET /api/dashboard/analytics |
| SettingsPage.tsx | Tenant settings, user management | settingsData | GET/PUT /api/settings |
| LoginPage.tsx | Redirect to Cognito hosted UI | authStore | GET /api/auth/login |

### 4.2 Components — Key Specifications

| Component | Props | Internal State | Renders |
|---|---|---|---|
| DropZone | onFileAccepted: (File) => void | isDragging: boolean | Drag area, format hint, file picker button |
| UploadProgress | videoId: string, progress: number | status: string | Progress bar, percentage, ETA |
| VideoCard | video: VideoSummary, onClick: () => void | None | Thumbnail, name, ratio badge, date |
| VideoPlayer | streamUrl: string, enhancedUrl?: string | isEnhanced: boolean | HTML5 video, controls, quality toggle |
| EnhanceButton | videoId: string, onComplete: () => void | isProcessing: boolean | Button with loading spinner |
| MetricCard | label: string, value: string, icon: ReactNode | None | Icon, label, formatted value |
| SavingsChart | data: TimePoint[] | None | Recharts line chart |
| BedrockSummary | summary: string, isLoading: boolean | None | Text panel with formatting |
| SearchBar | onSearch: (query: string) => void | query: string | Input field, search icon |
| FilterPanel | filters: Filters, onChange: (Filters) => void | expanded: boolean | Date picker, dropdowns, apply button |

### 4.3 Zustand Stores

| Store | State Shape | Actions |
|---|---|---|
| authStore | { user, token, tenantId, role, isAuthenticated } | login(), logout(), refreshToken(), setUser() |
| videoStore | { videos[], currentVideo, totalCount, filters } | fetchVideos(), fetchVideo(id), deleteVideo(id), setFilters() |
| uploadStore | { queue[], currentUpload, progress } | addToQueue(file), startUpload(), updateProgress(pct), clearQueue() |
| dashboardStore | { summary, analytics, savings, recentUploads } | fetchSummary(), fetchAnalytics(period), fetchSavings() |
| uiStore | { sidebarOpen, notifications[], theme } | toggleSidebar(), addNotification(), removeNotification() |

---

## 5. REST API Complete Specification

### Validation Rules

| Endpoint | Field | Rule |
|---|---|---|
| POST /api/upload | file.content_type | Must be video/mp4, video/x-msvideo, video/quicktime, video/x-matroska |
| POST /api/upload | file.size | Must be <= 2,147,483,648 bytes (2 GB) |
| POST /api/upload | file.filename | Must end in .mp4, .avi, .mov, .mkv (case-insensitive) |
| POST /api/upload | camera_id | Optional, max 100 chars, alphanumeric + hyphens |
| GET /api/videos | page | Integer >= 1, default 1 |
| GET /api/videos | page_size | Integer 1-100, default 20 |
| GET /api/videos | date_from | ISO 8601 format or null |
| GET /api/videos | date_to | ISO 8601 format, must be >= date_from |
| DELETE /api/videos/:id | video_id | Valid UUID format |
| POST /api/playback/:id/enhance | video_id | Must exist in DynamoDB, status=completed |
| POST /api/bedrock/summary/:id | video_id | Must exist, status=completed |
| All authenticated endpoints | Authorization header | Bearer token, valid JWT, not expired |

---

## 6. Database Schema (DynamoDB)

### Table: visionvault-videos

**Key Schema**:
- Partition Key: `tenant_id` (String)
- Sort Key: `video_id` (String)

**Full Attribute Specification**:

| Attribute | Type | Required | Description |
|---|---|---|---|
| tenant_id | S | Yes | Organization ID (from JWT claims) |
| video_id | S | Yes | UUID v4 |
| file_name | S | Yes | Original filename |
| camera_id | S | No | User-provided camera identifier |
| description | S | No | User-provided description |
| status | S | Yes | Enum: uploading, processing, completed, failed |
| upload_timestamp | S | Yes | ISO 8601 |
| original_format | S | Yes | mp4, avi, mov, mkv |
| original_codec | S | Yes | h264, mpeg4, mjpeg, etc. |
| original_size_bytes | N | Yes | File size before compression |
| optimized_size_bytes | N | No | File size after compression |
| duration_seconds | N | Yes | Video length |
| resolution_width | N | Yes | Frame width in pixels |
| resolution_height | N | Yes | Frame height in pixels |
| fps | N | Yes | Frames per second |
| bitrate_kbps | N | Yes | Original video bitrate |
| has_audio | BOOL | Yes | Audio track present |
| compression_profile | S | No | max_storage, balanced, max_quality |
| crf_used | N | No | CRF value applied (18-35) |
| preset_used | S | No | FFmpeg preset (medium/slow) |
| compression_ratio | N | No | Size reduction ratio (0-1) |
| ssim_score | N | No | Structural similarity (0-1) |
| psnr_db | N | No | Peak signal-to-noise (dB) |
| processing_time_ms | N | No | Compression duration |
| s3_original_key | S | Yes | S3 key for original file |
| s3_optimized_key | S | No | S3 key for optimized file |
| s3_enhanced_key | S | No | S3 key for enhanced file (if cached) |
| s3_thumbnail_key | S | No | S3 key for thumbnail |
| storage_saved_bytes | N | No | original - optimized |
| estimated_monthly_savings_usd | N | No | Cost calculation |
| estimated_annual_savings_usd | N | No | Monthly * 12 |
| retention_improvement_days | N | No | Extra days of storage |
| bedrock_summary | S | No | Cached AI-generated summary |
| enhancement_status | S | No | none, processing, completed |
| error_message | S | No | Error details if status=failed |
| created_at | S | Yes | Record creation ISO 8601 |
| updated_at | S | Yes | Last update ISO 8601 |

**GSI-1**: DateCameraIndex
- Partition Key: `tenant_id`
- Sort Key: `upload_timestamp`
- Projected: ALL

**GSI-2**: StatusIndex
- Partition Key: `tenant_id`
- Sort Key: `status`
- Projected: KEYS_ONLY + video_id, file_name, upload_timestamp

---

## 7. S3 Object Layout

```
Bucket: visionvault-storage-{aws-account-id}

Key Pattern:
  {tenant_id}/original/{video_id}.{original_extension}
  {tenant_id}/optimized/{video_id}.mp4
  {tenant_id}/enhanced/{video_id}_enhanced.mp4
  {tenant_id}/thumbnails/{video_id}_thumb.jpg

Examples:
  acme-bank/original/550e8400-e29b-41d4-a716-446655440000.mp4
  acme-bank/optimized/550e8400-e29b-41d4-a716-446655440000.mp4
  acme-bank/enhanced/550e8400-e29b-41d4-a716-446655440000_enhanced.mp4
  acme-bank/thumbnails/550e8400-e29b-41d4-a716-446655440000_thumb.jpg
```

**Bucket Configuration**:
- Encryption: SSE-S3 (AES-256) default
- Versioning: Disabled (MVP)
- Lifecycle Rules:
  - original/ prefix: Transition to IA after 30 days, Glacier after 90 days
  - optimized/ prefix: Remain in Standard (frequently accessed)
  - enhanced/ prefix: Delete after 7 days (regenerable on demand)
  - thumbnails/ prefix: Remain in Standard
- CORS: Allow origin localhost:5173 (dev), production domain (future)
- Public Access: Blocked (presigned URLs only)

---

## 8. Processing State Machine

### Video Processing States

```
                    +------------+
                    |  UPLOADING |
                    +------+-----+
                           |
                    Upload complete
                           |
                           v
                    +------------+
                    | PROCESSING |
                    +------+-----+
                           |
              +------------+------------+
              |                         |
         Success                    Failure
              |                         |
              v                         v
       +------------+           +------------+
       | COMPLETED  |           |   FAILED   |
       +------+-----+           +------+-----+
              |                         |
              |                    Retry (max 2)
              |                         |
              v                         v
       +------------------+     Back to PROCESSING
       | ENHANCEMENT      |     or PERMANENTLY_FAILED
       | (on user request)|
       +------------------+
```

### State Transitions

| Current State | Trigger | Next State | Action |
|---|---|---|---|
| (new) | Upload initiated | UPLOADING | Create DynamoDB record, status=uploading |
| UPLOADING | File saved to temp | PROCESSING | Update status=processing, start pipeline |
| PROCESSING | Pipeline success | COMPLETED | Update all metrics, status=completed |
| PROCESSING | Pipeline error (attempt 1) | PROCESSING | Retry with default preset |
| PROCESSING | Pipeline error (attempt 2) | FAILED | Update status=failed, log error |
| COMPLETED | User clicks "AI Enhance" | COMPLETED (enhancement_status=processing) | Start enhancement pipeline |
| COMPLETED | Enhancement done | COMPLETED (enhancement_status=completed) | Store enhanced S3 key |

---

## 9. Upload Lifecycle (Detailed)

```
Step 1: User selects file in browser
  Frontend validates: extension in [.mp4,.avi,.mov,.mkv], size <= 2GB
  If invalid: show error immediately (no API call)

Step 2: Frontend calls POST /api/upload (multipart/form-data)
  Backend receives file stream
  AuthMiddleware validates JWT
  TenantMiddleware extracts tenant_id

Step 3: Backend validate_file()
  Check content_type header
  Check file size
  Check magic bytes (first 8 bytes match known video signatures)
  If invalid: return 400/413/415 with specific error

Step 4: Backend save_temp_file()
  Write to /tmp/visionvault/{video_id}/{filename}
  Generate video_id = UUID v4

Step 5: Create initial DynamoDB record
  tenant_id, video_id, file_name, status=uploading, upload_timestamp

Step 6: Upload original to S3
  Key: {tenant_id}/original/{video_id}.{ext}
  Update DynamoDB: s3_original_key, status=processing

Step 7: Return upload response to frontend
  { video_id, status: "processing", estimated_time }

Step 8: Run processing pipeline (background task)
  metadata_service.extract_metadata()
  optimization_service.run_full_optimization()
  compression_service.compress_video()
  quality_service.verify_quality()
  Generate thumbnail
  Upload optimized to S3
  Update DynamoDB with all metrics
  status = completed

Step 9: Notify frontend (polling or WebSocket)
  Frontend polls GET /api/upload/{video_id}/status every 3 seconds
  When status=completed: redirect to Video Detail page
```

---

## 10. Thumbnail Generation Pipeline

| Step | Action | Tool | Output |
|---|---|---|---|
| 1 | Seek to 10% of video duration | FFmpeg -ss | Positioned stream |
| 2 | Extract single frame | FFmpeg -frames:v 1 | Raw frame (PNG) |
| 3 | Resize to 320x180 (16:9) | FFmpeg -vf scale | Resized frame |
| 4 | Convert to JPEG quality 80 | FFmpeg -q:v 5 | JPEG thumbnail |
| 5 | Upload to S3 | boto3 put_object | s3://{tenant}/thumbnails/{id}_thumb.jpg |
| 6 | Store S3 key in DynamoDB | update_item | s3_thumbnail_key field |

**FFmpeg command pattern**:
```
ffmpeg -ss {duration*0.1} -i {input} -frames:v 1 -vf scale=320:180 -q:v 5 {output}.jpg
```

---

## 11. Dashboard Data Flow

```
Frontend (HomePage)                Backend                  DynamoDB
      |                              |                        |
      |--- GET /api/dashboard/summary --->                    |
      |                              |--- Query(tenant_id) -->|
      |                              |<-- All video records --|
      |                              |                        |
      |                              | Aggregate:
      |                              |   total_videos = count(records)
      |                              |   total_original = sum(original_size_bytes)
      |                              |   total_optimized = sum(optimized_size_bytes)
      |                              |   overall_ratio = 1 - (total_optimized/total_original)
      |                              |   total_saved = total_original - total_optimized
      |                              |   monthly_savings = total_saved * $0.023/GB
      |                              |   annual_savings = monthly_savings * 12
      |                              |   avg_quality = avg(ssim_score)
      |                              |   avg_processing = avg(processing_time_ms)
      |                              |   retention_improvement = days_from_ratio(overall_ratio)
      |                              |
      |<-- DashboardSummaryResponse --|
      |                              |
      | Render:
      |   MetricCard: "Total Saved: {total_saved} GB"
      |   MetricCard: "Compression: {overall_ratio}%"
      |   MetricCard: "Monthly Savings: ${monthly_savings}"
      |   MetricCard: "Retention: +{retention_improvement} days"
      |   RecentUploads: last 5 videos
```

**Cost Calculation Formula**:
```
monthly_savings_usd = (storage_saved_bytes / 1_073_741_824) * 0.023
annual_savings_usd = monthly_savings_usd * 12
retention_improvement_days = floor(90 * (1 / (1 - compression_ratio)) - 90)
```
(Based on S3 Standard pricing at $0.023/GB/month, assuming 90-day baseline retention)

---

## 12. Backend Request Lifecycle

```
1. HTTP Request arrives at Uvicorn
2. CORS Middleware: Check Origin header against CORS_ORIGINS
3. Logging Middleware: Log request method, path, timestamp, generate request_id
4. Auth Middleware:
   a. Extract "Authorization: Bearer {token}" header
   b. Decode JWT (python-jose, RS256)
   c. Verify signature against Cognito JWKS (cached)
   d. Check exp claim (not expired)
   e. Extract sub, email, custom:tenant_id, cognito:groups
   f. Create UserContext(sub, email, tenant_id, role)
   g. If invalid: return 401 immediately
5. Tenant Middleware:
   a. Extract tenant_id from UserContext
   b. Inject into request.state.tenant_id
   c. All downstream queries MUST use this tenant_id
6. Rate Limit Check: 100 requests/minute per user (in-memory counter)
7. Router: Match path + method to handler function
8. Dependency Injection: Resolve dependencies (get_current_user, get_s3_client, etc.)
9. Request Validation: Pydantic schema validates input body/params
10. Service Layer: Execute business logic
11. Response Serialization: Pydantic model → JSON
12. Logging Middleware: Log response status, duration
13. HTTP Response sent
```

---

## 13. Logging Flow

```
Request In --> Logging Middleware assigns request_id
    |
    v
All log entries include: timestamp, level, service, tenant_id, video_id, request_id
    |
    +---> Console (structured JSON) during development
    |
    +---> CloudWatch Logs (production)
         |
         +---> Log Group: /visionvault/api (all requests)
         +---> Log Group: /visionvault/processing (pipeline logs)
         +---> Log Group: /visionvault/errors (ERROR+ only)
```

**Log points in processing pipeline**:
| Point | Level | Message |
|---|---|---|
| Upload received | INFO | "Upload received: {filename}, size={bytes}" |
| Validation passed | INFO | "Validation passed: format={ext}" |
| Metadata extracted | INFO | "Metadata: {resolution}, {fps}fps, {duration}s" |
| Analysis complete | INFO | "Analysis: motion={score}, noise={score}, scene={score}" |
| Recommendation | INFO | "Recommendation: profile={name}, crf={crf}, bitrate={kbps}" |
| Compression started | INFO | "Compression started: {filename}" |
| Compression complete | INFO | "Compressed: {ratio}% reduction, {time}ms" |
| Quality verified | INFO | "Quality: SSIM={ssim}, PSNR={psnr}dB" |
| S3 upload done | INFO | "Stored: {s3_key}" |
| Pipeline complete | INFO | "Pipeline complete: video_id={id}, total_time={ms}" |
| Enhancement started | INFO | "Enhancement started: video_id={id}" |
| Enhancement complete | INFO | "Enhanced: {frames} frames, {time}ms" |
| Any error | ERROR | "Error in {service}: {error_type}: {message}" |

---

## 14. Error Handling Flow

```
Exception raised in service layer
    |
    v
Is it a known VisionVaultError subclass?
    |
    +-- Yes --> Map to appropriate HTTP status + error code
    |              |
    |              +-- ValidationError --> 400 + VALIDATION_FAILED
    |              +-- AuthenticationError --> 401 + AUTH_FAILED
    |              +-- AuthorizationError --> 403 + FORBIDDEN
    |              +-- NotFoundError --> 404 + NOT_FOUND
    |              +-- FileTooLargeError --> 413 + FILE_TOO_LARGE
    |              +-- UnsupportedFormatError --> 415 + UNSUPPORTED_FORMAT
    |              +-- ProcessingError --> 500 + PROCESSING_FAILED
    |              +-- AWSServiceError --> 502 + SERVICE_ERROR
    |
    +-- No --> 500 + INTERNAL_ERROR (generic)
    |
    v
Log error with full traceback (ERROR level)
    |
    v
Emit CloudWatch metric: VisionVault/Errors (count=1, dimension=error_type)
    |
    v
Return standardized error response:
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message",
    "details": "Technical details (dev mode only)",
    "request_id": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

---

## 15. Security Flow

```
Frontend:
  1. User clicks Login --> Redirect to Cognito Hosted UI
  2. User authenticates (username/password or SSO)
  3. Cognito redirects back with ?code=AUTH_CODE
  4. Frontend calls POST /api/auth/callback with code
  5. Backend exchanges code for tokens via Cognito token endpoint
  6. Backend returns { access_token, id_token, refresh_token, expires_in }
  7. Frontend stores access_token in memory (NOT localStorage)
  8. Frontend stores refresh_token in httpOnly cookie (if using cookies) or memory
  9. All subsequent API calls: Authorization: Bearer {access_token}
  10. Token refresh: when access_token expires (every 1 hour), call /api/auth/refresh
  11. Logout: call /api/auth/logout, clear tokens from memory

Backend Token Validation:
  1. Extract Bearer token from Authorization header
  2. Download Cognito JWKS from https://cognito-idp.{region}.amazonaws.com/{pool_id}/.well-known/jwks.json (cached 24h)
  3. Decode JWT header to get kid (key ID)
  4. Find matching public key in JWKS
  5. Verify RS256 signature
  6. Check claims: iss (Cognito pool URL), exp (not expired), token_use (access)
  7. Extract custom claims: custom:tenant_id, cognito:groups
  8. Map groups to roles: "admin" -> ADMIN, "operator" -> OPERATOR, default -> VIEWER
```

---

## 16. AWS SDK Interactions (Exact boto3 Calls)

### S3 Operations

| Operation | boto3 Call | Parameters |
|---|---|---|
| Upload file | s3.upload_file(Filename, Bucket, Key) | Filename=local_path, Bucket=settings.S3_BUCKET, Key="{tenant}/{type}/{id}.{ext}" |
| Upload bytes | s3.put_object(Bucket, Key, Body) | Body=file_bytes |
| Download file | s3.download_file(Bucket, Key, Filename) | To local temp path |
| Generate presigned URL | s3.generate_presigned_url("get_object", Params, ExpiresIn) | Params={"Bucket":..., "Key":...}, ExpiresIn=3600 |
| Delete object | s3.delete_object(Bucket, Key) | Single object deletion |
| Check existence | s3.head_object(Bucket, Key) | Raises ClientError if missing |

### DynamoDB Operations

| Operation | boto3 Call | Parameters |
|---|---|---|
| Create record | table.put_item(Item={...}) | Full video record dict |
| Get record | table.get_item(Key={"tenant_id": t, "video_id": v}) | Returns Item or raises |
| Update fields | table.update_item(Key, UpdateExpression, ExpressionAttributeValues) | SET #status = :s, #updated = :u |
| Delete record | table.delete_item(Key={"tenant_id": t, "video_id": v}) | Permanent deletion |
| Query by tenant | table.query(KeyConditionExpression=Key("tenant_id").eq(t)) | Returns Items[] |
| Query with filter | table.query(KeyConditionExpression=..., FilterExpression=Attr("status").eq("completed")) | Filtered results |
| Query GSI | table.query(IndexName="DateCameraIndex", KeyConditionExpression=...) | Date-range queries |
| Scan with filter | table.scan(FilterExpression=...) | Only for admin aggregation |

### Bedrock Operations

| Operation | boto3 Call | Parameters |
|---|---|---|
| Invoke model | bedrock.invoke_model(modelId, body, contentType, accept) | modelId="anthropic.claude-3-sonnet-20240229-v1:0", body=json.dumps({"anthropic_version":"bedrock-2023-05-31","max_tokens":1024,"messages":[{"role":"user","content":prompt}]}), contentType="application/json", accept="application/json" |
| Parse response | json.loads(response["body"].read()) | Extract content[0].text |

### CloudWatch Operations

| Operation | boto3 Call | Parameters |
|---|---|---|
| Put metric | cloudwatch.put_metric_data(Namespace, MetricData) | Namespace="VisionVault", MetricData=[{"MetricName":"VideosProcessed","Value":1,"Unit":"Count","Dimensions":[{"Name":"tenant_id","Value":t}]}] |
| Put log | (via logging handler) boto3 logs client | Configured via watchtower library |

### Cognito Operations

| Operation | boto3 Call | Parameters |
|---|---|---|
| Exchange code | HTTP POST to Cognito /oauth2/token | grant_type=authorization_code, code=code, client_id, redirect_uri |
| Refresh token | HTTP POST to Cognito /oauth2/token | grant_type=refresh_token, refresh_token=token, client_id |
| Get JWKS | HTTP GET /.well-known/jwks.json | Cached response |
| Get user | cognito.admin_get_user(UserPoolId, Username) | For profile retrieval |

---

## 17. Bedrock Prompt Template

### Per-Video Summary Prompt

```
You are VisionVault AI, an enterprise CCTV video storage optimization assistant. Generate a concise business summary for a video that was optimized on our platform.

Video Information:
- File Name: {file_name}
- Camera ID: {camera_id}
- Duration: {duration_seconds} seconds
- Original Size: {original_size_mb} MB
- Optimized Size: {optimized_size_mb} MB
- Compression Ratio: {compression_ratio_percent}%
- Compression Profile: {profile} ({profile_description})
- Quality Score (SSIM): {ssim_score}
- Processing Time: {processing_time_seconds} seconds

Storage Economics:
- Storage Saved: {storage_saved_mb} MB
- Monthly Cost Savings: ${monthly_savings}
- Annual Cost Savings: ${annual_savings}
- Retention Improvement: +{retention_days} additional days (from 90-day baseline)

Instructions:
1. Write a 3-4 sentence executive summary suitable for non-technical stakeholders
2. Quantify the business impact (cost savings, retention extension)
3. Comment on quality preservation (SSIM score interpretation)
4. Provide one actionable recommendation based on the compression profile used
5. Keep language professional but accessible
6. Do NOT mention technical details like CRF, SSIM numbers directly — translate to business language

Output format: A single paragraph followed by a "Recommendation:" line.
```

### Aggregate Summary Prompt

```
You are VisionVault AI, an enterprise CCTV video storage optimization assistant. Generate an executive ROI report for an organization's total video optimization results.

Organization Metrics:
- Total Videos Processed: {total_videos}
- Total Original Storage: {total_original_gb} GB
- Total Optimized Storage: {total_optimized_gb} GB
- Total Storage Saved: {total_saved_gb} GB
- Overall Compression Ratio: {overall_ratio}%
- Average Quality Score: {avg_ssim} (on 0-1 scale, >0.85 = excellent)
- Total Monthly Savings: ${total_monthly_savings}
- Total Annual Savings: ${total_annual_savings}
- Average Retention Improvement: +{avg_retention_days} days
- Videos by Profile: {max_storage_count} Maximum Storage, {balanced_count} Balanced, {max_quality_count} Maximum Quality

Instructions:
1. Write a 5-6 sentence executive summary for C-level stakeholders
2. Lead with the headline number (annual savings or percentage reduction)
3. Explain retention improvement in business terms
4. Comment on quality preservation across the portfolio
5. Provide 2-3 strategic recommendations for further optimization
6. Mention scalability (project future savings if more cameras are added)
7. Keep language executive-friendly, no technical jargon

Output format:
Executive Summary: [paragraph]
Key Metrics: [bullet points]
Recommendations: [numbered list]
```

---

## 18. Demo Walkthrough — Step by Step

### Screen 1: Login Page
- **URL**: localhost:5173/login
- **Display**: VisionVault AI logo, "Enterprise CCTV Storage Optimization" tagline
- **Action**: Click "Sign In with AWS Cognito" button
- **Animation**: Button has subtle pulse animation
- **Transition**: Redirect to Cognito hosted UI, user enters credentials, redirected back

### Screen 2: Home Dashboard
- **URL**: localhost:5173/
- **Display**:
  - Header: "Welcome, [User Name]" + organization badge
  - 4 Metric Cards (row):
    - Total Storage Saved: "15.7 GB" (green arrow up)
    - Compression Ratio: "67%" (blue percentage)
    - Monthly Savings: "$362.10" (green dollar)
    - Retention Boost: "+150 days" (purple calendar)
  - Recent Uploads: table with last 5 videos (name, date, status badge, ratio)
  - Quick Actions: "Upload New Video" button (primary), "View Library" button (secondary)
- **Animations**: Cards fade-in with stagger (100ms delay each), numbers count up

### Screen 3: Upload Page
- **URL**: localhost:5173/upload
- **Action**: Drag CCTV demo file "parking_lot_cam3.mp4" (200 MB) onto drop zone
- **Display**:
  - DropZone: Dashed border, "Drag & drop CCTV video here" text, cloud upload icon
  - On drag-over: border turns blue, background highlights
  - On drop: file info appears (name, size, format badge "MP4")
  - Upload progress bar: 0% → 100% (animated fill)
  - Status text: "Uploading..." → "Processing..." → "Optimization Complete!"
- **Metrics appear as processing completes**:
  - "Original: 200 MB → Optimized: 62 MB (69% reduction)"
  - "Quality: Excellent (SSIM: 0.91)"
  - "Processing Time: 42 seconds"
- **Action**: Click "View Details" to navigate to Video Detail

### Screen 4: Video Detail Page
- **URL**: localhost:5173/video/{video_id}
- **Display**:
  - Video Player (top half): Playing optimized video
  - Quality Toggle: "Original" / "Enhanced" switch
  - "AI Enhance" button (purple, with sparkle icon)
  - Metrics Panel (right sidebar):
    - Original Size: 200 MB
    - Compressed Size: 62 MB
    - Compression Ratio: 69%
    - SSIM Score: 0.91
    - PSNR: 38.5 dB
    - Processing Time: 42s
    - Monthly Savings: $4.60
    - Annual Savings: $55.20
    - Retention: +180 days
  - Bedrock Summary Panel (below player): "Generate Business Summary" button
- **Action 1**: Click "AI Enhance" button
  - Button shows spinner: "Enhancing with AI..."
  - After ~15s: "Enhancement Complete" notification
  - Toggle automatically switches to "Enhanced" view
  - Visible quality improvement (sharper text, clearer faces)
- **Action 2**: Click "Generate Business Summary"
  - Loading skeleton appears
  - After ~5s: Bedrock-generated paragraph appears:
    > "Your parking lot camera footage was optimized from 200 MB to 62 MB, achieving a 69% storage reduction. This translates to $4.60 in monthly savings per camera, or $55.20 annually. At this compression ratio, your retention extends from 90 days to 270 days without additional cost — meaning 6 additional months of accessible footage for compliance or investigation needs. The footage quality score is Excellent, with faces and license plates remaining clearly identifiable."
    > 
    > Recommendation: This static camera footage is ideal for the Maximum Storage profile, which could achieve up to 80% compression on similar feeds.

### Screen 5: Video Library
- **URL**: localhost:5173/library
- **Display**: Grid of 3-5 demo videos with thumbnails, search bar, filter panel
- **Action**: Type "parking" in search → filtered results
- **Action**: Click date filter → show videos from today

### Screen 6: Analytics Page
- **URL**: localhost:5173/analytics
- **Display**:
  - Savings Over Time (line chart): cumulative GB saved
  - Compression Ratio Trends (bar chart): by video
  - Cost Savings (bar chart): monthly projection
  - ROI Panel: "Annual projected savings: $4,345 across all cameras"
- **Animations**: Charts animate on page load (draw-in effect)

### Screen 7: Show Multi-Tenant Isolation
- **Action**: Log out, log in as different tenant ("Metro Airport")
- **Display**: Completely different dashboard — different videos, different metrics
- **Point to make**: Data isolation demonstrated

### Screen 8: CloudWatch (AWS Console)
- **Action**: Open AWS Console, navigate to CloudWatch
- **Display**: Custom dashboard showing VisionVault metrics
  - VideosProcessed: count over time
  - CompressionRatio: average
  - ProcessingTime: p50/p95
  - Error count: 0
- **Point to make**: Enterprise-grade observability

---

## 19. Build Priority (Implementation Order)

### Priority 1 — Foundation (Day 1-2)

| Order | File | Reason |
|---|---|---|
| 1 | backend/app/config.py | All modules depend on configuration |
| 2 | backend/app/main.py | Application entry point |
| 3 | backend/app/models/video.py | Data model used everywhere |
| 4 | backend/app/models/metadata.py | Processing pipeline data model |
| 5 | backend/app/schemas/requests.py | API contract definition |
| 6 | backend/app/schemas/responses.py | API contract definition |
| 7 | backend/app/utils/ffprobe.py | Foundation for metadata extraction |
| 8 | backend/app/utils/ffmpeg.py | Foundation for compression |
| 9 | backend/app/utils/s3.py | Foundation for storage |
| 10 | backend/app/utils/dynamodb.py | Foundation for metadata persistence |
| 11 | frontend/src/types/video.ts | TypeScript types used everywhere |
| 12 | frontend/src/types/api.ts | API type definitions |
| 13 | frontend/src/services/api.ts | HTTP client (Axios instance) |
| 14 | frontend/src/App.tsx | Application shell with routing |

### Priority 2 — Core Pipeline (Day 3-6)

| Order | File | Reason |
|---|---|---|
| 15 | backend/app/services/metadata_service.py | First step in pipeline |
| 16 | backend/app/ai/optimization_engine/metadata_analyzer.py | Analyzer 1 |
| 17 | backend/app/ai/optimization_engine/scene_analyzer.py | Analyzer 2 |
| 18 | backend/app/ai/optimization_engine/motion_estimator.py | Analyzer 3 |
| 19 | backend/app/ai/optimization_engine/brightness_analyzer.py | Analyzer 4 |
| 20 | backend/app/ai/optimization_engine/noise_estimator.py | Analyzer 5 |
| 21 | backend/app/ai/optimization_engine/recommendation_engine.py | Produces compression params |
| 22 | backend/app/ai/optimization_engine/engine.py | Orchestrates all analyzers |
| 23 | backend/app/services/optimization_service.py | Service wrapper for engine |
| 24 | backend/app/services/compression_service.py | FFmpeg execution |
| 25 | backend/app/services/quality_service.py | SSIM/PSNR verification |
| 26 | backend/app/services/storage_service.py | S3 + DynamoDB operations |
| 27 | backend/app/services/upload_service.py | Orchestrates full pipeline |
| 28 | backend/app/routers/upload.py | Upload API endpoint |
| 29 | frontend/src/components/upload/DropZone.tsx | Upload UI |
| 30 | frontend/src/components/upload/UploadProgress.tsx | Progress display |
| 31 | frontend/src/pages/UploadPage.tsx | Upload page |
| 32 | frontend/src/services/uploadService.ts | Upload API calls |

### Priority 3 — Dashboard & Library (Day 7-9)

| Order | File | Reason |
|---|---|---|
| 33 | backend/app/services/dashboard_service.py | Metrics aggregation |
| 34 | backend/app/routers/dashboard.py | Dashboard API |
| 35 | backend/app/routers/videos.py | Video list/detail API |
| 36 | frontend/src/components/common/MetricCard.tsx | Reusable metric display |
| 37 | frontend/src/components/dashboard/StatsOverview.tsx | Dashboard cards |
| 38 | frontend/src/components/dashboard/RecentUploads.tsx | Recent list |
| 39 | frontend/src/pages/HomePage.tsx | Home page assembly |
| 40 | frontend/src/components/library/VideoCard.tsx | Video grid item |
| 41 | frontend/src/components/library/VideoGrid.tsx | Grid layout |
| 42 | frontend/src/components/library/SearchBar.tsx | Search input |
| 43 | frontend/src/pages/LibraryPage.tsx | Library page |
| 44 | frontend/src/pages/VideoDetailPage.tsx | Video detail page |

### Priority 4 — AI Enhancement (Day 10-14)

| Order | File | Reason |
|---|---|---|
| 45 | backend/app/ai/enhancement/real_esrgan.py | Model loading + inference |
| 46 | backend/app/ai/enhancement/frame_processor.py | Frame extract/reassemble |
| 47 | backend/app/services/enhancement_service.py | Enhancement orchestration |
| 48 | backend/app/services/playback_service.py | Video streaming |
| 49 | backend/app/routers/playback.py | Playback API endpoints |
| 50 | frontend/src/components/player/VideoPlayer.tsx | Video player |
| 51 | frontend/src/components/player/EnhanceButton.tsx | AI enhance trigger |
| 52 | frontend/src/components/player/QualityToggle.tsx | Original/Enhanced switch |

### Priority 5 — Bedrock Intelligence (Day 15-17)

| Order | File | Reason |
|---|---|---|
| 53 | backend/app/services/bedrock_service.py | Bedrock integration |
| 54 | backend/app/routers/bedrock.py | Summary API |
| 55 | frontend/src/components/player/BedrockSummary.tsx | Summary display |
| 56 | frontend/src/services/bedrockService.ts | Frontend API calls |

### Priority 6 — Auth & Security (Day 18-22)

| Order | File | Reason |
|---|---|---|
| 57 | backend/app/services/auth_service.py | Cognito integration |
| 58 | backend/app/middleware/auth_middleware.py | JWT validation |
| 59 | backend/app/middleware/tenant_middleware.py | Tenant isolation |
| 60 | backend/app/routers/auth.py | Auth endpoints |
| 61 | frontend/src/services/authService.ts | Auth API calls |
| 62 | frontend/src/store/authStore.ts | Auth state |
| 63 | frontend/src/components/auth/LoginButton.tsx | Login UI |
| 64 | frontend/src/components/common/ProtectedRoute.tsx | Route guard |
| 65 | frontend/src/pages/LoginPage.tsx | Login page |

### Priority 7 — Polish & Analytics (Day 23-25)

| Order | File | Reason |
|---|---|---|
| 66 | frontend/src/components/dashboard/SavingsChart.tsx | Charts |
| 67 | frontend/src/components/analytics/CostSavingsChart.tsx | Analytics charts |
| 68 | frontend/src/pages/AnalyticsPage.tsx | Analytics page |
| 69 | frontend/src/components/common/Sidebar.tsx | Navigation |
| 70 | frontend/src/components/common/Header.tsx | Header bar |
| 71 | backend/app/middleware/logging_middleware.py | Request logging |
| 72 | backend/app/utils/cloudwatch.py | Metrics emission |
| 73 | backend/app/services/notification_service.py | Notifications |

### Priority 8 — Testing & Demo Prep (Day 26-28)

| Order | File | Reason |
|---|---|---|
| 74 | backend/tests/conftest.py | Test fixtures |
| 75 | backend/tests/test_upload.py | Upload tests |
| 76 | backend/tests/test_compression.py | Compression tests |
| 77 | backend/tests/test_optimization.py | Analyzer tests |
| 78 | backend/tests/test_quality.py | Quality tests |
| 79 | backend/tests/test_auth.py | Auth tests |
| 80 | scripts/seed_demo_data.py | Demo data seeding |
| 81 | scripts/setup_aws.py | AWS provisioning script |

---

## 20. Dependency Graph

### Backend Module Dependencies

```
config.py (depends on: nothing)
    |
    v
dependencies.py (depends on: config)
    |
    +---> utils/s3.py (depends on: config, boto3)
    +---> utils/dynamodb.py (depends on: config, boto3)
    +---> utils/ffmpeg.py (depends on: config, subprocess)
    +---> utils/ffprobe.py (depends on: config, subprocess)
    +---> utils/cloudwatch.py (depends on: config, boto3)
    |
    v
models/ (depends on: nothing — pure data classes)
    |--- video.py
    |--- metadata.py
    |--- metrics.py
    |--- user.py
    |
    v
schemas/ (depends on: models)
    |--- requests.py
    |--- responses.py
    |
    v
ai/optimization_engine/ (depends on: models, utils/ffprobe, cv2, numpy)
    |--- metadata_analyzer.py (depends on: models/metadata)
    |--- scene_analyzer.py (depends on: cv2, numpy)
    |--- motion_estimator.py (depends on: cv2, numpy)
    |--- brightness_analyzer.py (depends on: cv2, numpy)
    |--- noise_estimator.py (depends on: cv2, numpy)
    |--- recommendation_engine.py (depends on: all analyzers' output models)
    |--- engine.py (depends on: all analyzers)
    |
    v
ai/enhancement/ (depends on: torch, cv2, basicsr, realesrgan)
    |--- real_esrgan.py (depends on: torch, realesrgan)
    |--- frame_processor.py (depends on: cv2)
    |
    v
services/ (depends on: models, schemas, utils, ai)
    |--- auth_service.py (depends on: config, python-jose, httpx)
    |--- metadata_service.py (depends on: utils/ffprobe, models/metadata)
    |--- optimization_service.py (depends on: ai/optimization_engine, models)
    |--- compression_service.py (depends on: utils/ffmpeg, models)
    |--- quality_service.py (depends on: utils/ffmpeg, models/metrics)
    |--- storage_service.py (depends on: utils/s3, utils/dynamodb, models)
    |--- upload_service.py (depends on: ALL other services)
    |--- dashboard_service.py (depends on: storage_service, models)
    |--- playback_service.py (depends on: storage_service)
    |--- enhancement_service.py (depends on: ai/enhancement, storage_service)
    |--- bedrock_service.py (depends on: config, boto3, models)
    |--- notification_service.py (depends on: utils/cloudwatch)
    |
    v
middleware/ (depends on: services/auth_service, config)
    |--- auth_middleware.py (depends on: auth_service)
    |--- tenant_middleware.py (depends on: auth_middleware output)
    |--- logging_middleware.py (depends on: config)
    |
    v
routers/ (depends on: services, schemas, middleware, dependencies)
    |--- auth.py (depends on: auth_service, schemas)
    |--- upload.py (depends on: upload_service, schemas)
    |--- videos.py (depends on: storage_service, schemas)
    |--- dashboard.py (depends on: dashboard_service, schemas)
    |--- playback.py (depends on: playback_service, enhancement_service, schemas)
    |--- bedrock.py (depends on: bedrock_service, schemas)
    |
    v
main.py (depends on: all routers, all middleware, config, dependencies)
```

### Frontend Module Dependencies

```
types/ (depends on: nothing — TypeScript interfaces)
    |
    v
services/api.ts (depends on: types, axios)
    |
    v
services/ (depends on: api.ts, types)
    |--- authService.ts
    |--- uploadService.ts
    |--- videoService.ts
    |--- dashboardService.ts
    |--- bedrockService.ts
    |
    v
store/ (depends on: services, types, zustand)
    |--- authStore.ts (depends on: authService)
    |--- videoStore.ts (depends on: videoService)
    |--- uploadStore.ts (depends on: uploadService)
    |--- dashboardStore.ts (depends on: dashboardService)
    |--- uiStore.ts (depends on: nothing external)
    |
    v
hooks/ (depends on: store, services)
    |--- useAuth.ts (depends on: authStore)
    |--- useUpload.ts (depends on: uploadStore)
    |--- useVideos.ts (depends on: videoStore)
    |--- useDashboard.ts (depends on: dashboardStore)
    |
    v
components/ (depends on: hooks, store, types, utils)
    |--- common/ (depends on: nothing — reusable primitives)
    |--- upload/ (depends on: hooks/useUpload, store/uploadStore)
    |--- dashboard/ (depends on: hooks/useDashboard, common/)
    |--- library/ (depends on: hooks/useVideos, common/)
    |--- player/ (depends on: store/videoStore, services/bedrockService)
    |--- analytics/ (depends on: hooks/useDashboard, recharts)
    |--- auth/ (depends on: hooks/useAuth)
    |
    v
pages/ (depends on: components, hooks, store)
    |
    v
App.tsx (depends on: pages, common/Sidebar, common/Header, ProtectedRoute)
    |
    v
main.tsx (depends on: App.tsx)
```

### External Dependency Map

| Module | External Dependencies |
|---|---|
| FFprobe wrapper | ffprobe binary (system PATH) |
| FFmpeg wrapper | ffmpeg binary (system PATH) |
| Optimization analyzers | opencv-python, numpy |
| Real-ESRGAN | torch, torchvision, basicsr, realesrgan, RealESRGAN_x4plus.pth |
| S3 operations | boto3, botocore |
| DynamoDB operations | boto3, botocore |
| Bedrock operations | boto3 (bedrock-runtime client) |
| Auth service | python-jose[cryptography], httpx |
| FastAPI app | fastapi, uvicorn, pydantic, python-multipart |
| CloudWatch | boto3, watchtower (logging handler) |
| Frontend | react, react-dom, react-router-dom, zustand, axios, recharts, video.js, tailwindcss |

---

## 21. Compression Engine — Complete Specification

### Compression Profiles (Exact Values)

| Profile | Name | Base CRF | Bitrate Strategy | Preset | Target Ratio |
|---|---|---|---|---|---|
| MAX_STORAGE | Maximum Storage | 30 | Cap at 500 kbps (1080p) | medium | 70-85% reduction |
| BALANCED | Balanced | 25 | Adaptive (60% of original) | medium | 50-70% reduction |
| MAX_QUALITY | Maximum Quality | 20 | Floor at 2000 kbps (1080p) | slow | 30-50% reduction |

### CRF Adjustment Rules

| Condition | Adjustment | Rationale |
|---|---|---|
| is_dark (avg_luminance < 60) | CRF + 2 | Dark footage compresses efficiently |
| high_noise (noise_score > 0.5) | CRF - 2 | Preserve detail in noisy footage |
| 4K resolution (width >= 3840) | CRF - 1 | Preserve detail at high resolution |
| very_static (motion_score < 0.1) | CRF + 1 | Static footage compresses well |
| high_motion (motion_score > 0.8) | CRF - 1 | Preserve motion clarity |

**Final CRF**: Clamped to range [18, 35]

### Bitrate Scaling (Per Resolution)

| Resolution | MAX_STORAGE | BALANCED | MAX_QUALITY |
|---|---|---|---|
| 4K (3840x2160) | 2000 kbps | 5000 kbps | 10000 kbps |
| 1080p (1920x1080) | 500 kbps | 2000 kbps | 4000 kbps |
| 720p (1280x720) | 300 kbps | 1000 kbps | 2500 kbps |
| 480p (854x480) | 200 kbps | 500 kbps | 1000 kbps |

### FFmpeg Command Template

```
ffmpeg -i {input_path}
  -c:v libx265
  -crf {crf}
  -preset {preset}
  -maxrate {bitrate}k
  -bufsize {bitrate*2}k
  -c:a copy (if has_audio) OR -an (if no audio)
  -movflags +faststart
  -y
  {output_path}
```

**Critical constraints**:
- Do NOT add `-r` flag (preserves original FPS)
- Do NOT add `-t` flag (preserves full duration)
- Use `-movflags +faststart` for web streaming
- Use `-y` to overwrite output if exists

---

## 22. Quality Verification — Exact Implementation

### SSIM Calculation

**Tool**: FFmpeg filter `ssim`
**Command**:
```
ffmpeg -i {compressed} -i {original} -lavfi ssim="stats_file={stats_file}" -f null -
```
**Parse**: Read last line of stats_file, extract "All:" value
**Range**: 0.0 (no similarity) to 1.0 (identical)
**Threshold**: SSIM >= 0.85 = PASS, < 0.85 = WARNING

### PSNR Calculation

**Tool**: FFmpeg filter `psnr`
**Command**:
```
ffmpeg -i {compressed} -i {original} -lavfi psnr="stats_file={stats_file}" -f null -
```
**Parse**: Read last line, extract "average:" value
**Range**: 20 dB (poor) to 50+ dB (excellent)
**Threshold**: PSNR >= 30 dB = PASS, < 30 dB = WARNING

### Compression Ratio Calculation

```
ratio = 1 - (compressed_size / original_size)
ratio_percent = ratio * 100

Example: 200 MB → 62 MB
  ratio = 1 - (62/200) = 0.69
  ratio_percent = 69%
```

---

## Document Approval

| Role | Name | Date | Status |
|---|---|---|---|
| Product Owner | - | - | Pending |
| Technical Lead | - | - | Pending |
| Architecture Lead | - | - | Pending |

---

*End of Technical Design Specification*

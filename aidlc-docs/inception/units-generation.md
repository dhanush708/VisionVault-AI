# VisionVault AI — Units Generation Document

**Document Version**: 1.0  
**Date**: 2026-06-25  
**Project**: VisionVault AI  
**Methodology**: AWS AI-DLC (AI-Driven Development Life Cycle)  
**Phase**: INCEPTION — Units Generation  
**Status**: Draft — Pending Approval

---

## Overview

This document breaks the VisionVault AI platform into the smallest practical implementation units. Each unit is independently buildable, testable, and deployable. Units are grouped into milestones aligned with the approved Workflow Planning sprint breakdown.

**Total Units**: 28  
**Critical Path Units**: 16  
**Parallel Tracks**: 4  
**Mandatory (MVP)**: 22  
**Optional (Nice-to-Have)**: 6

---

## Milestone 1: Foundation (COMPLETED)

> Already implemented. Listed for dependency tracking.

### UNIT-01: Project Scaffolding and Configuration

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-01 |
| **Name** | Project Scaffolding and Configuration |
| **Description** | Initialize frontend (React/TS/Vite/Tailwind) and backend (FastAPI) projects with configuration, logging, and directory structure |
| **Purpose** | Provide runnable foundation for all subsequent units |
| **Dependencies** | None |
| **Files** | backend/app/main.py, config.py, logger.py, dependencies.py, middleware/logging_middleware.py, routers/health.py, aws/client.py; frontend/src/App.tsx, pages/LandingPage.tsx, pages/LoginPage.tsx, services/api.ts, vite.config.ts |
| **APIs** | GET /, GET /health |
| **AWS Services** | None (client helpers only) |
| **Complexity** | Low |
| **Estimated Time** | 4 hours |
| **Status** | COMPLETED |
| **MVP** | Mandatory |

**Test Cases**:
- Backend starts on port 8000 without errors
- GET / returns "VisionVault AI Backend Running"
- GET /health returns status=healthy, service name, version
- Frontend builds with zero errors
- Frontend renders landing page at localhost:5173

**Acceptance Criteria**:
- [x] Both applications start successfully
- [x] Structured JSON logging active
- [x] CORS configured for localhost:5173
- [x] No placeholder code

---

## Milestone 2: Core Pipeline

### UNIT-02: Video Upload API

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-02 |
| **Name** | Video Upload API |
| **Description** | Implement multipart file upload endpoint with format/size validation, temp storage, and upload status tracking |
| **Purpose** | Accept video files from users and trigger the processing pipeline |
| **Dependencies** | UNIT-01 |
| **Files** | backend/app/routers/upload.py, services/upload_service.py, schemas/requests.py, schemas/responses.py |
| **APIs** | POST /api/upload, GET /api/upload/{video_id}/status |
| **AWS Services** | None (local temp storage) |
| **Complexity** | Medium |
| **Estimated Time** | 6 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Upload valid MP4 file (< 2 GB) returns 200 with video_id
- Upload invalid format (.txt) returns 415
- Upload oversized file (> 2 GB) returns 413
- Upload with empty file returns 400
- Status endpoint returns correct processing state

**Acceptance Criteria**:
- [ ] Accepts MP4, AVI, MOV, MKV via multipart form
- [ ] Rejects unsupported formats with clear error message
- [ ] Rejects files exceeding 2 GB
- [ ] Returns video_id and status=processing
- [ ] Status endpoint reflects current state

---

### UNIT-03: Metadata Extraction Service

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-03 |
| **Name** | Metadata Extraction Service |
| **Description** | Run FFprobe on uploaded video to extract resolution, FPS, bitrate, codec, duration, audio presence, file size |
| **Purpose** | Provide structured video metadata for analysis and storage |
| **Dependencies** | UNIT-02 |
| **Files** | backend/app/services/metadata_service.py, utils/ffprobe.py, models/metadata.py |
| **APIs** | Internal (called by upload pipeline) |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 4 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Extract metadata from 1080p H.264 MP4 returns correct resolution/fps/codec
- Extract metadata from AVI file returns correct fields
- Handle corrupt file gracefully (return error, not crash)
- Duration extracted accurately (within 1 second tolerance)
- Audio presence correctly detected

**Acceptance Criteria**:
- [ ] Extracts all specified fields via FFprobe
- [ ] Returns structured VideoMetadata model
- [ ] Handles missing/corrupt files with clear error
- [ ] Works for MP4, AVI, MOV, MKV formats

---

### UNIT-04: Optimization Engine — Metadata Analyzer

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-04 |
| **Name** | Optimization Engine — Metadata Analyzer |
| **Description** | Analyze FFprobe output to score resolution, bitrate, and codec characteristics |
| **Purpose** | First analyzer input for compression recommendation |
| **Dependencies** | UNIT-03 |
| **Files** | backend/app/ai/optimization_engine/metadata_analyzer.py |
| **APIs** | Internal |
| **AWS Services** | None |
| **Complexity** | Low |
| **Estimated Time** | 2 hours |
| **MVP** | Mandatory |

**Test Cases**:
- 4K input scores resolution as 1.0
- 1080p input scores resolution as 0.7
- 720p input scores resolution as 0.5
- High bitrate flagged correctly
- Low bitrate flagged correctly

**Acceptance Criteria**:
- [ ] Accepts VideoMetadata, returns MetadataScore
- [ ] Resolution scoring matches specification
- [ ] O(1) execution time

---

### UNIT-05: Optimization Engine — Scene Analyzer

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-05 |
| **Name** | Optimization Engine — Scene Analyzer |
| **Description** | Sample frames and compute scene complexity via histogram comparison |
| **Purpose** | Detect scene changes and visual complexity for CRF tuning |
| **Dependencies** | UNIT-01 (OpenCV dependency) |
| **Files** | backend/app/ai/optimization_engine/scene_analyzer.py |
| **APIs** | Internal |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 4 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Static footage (no scene changes) returns low complexity score (< 0.3)
- Multi-scene footage returns high complexity score (> 0.7)
- Handles single-frame video gracefully
- Empty frame list returns 0.0 score

**Acceptance Criteria**:
- [ ] Samples every 30th frame
- [ ] Uses cv2.calcHist and cv2.compareHist
- [ ] Returns scene_complexity_score 0.0-1.0
- [ ] O(N) complexity where N = sampled frames

---

### UNIT-06: Optimization Engine — Motion Estimator

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-06 |
| **Name** | Optimization Engine — Motion Estimator |
| **Description** | Compute frame-to-frame differences to estimate motion level |
| **Purpose** | Determine if footage is static (max storage) or high-motion (max quality) |
| **Dependencies** | UNIT-01 (OpenCV dependency) |
| **Files** | backend/app/ai/optimization_engine/motion_estimator.py |
| **APIs** | Internal |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 3 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Static camera footage (no movement) returns motion_score < 0.1
- Walking people footage returns moderate score (0.3-0.6)
- Fast vehicle footage returns high score (> 0.7)
- Single frame input returns 0.0

**Acceptance Criteria**:
- [ ] Uses cv2.absdiff on grayscale consecutive frames
- [ ] Returns motion_score 0.0-1.0
- [ ] Classifies is_static boolean correctly

---

### UNIT-07: Optimization Engine — Brightness & Noise Analyzers

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-07 |
| **Name** | Optimization Engine — Brightness and Noise Analyzers |
| **Description** | Compute luminance statistics and noise level via Laplacian variance |
| **Purpose** | Enable CRF adjustments for dark footage and noisy footage |
| **Dependencies** | UNIT-01 (OpenCV dependency) |
| **Files** | backend/app/ai/optimization_engine/brightness_analyzer.py, noise_estimator.py |
| **APIs** | Internal |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 4 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Dark footage (avg luminance < 60) flagged as is_dark
- Normal footage (avg 60-200) not flagged
- Clean footage returns noise_level < 0.3
- Grainy footage returns noise_level > 0.5
- Dynamic range computed correctly

**Acceptance Criteria**:
- [ ] Brightness: mean pixel intensity, dynamic range, is_dark flag
- [ ] Noise: Laplacian variance method, normalized 0-1 score
- [ ] Both handle empty input gracefully

---

### UNIT-08: Optimization Engine — Recommendation Engine

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-08 |
| **Name** | Optimization Engine — Recommendation Engine |
| **Description** | Combine all analyzer outputs to select compression profile and calculate CRF/bitrate/preset |
| **Purpose** | Core intelligence — produces the compression parameters used by FFmpeg |
| **Dependencies** | UNIT-04, UNIT-05, UNIT-06, UNIT-07 |
| **Files** | backend/app/ai/optimization_engine/recommendation_engine.py, engine.py |
| **APIs** | Internal |
| **AWS Services** | None |
| **Complexity** | High |
| **Estimated Time** | 6 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Low motion + low noise → MAX_STORAGE profile, CRF 28-32
- High motion + high complexity → MAX_QUALITY profile, CRF 18-22
- Average inputs → BALANCED profile, CRF 23-27
- Dark footage adds +2 to CRF
- Noisy footage subtracts -2 from CRF
- 4K footage subtracts -1 from CRF
- CRF clamped to [18, 35] range

**Acceptance Criteria**:
- [ ] Selects correct profile based on decision matrix
- [ ] CRF adjustments applied correctly
- [ ] Bitrate scales with resolution
- [ ] Output: CompressionRecommendation(crf, bitrate_kbps, preset, profile_name)

---

### UNIT-09: Compression Engine

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-09 |
| **Name** | Compression Engine (FFmpeg H.265) |
| **Description** | Execute FFmpeg H.265 encoding using recommended parameters, preserving FPS and duration |
| **Purpose** | Core compression — produces the optimized video file |
| **Dependencies** | UNIT-08 |
| **Files** | backend/app/services/compression_service.py, utils/ffmpeg.py |
| **APIs** | Internal |
| **AWS Services** | None |
| **Complexity** | High |
| **Estimated Time** | 8 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Compress 1080p MP4 with BALANCED profile produces valid H.265 output
- Output file is smaller than input (ratio > 0.3)
- FPS preserved (not reduced)
- Duration preserved (within 1 second)
- Audio preserved when present (codec copy)
- Handles files without audio (-an flag)
- FFmpeg failure returns appropriate error

**Acceptance Criteria**:
- [ ] Uses libx265 encoder
- [ ] Applies CRF, bitrate cap, preset from recommendation
- [ ] Does NOT alter FPS or duration
- [ ] Outputs valid MP4 with -movflags +faststart
- [ ] Returns CompressionResult with output path and metrics

---

### UNIT-10: Quality Verification

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-10 |
| **Name** | Quality Verification (SSIM + PSNR) |
| **Description** | Calculate structural similarity and peak signal-to-noise ratio between original and compressed video |
| **Purpose** | Verify compression quality meets threshold, provide quality metrics |
| **Dependencies** | UNIT-09 |
| **Files** | backend/app/services/quality_service.py |
| **APIs** | Internal |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 4 hours |
| **MVP** | Mandatory |

**Test Cases**:
- SSIM between identical files = 1.0
- SSIM for reasonable compression (CRF 25) > 0.85
- PSNR for reasonable compression > 30 dB
- Compression ratio calculated correctly
- Processing time tracked accurately

**Acceptance Criteria**:
- [ ] Uses FFmpeg ssim and psnr filters
- [ ] Returns QualityMetrics(ssim, psnr, ratio, time_ms)
- [ ] Flags quality_warning if SSIM < 0.85

---

### UNIT-11: S3 Storage Service

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-11 |
| **Name** | Amazon S3 Storage Service |
| **Description** | Upload original and optimized videos to S3 with tenant-scoped keys, generate presigned URLs |
| **Purpose** | Persistent cloud storage for all video assets |
| **Dependencies** | UNIT-01 |
| **Files** | backend/app/utils/s3.py, services/storage_service.py (S3 portion) |
| **APIs** | Internal (presigned URLs served via video endpoints) |
| **AWS Services** | Amazon S3 (PutObject, GetObject, DeleteObject, generate_presigned_url) |
| **Complexity** | Medium |
| **Estimated Time** | 4 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Upload file to S3 returns success with correct key
- Key follows pattern: {tenant_id}/original/{video_id}.{ext}
- Generate presigned URL with 1-hour expiry
- Delete object removes file from S3
- Non-existent key returns appropriate error

**Acceptance Criteria**:
- [ ] Tenant-scoped S3 key structure enforced
- [ ] SSE-S3 encryption applied automatically
- [ ] Presigned URLs expire after 3600 seconds
- [ ] Error handling for S3 failures (retry, exponential backoff)

---

### UNIT-12: DynamoDB Metadata Service

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-12 |
| **Name** | Amazon DynamoDB Metadata Service |
| **Description** | CRUD operations for video records in DynamoDB with tenant isolation via partition key |
| **Purpose** | Persist all video metadata, compression metrics, and quality scores |
| **Dependencies** | UNIT-01 |
| **Files** | backend/app/utils/dynamodb.py, services/storage_service.py (DynamoDB portion) |
| **APIs** | Internal |
| **AWS Services** | Amazon DynamoDB (PutItem, GetItem, Query, UpdateItem, DeleteItem) |
| **Complexity** | Medium |
| **Estimated Time** | 5 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Create video record with all required attributes
- Get video by tenant_id + video_id returns correct record
- Query by tenant_id returns only that tenant's videos
- Update status field works correctly
- Delete removes record
- Query with GSI (DateCameraIndex) returns filtered results

**Acceptance Criteria**:
- [ ] All schema attributes from TDS stored correctly
- [ ] Tenant isolation enforced (partition key = tenant_id)
- [ ] GSI queries for date-range and status work
- [ ] Error handling for throttling (exponential backoff)

---

### UNIT-13: Upload-to-Storage Pipeline Orchestration

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-13 |
| **Name** | End-to-End Processing Pipeline |
| **Description** | Orchestrate the full flow: upload → metadata → analyze → compress → verify → store (S3 + DynamoDB) |
| **Purpose** | Wire all backend components into a complete pipeline |
| **Dependencies** | UNIT-02, UNIT-03, UNIT-08, UNIT-09, UNIT-10, UNIT-11, UNIT-12 |
| **Files** | backend/app/services/upload_service.py (initiate_processing), services/notification_service.py |
| **APIs** | POST /api/upload triggers full pipeline |
| **AWS Services** | S3, DynamoDB |
| **Complexity** | High |
| **Estimated Time** | 6 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Upload MP4 → pipeline completes → status=completed in DynamoDB
- Pipeline failure → status=failed, error logged
- Retry on first failure, permanent fail on second
- All metrics stored (ratio, SSIM, PSNR, time)
- Original and optimized both in S3

**Acceptance Criteria**:
- [ ] Full pipeline runs sequentially without manual intervention
- [ ] State transitions: uploading → processing → completed/failed
- [ ] Temp files cleaned up after processing
- [ ] CloudWatch metric emitted on completion

---

### UNIT-14: Upload UI (Frontend)

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-14 |
| **Name** | Upload Page Frontend |
| **Description** | Drag-and-drop upload zone with progress bar, format validation, and processing status |
| **Purpose** | User-facing upload experience |
| **Dependencies** | UNIT-02 (backend API) |
| **Files** | frontend/src/pages/UploadPage.tsx, components/upload/DropZone.tsx, UploadProgress.tsx, FormatValidator.tsx; services/uploadService.ts, store/uploadStore.ts |
| **APIs** | POST /api/upload, GET /api/upload/{id}/status |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 8 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Drag file onto drop zone highlights area
- Drop valid MP4 triggers upload
- Drop invalid .txt shows error toast
- Progress bar updates during upload
- Status polling shows "Processing..." then "Complete"

**Acceptance Criteria**:
- [ ] Drag-and-drop works in Chrome, Firefox, Edge
- [ ] File picker button as alternative
- [ ] Client-side format + size validation before API call
- [ ] Progress percentage displayed
- [ ] Redirects to video detail on completion

---

## Milestone 3: Dashboard and Library

### UNIT-15: Dashboard API

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-15 |
| **Name** | Dashboard Metrics API |
| **Description** | Aggregate metrics (total saved, compression ratio, cost savings, retention improvement) from DynamoDB |
| **Purpose** | Power the home dashboard with real-time metrics |
| **Dependencies** | UNIT-12 |
| **Files** | backend/app/services/dashboard_service.py, routers/dashboard.py |
| **APIs** | GET /api/dashboard/summary, GET /api/dashboard/analytics |
| **AWS Services** | DynamoDB (Query) |
| **Complexity** | Medium |
| **Estimated Time** | 5 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Summary returns correct totals for tenant's videos
- Cost savings formula: (saved_bytes / 1GB) * $0.023
- Retention formula applied correctly
- Analytics returns time-series data by period (week/month)
- Empty tenant returns zero values (not errors)

**Acceptance Criteria**:
- [ ] Aggregates all completed video metrics per tenant
- [ ] Returns monthly/annual savings in USD
- [ ] Returns retention improvement in days
- [ ] Scoped to authenticated tenant only

---

### UNIT-16: Video List and Detail API

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-16 |
| **Name** | Video CRUD and Search API |
| **Description** | List videos (paginated), get video details, search by camera/date/name, delete video |
| **Purpose** | Backend for video library and detail pages |
| **Dependencies** | UNIT-12 |
| **Files** | backend/app/routers/videos.py, services/playback_service.py |
| **APIs** | GET /api/videos, GET /api/videos/{id}, DELETE /api/videos/{id}, GET /api/videos/search, GET /api/videos/{id}/stream |
| **AWS Services** | DynamoDB (Query), S3 (presigned URL) |
| **Complexity** | Medium |
| **Estimated Time** | 5 hours |
| **MVP** | Mandatory |

**Test Cases**:
- List returns paginated results (default 20 per page)
- Detail returns full metrics and streaming URLs
- Search by camera_id filters correctly
- Search by date range filters correctly
- Delete removes S3 objects + DynamoDB record
- Stream endpoint returns valid presigned URL

**Acceptance Criteria**:
- [ ] Pagination with page/page_size params
- [ ] Tenant-scoped queries only
- [ ] Presigned streaming URLs with 1-hour expiry
- [ ] 404 for non-existent video_id

---

### UNIT-17: Dashboard Frontend (Home Page)

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-17 |
| **Name** | Dashboard Home Page |
| **Description** | Display metric cards (storage saved, ratio, monthly savings, retention), recent uploads list, quick actions |
| **Purpose** | Primary landing page after login showing value metrics |
| **Dependencies** | UNIT-15, UNIT-01 |
| **Files** | frontend/src/pages/HomePage.tsx, components/dashboard/StatsOverview.tsx, RecentUploads.tsx, components/common/MetricCard.tsx; store/dashboardStore.ts, hooks/useDashboard.ts, services/dashboardService.ts |
| **APIs** | GET /api/dashboard/summary |
| **AWS Services** | None (frontend) |
| **Complexity** | Medium |
| **Estimated Time** | 6 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Page loads within 3 seconds
- Metric cards show formatted values (GB, $, %, days)
- Recent uploads list shows last 5 videos
- "Upload" quick action navigates to /upload

**Acceptance Criteria**:
- [ ] 4 metric cards with icons and formatted values
- [ ] Recent uploads with status badges
- [ ] Responsive layout (desktop + tablet)
- [ ] Loading skeleton during data fetch

---

### UNIT-18: Video Library Frontend

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-18 |
| **Name** | Video Library Page |
| **Description** | Grid display of all videos with thumbnails, search bar, filter panel, and pagination |
| **Purpose** | Browse and find stored videos |
| **Dependencies** | UNIT-16 |
| **Files** | frontend/src/pages/LibraryPage.tsx, components/library/VideoGrid.tsx, VideoCard.tsx, SearchBar.tsx, FilterPanel.tsx; store/videoStore.ts, hooks/useVideos.ts, services/videoService.ts |
| **APIs** | GET /api/videos, GET /api/videos/search |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 6 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Grid displays video cards with thumbnails
- Search filters results as user types
- Date filter returns correct range
- Pagination navigates between pages
- Empty state shows "No videos found"

**Acceptance Criteria**:
- [ ] Video cards show thumbnail, name, date, ratio badge
- [ ] Search by camera, date, name
- [ ] Responsive grid (3 cols desktop, 2 tablet, 1 mobile)
- [ ] Click card navigates to /video/:id

---

### UNIT-19: Video Detail Frontend

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-19 |
| **Name** | Video Detail Page |
| **Description** | Video player with metrics panel, savings display, and metadata |
| **Purpose** | Detailed view of a single video with all compression results |
| **Dependencies** | UNIT-16 |
| **Files** | frontend/src/pages/VideoDetailPage.tsx, components/player/VideoPlayer.tsx, MetricsPanel.tsx |
| **APIs** | GET /api/videos/{id}, GET /api/videos/{id}/stream |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 6 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Video plays using presigned URL
- Metrics panel displays all compression metrics
- Savings panel shows monthly/annual/retention
- Loading state while data fetches

**Acceptance Criteria**:
- [ ] HTML5 video player with controls
- [ ] All metrics from API displayed
- [ ] Formatted values (MB/GB, $, %, seconds)
- [ ] Responsive layout

---

## Milestone 4: AI Enhancement and Bedrock

### UNIT-20: Real-ESRGAN Enhancement Service

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-20 |
| **Name** | AI Enhancement Service (Real-ESRGAN) |
| **Description** | Load Real-ESRGAN model on GPU, extract frames from compressed video, enhance via 4x upscaling, reassemble into playable video |
| **Purpose** | Core AI differentiation — restore quality on demand |
| **Dependencies** | UNIT-11 (S3 for video retrieval) |
| **Files** | backend/app/ai/enhancement/real_esrgan.py, frame_processor.py, services/enhancement_service.py, routers/playback.py |
| **APIs** | POST /api/playback/{id}/enhance, GET /api/playback/{id}/enhanced |
| **AWS Services** | S3 (GetObject for input, PutObject for cached output) |
| **Complexity** | High |
| **Estimated Time** | 12 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Load model onto RTX 4060 without OOM
- Enhance single frame in < 500ms
- Enhance 30-second clip produces valid video output
- Enhanced video stored in S3 enhanced/ prefix
- GPU memory released after processing
- Handles non-existent video_id gracefully

**Acceptance Criteria**:
- [ ] RealESRGAN_x4plus model loads on CUDA device
- [ ] 4x upscaling applied per frame
- [ ] Output is playable H.264 MP4
- [ ] Enhancement cached in S3 for subsequent plays
- [ ] < 500ms per frame on RTX 4060

---

### UNIT-21: Enhancement UI (Player Toggle)

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-21 |
| **Name** | Enhanced Playback UI |
| **Description** | "AI Enhance" button on video detail page, quality toggle between original and enhanced views |
| **Purpose** | User-facing AI enhancement trigger and comparison |
| **Dependencies** | UNIT-19, UNIT-20 |
| **Files** | frontend/src/components/player/EnhanceButton.tsx, QualityToggle.tsx (updates to VideoDetailPage.tsx) |
| **APIs** | POST /api/playback/{id}/enhance, GET /api/playback/{id}/enhanced |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 5 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Click "AI Enhance" shows loading spinner
- After enhancement: toggle appears with Original/Enhanced
- Toggle switches video source without page reload
- If enhancement fails: show error notification

**Acceptance Criteria**:
- [ ] Button triggers enhancement API call
- [ ] Loading state during processing
- [ ] Seamless toggle between original and enhanced streams
- [ ] Error handling with user-friendly message

---

### UNIT-22: Amazon Bedrock Integration

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-22 |
| **Name** | Amazon Bedrock Business Summary Service |
| **Description** | Invoke Bedrock with video metrics to generate natural-language business summaries (per-video and aggregate) |
| **Purpose** | AI-generated ROI narratives for non-technical stakeholders |
| **Dependencies** | UNIT-12 (DynamoDB for metrics) |
| **Files** | backend/app/services/bedrock_service.py, routers/bedrock.py |
| **APIs** | POST /api/bedrock/summary/{id}, POST /api/bedrock/aggregate, GET /api/bedrock/summary/{id} |
| **AWS Services** | Amazon Bedrock (InvokeModel — Claude 3 Sonnet) |
| **Complexity** | Medium |
| **Estimated Time** | 6 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Per-video summary returns readable narrative with quantified savings
- Aggregate summary returns executive report
- Summary cached in DynamoDB after first generation
- Cached summary returned on subsequent GET
- Handles Bedrock timeout gracefully (return cached or error)

**Acceptance Criteria**:
- [ ] Prompt templates from TDS used correctly
- [ ] Summary includes GB saved, $ savings, retention days
- [ ] Response < 10 seconds
- [ ] Cache in DynamoDB bedrock_summary field

---

### UNIT-23: Bedrock Summary UI

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-23 |
| **Name** | Bedrock Summary Display Component |
| **Description** | "Generate Summary" button and formatted summary panel on video detail page |
| **Purpose** | Display AI-generated business insights to users |
| **Dependencies** | UNIT-19, UNIT-22 |
| **Files** | frontend/src/components/player/BedrockSummary.tsx, services/bedrockService.ts |
| **APIs** | POST /api/bedrock/summary/{id}, GET /api/bedrock/summary/{id} |
| **AWS Services** | None |
| **Complexity** | Low |
| **Estimated Time** | 3 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Click "Generate Summary" triggers API call
- Loading skeleton shown during generation
- Summary text displayed with proper formatting
- Cached summary loads instantly on revisit

**Acceptance Criteria**:
- [ ] Button triggers generation, shows loading state
- [ ] Formatted text panel with executive-friendly display
- [ ] Recommendation highlighted separately

---

## Milestone 5: Authentication and Enterprise

### UNIT-24: AWS Cognito Authentication

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-24 |
| **Name** | AWS Cognito Authentication Service |
| **Description** | Implement Cognito hosted UI login flow, token exchange, JWT validation middleware, refresh token logic |
| **Purpose** | Secure the application with enterprise SSO |
| **Dependencies** | UNIT-01 |
| **Files** | backend/app/services/auth_service.py, middleware/auth_middleware.py, middleware/tenant_middleware.py, routers/auth.py |
| **APIs** | POST /api/auth/login, POST /api/auth/callback, POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/me |
| **AWS Services** | Amazon Cognito (OAuth2 token endpoint, JWKS validation) |
| **Complexity** | High |
| **Estimated Time** | 8 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Login returns Cognito hosted UI redirect URL
- Callback exchanges code for tokens
- Valid JWT passes middleware
- Expired JWT returns 401
- Invalid JWT returns 401
- Refresh produces new access token
- tenant_id extracted from custom claims

**Acceptance Criteria**:
- [ ] RS256 JWT signature verification against Cognito JWKS
- [ ] Claims validated: iss, exp, token_use
- [ ] tenant_id and role extracted from custom claims
- [ ] Auth middleware applied to all /api/* routes except /health

---

### UNIT-25: RBAC and Tenant Isolation

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-25 |
| **Name** | Role-Based Access Control and Tenant Isolation |
| **Description** | Enforce Admin/Operator/Viewer permissions and ensure all data queries are scoped to tenant_id |
| **Purpose** | Multi-tenant security — organizations cannot access each other's data |
| **Dependencies** | UNIT-24 |
| **Files** | backend/app/middleware/tenant_middleware.py (enhanced), dependencies.py (get_current_user, get_tenant_id) |
| **APIs** | All protected endpoints |
| **AWS Services** | Cognito (groups → roles) |
| **Complexity** | Medium |
| **Estimated Time** | 5 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Viewer cannot call POST /api/upload (403)
- Operator can upload and view
- Admin can delete and manage users
- Tenant A cannot query Tenant B's videos
- Missing tenant_id in token returns 403

**Acceptance Criteria**:
- [ ] Role-based route protection
- [ ] All DynamoDB queries include tenant_id partition key
- [ ] All S3 keys prefixed with tenant_id
- [ ] Cross-tenant access returns 403

---

### UNIT-26: Auth Frontend

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-26 |
| **Name** | Authentication Frontend Flow |
| **Description** | Login page redirect to Cognito, callback handling, token storage, protected route wrapper, logout |
| **Purpose** | Frontend auth integration for secure access |
| **Dependencies** | UNIT-24 |
| **Files** | frontend/src/pages/LoginPage.tsx (updated), components/auth/LoginButton.tsx, AuthCallback.tsx, components/common/ProtectedRoute.tsx; services/authService.ts, store/authStore.ts, hooks/useAuth.ts |
| **APIs** | /api/auth/* |
| **AWS Services** | None (frontend) |
| **Complexity** | Medium |
| **Estimated Time** | 6 hours |
| **MVP** | Mandatory |

**Test Cases**:
- Login button redirects to Cognito hosted UI
- Callback stores tokens in memory
- Protected routes redirect unauthenticated users to /login
- Logout clears tokens and redirects
- Token refresh happens transparently

**Acceptance Criteria**:
- [ ] Token stored in memory (not localStorage)
- [ ] Axios interceptor attaches Bearer token to all API calls
- [ ] Auto-refresh before token expiry
- [ ] ProtectedRoute wraps all authenticated pages

---

## Milestone 6: Polish and Demo (Optional Units Included)

### UNIT-27: Analytics Page and Charts

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-27 |
| **Name** | Analytics Page with Charts |
| **Description** | Time-series charts for savings, compression trends, cost projections using Recharts |
| **Purpose** | Visual analytics for stakeholder presentations |
| **Dependencies** | UNIT-15, UNIT-17 |
| **Files** | frontend/src/pages/AnalyticsPage.tsx, components/analytics/CostSavingsChart.tsx, TrendAnalysis.tsx, ROIPanel.tsx, components/dashboard/SavingsChart.tsx, CompressionTrend.tsx |
| **APIs** | GET /api/dashboard/analytics |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 6 hours |
| **MVP** | Optional |

**Test Cases**:
- Charts render with real data from API
- Period selector (week/month/year) updates chart
- Empty data shows "No data" message
- Charts animate on page load

**Acceptance Criteria**:
- [ ] Line chart: cumulative savings over time
- [ ] Bar chart: compression ratio per video
- [ ] Cost projection chart
- [ ] Responsive on desktop and tablet

---

### UNIT-28: CloudWatch Monitoring Integration

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-28 |
| **Name** | CloudWatch Custom Metrics and Alarms |
| **Description** | Emit custom business metrics (VideosProcessed, CompressionRatio, StorageSaved, Errors) to CloudWatch |
| **Purpose** | Enterprise observability for production monitoring |
| **Dependencies** | UNIT-13 |
| **Files** | backend/app/utils/cloudwatch.py, services/notification_service.py |
| **APIs** | Internal (metric emission on pipeline events) |
| **AWS Services** | Amazon CloudWatch (PutMetricData) |
| **Complexity** | Low |
| **Estimated Time** | 3 hours |
| **MVP** | Optional |

**Test Cases**:
- Metric emitted on successful video processing
- Metric emitted on processing failure
- Custom namespace "VisionVault" used
- Dimensions include tenant_id

**Acceptance Criteria**:
- [ ] Metrics visible in CloudWatch console
- [ ] Dimensions allow per-tenant filtering
- [ ] Error count metric for alerting

---

### UNIT-29: Thumbnail Generation

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-29 |
| **Name** | Video Thumbnail Generation |
| **Description** | Extract frame at 10% duration, resize to 320x180, save as JPEG, upload to S3 |
| **Purpose** | Visual previews for video library cards |
| **Dependencies** | UNIT-09, UNIT-11 |
| **Files** | backend/app/services/compression_service.py (thumbnail function added) |
| **APIs** | Internal (generated during pipeline, served via presigned URL) |
| **AWS Services** | S3 (PutObject for thumbnail) |
| **Complexity** | Low |
| **Estimated Time** | 2 hours |
| **MVP** | Optional |

**Test Cases**:
- Thumbnail generated for processed video
- Output is 320x180 JPEG
- Stored at {tenant}/thumbnails/{id}_thumb.jpg
- Presigned URL works for display

**Acceptance Criteria**:
- [ ] Frame extracted at 10% of duration
- [ ] Resized to 320x180 maintaining aspect
- [ ] JPEG quality 80
- [ ] S3 key follows convention

---

### UNIT-30: Sidebar Navigation and Layout

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-30 |
| **Name** | Application Layout with Sidebar |
| **Description** | Persistent sidebar navigation, header with user info, notification toast system |
| **Purpose** | Professional enterprise UI shell |
| **Dependencies** | UNIT-01 |
| **Files** | frontend/src/components/common/Sidebar.tsx, Header.tsx, NotificationToast.tsx, components/layouts/MainLayout.tsx; store/uiStore.ts |
| **APIs** | None |
| **AWS Services** | None |
| **Complexity** | Medium |
| **Estimated Time** | 5 hours |
| **MVP** | Optional |

**Test Cases**:
- Sidebar shows all navigation links
- Active page highlighted in sidebar
- Header shows user name and role
- Notification toasts appear and auto-dismiss
- Sidebar collapsible on tablet

**Acceptance Criteria**:
- [ ] Navigation: Home, Upload, Library, Analytics, Settings
- [ ] Active state indication
- [ ] Responsive collapse behavior
- [ ] Toast notifications for success/error events

---

### UNIT-31: Settings Page

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-31 |
| **Name** | Settings and User Management Page |
| **Description** | Tenant settings, default compression profile selection, user list (Admin only) |
| **Purpose** | Administrative controls for tenant admins |
| **Dependencies** | UNIT-25 |
| **Files** | frontend/src/pages/SettingsPage.tsx, components/settings/ProfileSettings.tsx, CompressionDefaults.tsx |
| **APIs** | GET /api/settings, PUT /api/settings |
| **AWS Services** | None |
| **Complexity** | Low |
| **Estimated Time** | 4 hours |
| **MVP** | Optional |

**Test Cases**:
- Only Admin role can access settings
- Compression default selection saved
- User list displays tenant members
- Non-admin gets redirected/blocked

**Acceptance Criteria**:
- [ ] Admin-only access enforced
- [ ] Default compression profile selectable
- [ ] User list with roles displayed

---

### UNIT-32: Demo Data Seeding and Preparation

| Attribute | Value |
|---|---|
| **Unit ID** | UNIT-32 |
| **Name** | Demo Data Seeding Script |
| **Description** | Script to create demo tenants, users in Cognito, pre-process sample videos, seed DynamoDB with metrics |
| **Purpose** | Ensure demo readiness with pre-loaded data |
| **Dependencies** | All previous units |
| **Files** | scripts/seed_demo_data.py, scripts/setup_aws.py |
| **APIs** | Internal (uses services directly) |
| **AWS Services** | Cognito (AdminCreateUser), S3 (upload), DynamoDB (PutItem) |
| **Complexity** | Medium |
| **Estimated Time** | 4 hours |
| **MVP** | Optional |

**Test Cases**:
- Script creates 2 demo tenants (Acme Bank, Metro Airport)
- Script creates 3 users per tenant (Admin, Operator, Viewer)
- Script uploads 3-5 pre-processed videos
- Script seeds DynamoDB with complete records
- Script is idempotent (can run multiple times)

**Acceptance Criteria**:
- [ ] Demo data ready after single script run
- [ ] All users can log in via Cognito
- [ ] Dashboard shows meaningful metrics
- [ ] Videos playable from library

---

## Parallel Development Tracks

| Track | Units | Can Develop Simultaneously With |
|---|---|---|
| **Track A: Backend Pipeline** | UNIT-02, 03, 04, 05, 06, 07, 08, 09, 10, 13 | Track B, Track C |
| **Track B: AWS Integration** | UNIT-11, 12 | Track A, Track C |
| **Track C: Frontend UI** | UNIT-14, 17, 18, 19 | Track A, Track B |
| **Track D: AI/Intelligence** | UNIT-20, 21, 22, 23 | Track E (after pipeline complete) |
| **Track E: Auth/Security** | UNIT-24, 25, 26 | Track D |
| **Track F: Polish** | UNIT-27, 28, 29, 30, 31, 32 | After Tracks A-E |

---

## Critical Path

The critical path is the longest chain of sequentially dependent units:

```
UNIT-01 → UNIT-02 → UNIT-03 → UNIT-04/05/06/07 → UNIT-08 → UNIT-09 → UNIT-10 → UNIT-13 → UNIT-20 → UNIT-21
```

**Critical Path Duration**: ~63 hours of sequential work

**Critical Path Units** (16 total):
1. UNIT-01: Foundation (COMPLETED)
2. UNIT-02: Upload API
3. UNIT-03: Metadata Extraction
4. UNIT-04: Metadata Analyzer
5. UNIT-05: Scene Analyzer
6. UNIT-06: Motion Estimator
7. UNIT-07: Brightness/Noise Analyzers
8. UNIT-08: Recommendation Engine
9. UNIT-09: Compression Engine
10. UNIT-10: Quality Verification
11. UNIT-11: S3 Storage
12. UNIT-12: DynamoDB Service
13. UNIT-13: Pipeline Orchestration
14. UNIT-20: Real-ESRGAN Enhancement
15. UNIT-22: Bedrock Integration
16. UNIT-24: Cognito Authentication

---

## MVP vs Optional Classification

### Mandatory for MVP (22 units)

| Unit | Name | Milestone |
|---|---|---|
| UNIT-01 | Foundation (COMPLETED) | M1 |
| UNIT-02 | Upload API | M2 |
| UNIT-03 | Metadata Extraction | M2 |
| UNIT-04 | Metadata Analyzer | M2 |
| UNIT-05 | Scene Analyzer | M2 |
| UNIT-06 | Motion Estimator | M2 |
| UNIT-07 | Brightness/Noise | M2 |
| UNIT-08 | Recommendation Engine | M2 |
| UNIT-09 | Compression Engine | M2 |
| UNIT-10 | Quality Verification | M2 |
| UNIT-11 | S3 Storage | M2 |
| UNIT-12 | DynamoDB Service | M2 |
| UNIT-13 | Pipeline Orchestration | M2 |
| UNIT-14 | Upload UI | M2 |
| UNIT-15 | Dashboard API | M3 |
| UNIT-16 | Video List/Detail API | M3 |
| UNIT-17 | Dashboard Frontend | M3 |
| UNIT-18 | Video Library Frontend | M3 |
| UNIT-19 | Video Detail Frontend | M3 |
| UNIT-20 | Real-ESRGAN Enhancement | M4 |
| UNIT-21 | Enhancement UI | M4 |
| UNIT-22 | Bedrock Integration | M4 |
| UNIT-23 | Bedrock Summary UI | M4 |
| UNIT-24 | Cognito Authentication | M5 |
| UNIT-25 | RBAC + Tenant Isolation | M5 |
| UNIT-26 | Auth Frontend | M5 |

### Optional / Nice-to-Have (6 units)

| Unit | Name | Rationale for Optional |
|---|---|---|
| UNIT-27 | Analytics Charts | Demo works without trend charts |
| UNIT-28 | CloudWatch Metrics | Monitoring is post-MVP |
| UNIT-29 | Thumbnail Generation | Library works with placeholder icons |
| UNIT-30 | Sidebar/Layout | Basic routing works without full layout |
| UNIT-31 | Settings Page | Demo doesn't need admin settings |
| UNIT-32 | Demo Data Seeding | Can seed manually if needed |

---

## Unit Dependency Matrix

```
UNIT-01 (Foundation) ─────────────────────────────────────────────┐
    |           |              |              |                    |
    v           v              v              v                    v
UNIT-02     UNIT-05       UNIT-06       UNIT-07              UNIT-24
(Upload)    (Scene)       (Motion)      (Bright/Noise)       (Cognito)
    |           |              |              |                    |
    v           +──────────────+──────────────+                   v
UNIT-03                        |                             UNIT-25
(Metadata)                     v                             (RBAC)
    |                      UNIT-08                                |
    v                      (Recommend)                            v
UNIT-04                        |                             UNIT-26
(Meta Analyzer)                v                             (Auth UI)
    |                      UNIT-09
    +──────────────────────(Compress)
                               |
                               v
                           UNIT-10
                           (Quality)
                               |
         +────────+────────────+────────────+
         |        |                         |
         v        v                         v
     UNIT-11  UNIT-12                   UNIT-29
     (S3)     (DynamoDB)                (Thumbnails)
         |        |
         +────+───+
              |
              v
          UNIT-13 ─────────────────────────────────────┐
          (Pipeline)                                    |
              |           |             |               |
              v           v             v               v
          UNIT-14     UNIT-15       UNIT-16         UNIT-28
          (Upload UI) (Dashboard)   (Video API)     (CloudWatch)
                          |             |
                          v             v
                      UNIT-17       UNIT-18
                      (Home UI)     (Library UI)
                                        |
                                        v
                                    UNIT-19
                                    (Detail UI)
                                        |
              +─────────────────────────+─────────────────┐
              |                         |                  |
              v                         v                  v
          UNIT-20                   UNIT-22            UNIT-30
          (Enhancement)             (Bedrock)          (Layout)
              |                         |
              v                         v
          UNIT-21                   UNIT-23
          (Enhance UI)              (Summary UI)
                                                      UNIT-27
                                                      (Analytics)
                                                      UNIT-31
                                                      (Settings)
                                                      UNIT-32
                                                      (Demo Seed)
```

---

## Implementation Summary

| Metric | Value |
|---|---|
| Total Units | 28 (excluding completed UNIT-01) |
| Mandatory Units | 22 |
| Optional Units | 6 |
| Critical Path Length | 16 units |
| Critical Path Hours | ~63 hours |
| Total Estimated Hours | ~155 hours |
| Parallel Tracks | 4 (during Milestone 2-3) |
| Maximum Parallelism | 3 units simultaneously |

---

## Document Approval

| Role | Name | Date | Status |
|---|---|---|---|
| Product Owner | - | - | Pending |
| Technical Lead | - | - | Pending |

---

*End of Units Generation Document*

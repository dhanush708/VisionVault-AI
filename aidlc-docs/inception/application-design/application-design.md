# VisionVault AI — Application Design Document

**Document Version**: 1.0  
**Date**: 2026-06-25  
**Project**: VisionVault AI  
**Methodology**: AWS AI-DLC (AI-Driven Development Life Cycle)  
**Phase**: INCEPTION — Application Design  
**Status**: Draft — Pending Approval

---

## 1. High-Level Architecture

### Architecture Style
**Modular Monolith** — A single deployable application with clearly separated internal modules, running locally on a developer laptop with GPU for hackathon demonstration. AWS services handle cloud-native concerns (storage, auth, metadata, AI summaries, monitoring).

### Architecture Rationale
- Hackathon MVP — fast development, single deployment target
- Local GPU required for Real-ESRGAN — cannot be serverless
- Clear module boundaries enable future microservice extraction
- FastAPI backend serves both API and orchestrates processing

### System Context

```
+-------------------------------------------------------------------+
|                         User Browser                               |
|                  (React + TypeScript + Tailwind)                   |
+-------------------------------------------------------------------+
                              |
                              | HTTPS (localhost:5173 -> :8000)
                              v
+-------------------------------------------------------------------+
|                       FastAPI Backend                              |
|                      (localhost:8000)                              |
|                                                                   |
|  +------------+  +-------------+  +-----------+  +-------------+ |
|  | Auth       |  | Upload      |  | Dashboard |  | Playback    | |
|  | Module     |  | Module      |  | Module    |  | Module      | |
|  +------------+  +-------------+  +-----------+  +-------------+ |
|  +------------+  +-------------+  +-----------+  +-------------+ |
|  | Metadata   |  | Optimization|  | Storage   |  | Bedrock     | |
|  | Module     |  | Engine      |  | Module    |  | Module      | |
|  +------------+  +-------------+  +-----------+  +-------------+ |
|  +------------+  +-------------+                                  |
|  | Quality    |  | AI Enhance  |                                  |
|  | Module     |  | Module      |                                  |
|  +------------+  +-------------+                                  |
+-------------------------------------------------------------------+
         |              |              |              |
         v              v              v              v
+----------+  +----------+  +----------+  +----------+
| Cognito  |  | S3       |  | DynamoDB |  | Bedrock  |
+----------+  +----------+  +----------+  +----------+
                                                      
+----------+  +----------+                            
| CloudWatch| | Lambda   |                            
+----------+  +----------+                            
```

---

## 2. Component Diagram

### Component Inventory

| Component | Layer | Responsibility | Dependencies |
|---|---|---|---|
| Auth Module | Backend | Cognito integration, JWT validation, RBAC | AWS Cognito |
| Upload Module | Backend | File reception, validation, progress tracking | Storage Module |
| Metadata Module | Backend | FFprobe extraction, metadata parsing | Upload Module |
| Optimization Engine | Backend/AI | Video analysis, compression strategy | Metadata Module, FFmpeg |
| Compression Engine | Backend | H.265 encoding via FFmpeg | Optimization Engine |
| Quality Module | Backend | SSIM/PSNR calculation, verification | Compression Engine |
| Storage Module | Backend | S3 upload/download, DynamoDB CRUD | AWS S3, DynamoDB |
| Dashboard Module | Backend | Metrics aggregation, analytics API | Storage Module |
| Playback Module | Backend | Video streaming, frame serving | Storage Module |
| AI Enhancement Module | Backend/AI | Real-ESRGAN inference, frame upscaling | PyTorch, GPU |
| Bedrock Module | Backend | Business summary generation | AWS Bedrock |
| Notification Module | Backend | Processing status, error alerts | All processing modules |

### Component Communication Pattern

```
Upload Module
    |
    v
Metadata Module (FFprobe)
    |
    v
Optimization Engine
    |--- Metadata Analyzer
    |--- Scene Analyzer
    |--- Motion Estimator
    |--- Brightness Analyzer
    |--- Noise Estimator
    |--- Compression Recommendation Engine
    |
    v
Compression Engine (FFmpeg H.265)
    |
    v
Quality Module (SSIM + PSNR)
    |
    v
Storage Module (S3 + DynamoDB)
    |
    v
Dashboard Module (Metrics + Analytics)

[Parallel Path - On User Request]
Storage Module --> Playback Module --> AI Enhancement Module (Real-ESRGAN)

[Parallel Path - On User Request]
Storage Module --> Bedrock Module --> Business Summary
```

---

## 3. Project Folder Structure

```
visionvault-ai/
|
|--- frontend/
|    |--- src/
|    |    |--- components/
|    |    |    |--- common/          # Shared UI components
|    |    |    |--- upload/          # Upload drag-drop, progress
|    |    |    |--- dashboard/       # Metrics cards, charts
|    |    |    |--- player/          # Video player, enhance toggle
|    |    |    |--- library/         # Video list, search, filters
|    |    |    |--- analytics/       # Aggregate reports
|    |    |    |--- settings/        # User and tenant settings
|    |    |    |--- auth/            # Login, protected routes
|    |    |--- pages/
|    |    |    |--- HomePage.tsx
|    |    |    |--- UploadPage.tsx
|    |    |    |--- LibraryPage.tsx
|    |    |    |--- VideoDetailPage.tsx
|    |    |    |--- AnalyticsPage.tsx
|    |    |    |--- SettingsPage.tsx
|    |    |    |--- LoginPage.tsx
|    |    |--- services/
|    |    |    |--- api.ts            # Axios/fetch API client
|    |    |    |--- auth.ts           # Cognito auth service
|    |    |    |--- upload.ts         # Upload service
|    |    |    |--- video.ts          # Video operations
|    |    |--- hooks/                 # Custom React hooks
|    |    |--- types/                 # TypeScript interfaces
|    |    |--- utils/                 # Helper functions
|    |    |--- store/                 # Zustand state stores
|    |    |--- App.tsx
|    |    |--- main.tsx
|    |--- public/
|    |--- index.html
|    |--- vite.config.ts
|    |--- tailwind.config.js
|    |--- tsconfig.json
|    |--- package.json
|
|--- backend/
|    |--- app/
|    |    |--- main.py               # FastAPI app entry point
|    |    |--- config.py             # Configuration and env vars
|    |    |--- dependencies.py       # Dependency injection
|    |    |--- routers/
|    |    |    |--- auth.py          # Auth endpoints
|    |    |    |--- upload.py        # Upload endpoints
|    |    |    |--- videos.py        # Video CRUD endpoints
|    |    |    |--- dashboard.py     # Dashboard/metrics endpoints
|    |    |    |--- playback.py      # Playback/enhancement endpoints
|    |    |    |--- bedrock.py       # Business summary endpoints
|    |    |--- services/
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
|    |    |    |--- video.py         # Video data models
|    |    |    |--- metadata.py      # Metadata models
|    |    |    |--- metrics.py       # Compression metrics models
|    |    |    |--- user.py          # User/tenant models
|    |    |    |--- summary.py       # Business summary models
|    |    |--- schemas/
|    |    |    |--- requests.py      # API request schemas
|    |    |    |--- responses.py     # API response schemas
|    |    |--- middleware/
|    |    |    |--- auth_middleware.py    # JWT validation
|    |    |    |--- tenant_middleware.py  # Tenant isolation
|    |    |    |--- logging_middleware.py # Request logging
|    |    |--- utils/
|    |    |    |--- ffmpeg.py        # FFmpeg wrapper
|    |    |    |--- ffprobe.py       # FFprobe wrapper
|    |    |    |--- s3.py            # S3 operations
|    |    |    |--- dynamodb.py      # DynamoDB operations
|    |    |    |--- cloudwatch.py    # CloudWatch metrics
|    |    |--- ai/
|    |    |    |--- optimization_engine/
|    |    |    |    |--- __init__.py
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
|    |--- tests/
|    |    |--- test_upload.py
|    |    |--- test_compression.py
|    |    |--- test_quality.py
|    |    |--- test_optimization.py
|    |    |--- test_enhancement.py
|    |    |--- test_bedrock.py
|    |    |--- test_auth.py
|    |--- requirements.txt
|    |--- pyproject.toml
|
|--- models/                         # AI model weights
|    |--- realesrgan/
|    |    |--- RealESRGAN_x4plus.pth
|
|--- scripts/
|    |--- setup_aws.py               # AWS resource provisioning
|    |--- seed_data.py               # Demo data seeding
|
|--- docs/                           # Additional documentation
|--- .env.example                    # Environment template
|--- .gitignore
|--- README.md
```

---

## 4. Frontend Architecture

### Technology Stack
| Concern | Choice | Rationale |
|---|---|---|
| Framework | React 18+ | Component-based, rich ecosystem |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS | Rapid UI development, utility-first |
| Build Tool | Vite | Fast HMR, ESBuild bundler |
| State | Zustand | Lightweight, no boilerplate |
| HTTP Client | Axios | Interceptors for auth tokens |
| Video Player | Video.js | Extensible, handles multiple formats |
| Charts | Recharts | React-native charting library |
| Routing | React Router v6 | Standard SPA routing |
| Auth | AWS Amplify (Cognito) | Official AWS SDK for frontend auth |

### Page Architecture

| Page | Route | Components | Data Source |
|---|---|---|---|
| Home | `/` | StatsOverview, RecentUploads, QuickActions | GET /api/dashboard/summary |
| Upload | `/upload` | DropZone, UploadProgress, FormatValidator | POST /api/upload |
| Video Library | `/library` | VideoGrid, SearchBar, FilterPanel, Pagination | GET /api/videos |
| Video Details | `/video/:id` | VideoPlayer, MetricsPanel, EnhanceButton, Summary | GET /api/videos/:id |
| Analytics | `/analytics` | SavingsChart, TrendChart, RetentionChart, ROI | GET /api/dashboard/analytics |
| Settings | `/settings` | ProfileSettings, TenantSettings, Preferences | GET /api/settings |
| Login | `/login` | CognitoHostedUI redirect | AWS Cognito |

### State Management Strategy

```
Global State (Zustand):
  |--- authStore: user, token, tenant, roles
  |--- videoStore: videoList, currentVideo, filters
  |--- uploadStore: uploadProgress, uploadQueue
  |--- dashboardStore: metrics, charts, summaries
  |--- uiStore: theme, sidebar, notifications
```

### Frontend Component Hierarchy

```
App
|--- AuthProvider (Cognito context)
|    |--- ProtectedRoute (RBAC guard)
|         |--- Layout
|              |--- Sidebar (navigation)
|              |--- Header (user info, notifications)
|              |--- MainContent
|                   |--- [Page Components]
|              |--- NotificationToast
```

---

## 5. Backend Architecture

### Technology Stack
| Concern | Choice | Rationale |
|---|---|---|
| Framework | FastAPI | Async, auto-docs, Python ecosystem |
| Runtime | Python 3.11+ | Latest stable with performance improvements |
| Server | Uvicorn | ASGI server, async support |
| Validation | Pydantic v2 | Schema validation, serialization |
| Video Tools | FFmpeg + FFprobe | Industry standard transcoding |
| Computer Vision | OpenCV | Frame extraction, image analysis |
| AI Framework | PyTorch | Real-ESRGAN model runtime |
| AWS SDK | boto3 | Official AWS Python SDK |
| Auth | python-jose | JWT token validation |
| Testing | pytest + httpx | Async test client |

### Backend Module Architecture

```
FastAPI App (main.py)
|
|--- Middleware Layer
|    |--- CORSMiddleware
|    |--- AuthMiddleware (JWT validation)
|    |--- TenantMiddleware (tenant_id injection)
|    |--- LoggingMiddleware (request/response logging)
|    |--- RateLimitMiddleware
|
|--- Router Layer (API Endpoints)
|    |--- /api/auth/*
|    |--- /api/upload/*
|    |--- /api/videos/*
|    |--- /api/dashboard/*
|    |--- /api/playback/*
|    |--- /api/bedrock/*
|
|--- Service Layer (Business Logic)
|    |--- AuthService
|    |--- UploadService
|    |--- MetadataService
|    |--- OptimizationService
|    |--- CompressionService
|    |--- QualityService
|    |--- StorageService
|    |--- DashboardService
|    |--- PlaybackService
|    |--- EnhancementService
|    |--- BedrockService
|    |--- NotificationService
|
|--- AI Layer
|    |--- OptimizationEngine (6 analyzers + recommender)
|    |--- EnhancementEngine (Real-ESRGAN)
|
|--- Data Access Layer
|    |--- S3Client (video file operations)
|    |--- DynamoDBClient (metadata CRUD)
|    |--- CognitoClient (user management)
|    |--- BedrockClient (LLM invocation)
|    |--- CloudWatchClient (metrics/logs)
```

### Request Processing Flow

```
HTTP Request
    |
    v
[CORS] --> [Auth Middleware] --> [Tenant Middleware] --> [Logging]
    |
    v
Router (endpoint matching)
    |
    v
Service Layer (business logic orchestration)
    |
    v
AI Layer / Data Access Layer (as needed)
    |
    v
Response serialization (Pydantic)
    |
    v
HTTP Response
```

---

## 6. AI Module Architecture

### 6.1 VisionVault Optimization Engine

The optimization engine is a **modular pipeline** of 6 independent analyzers feeding a recommendation engine:

```
Input: Raw Video File + FFprobe Metadata
    |
    v
+-----------------------------------------------------+
|           OPTIMIZATION ENGINE                       |
|                                                     |
|  +------------------+  +---------------------+     |
|  | Metadata         |  | Scene Analyzer      |     |
|  | Analyzer         |  | (keyframe detection,|     |
|  | (resolution,     |  |  scene complexity)  |     |
|  |  codec, bitrate) |  +---------------------+     |
|  +------------------+                               |
|                                                     |
|  +------------------+  +---------------------+     |
|  | Motion           |  | Brightness          |     |
|  | Estimator        |  | Analyzer            |     |
|  | (frame diff,     |  | (luminance stats,   |     |
|  |  optical flow)   |  |  dynamic range)     |     |
|  +------------------+  +---------------------+     |
|                                                     |
|  +------------------+                               |
|  | Noise Estimator  |                               |
|  | (signal-to-noise |                               |
|  |  ratio, grain)   |                               |
|  +------------------+                               |
|         |                                           |
|         v                                           |
|  +---------------------------------------------+   |
|  | Compression Recommendation Engine            |   |
|  | Input: All analyzer outputs                  |   |
|  | Output: CRF, Bitrate, Encoder Preset         |   |
|  +---------------------------------------------+   |
+-----------------------------------------------------+
    |
    v
Output: CompressionRecommendation(crf, bitrate, preset, profile)
```

#### Analyzer Specifications

| Analyzer | Input | Output | Method |
|---|---|---|---|
| Metadata Analyzer | FFprobe JSON | resolution, fps, codec, bitrate, duration, has_audio | JSON parsing |
| Scene Analyzer | Sample frames (every 30th) | scene_complexity_score (0-1), keyframe_count | OpenCV histogram comparison |
| Motion Estimator | Consecutive frame pairs | motion_score (0-1), is_static | Frame differencing (OpenCV) |
| Brightness Analyzer | Sample frames | avg_luminance, dynamic_range, is_dark | Pixel intensity statistics |
| Noise Estimator | Sample frames | noise_level (0-1), snr_db | Laplacian variance method |
| Recommendation Engine | All analyzer outputs | CRF, bitrate_kbps, preset, profile_name | Rule-based decision matrix |

#### Compression Profiles

| Profile | CRF Range | Bitrate Strategy | Preset | Use Case |
|---|---|---|---|---|
| Maximum Storage | 28-32 | Low bitrate cap | medium | Archival footage, low-motion scenes |
| Balanced | 23-27 | Adaptive bitrate | medium | Standard surveillance footage |
| Maximum Quality | 18-22 | High bitrate floor | slow | High-value footage, complex scenes |

#### Recommendation Logic (Decision Matrix)

```
IF motion_score < 0.3 AND noise_level < 0.3:
    Profile = Maximum Storage (static, clean footage)
ELIF motion_score > 0.7 OR scene_complexity > 0.7:
    Profile = Maximum Quality (complex/high-motion footage)
ELSE:
    Profile = Balanced (standard surveillance)

CRF adjustments:
    +2 if is_dark (dark footage compresses better)
    -2 if noise_level > 0.5 (noisy footage needs more bits)
    -1 if resolution >= 4K (preserve detail at high res)
```

### 6.2 AI Enhancement Module (Real-ESRGAN)

```
Enhancement Flow (On-Demand):

User clicks "AI Enhance" button
    |
    v
Backend receives enhancement request (video_id, frame_range)
    |
    v
Load compressed video from S3 (or local cache)
    |
    v
Extract frames using OpenCV (target segment)
    |
    v
Real-ESRGAN GPU Inference (RTX 4060)
    |--- Model: RealESRGAN_x4plus.pth
    |--- Scale: 4x upscaling
    |--- Input: compressed frame (e.g., 480p)
    |--- Output: enhanced frame (e.g., 1920p)
    |
    v
Reassemble enhanced frames into video stream
    |
    v
Serve enhanced video to frontend player
```

**Enhancement Mode (MVP)**: On-demand enhancement triggered by user clicking "AI Enhance" button. Not continuous real-time processing of every frame. This reduces GPU load and provides a clear before/after comparison.

**Performance Target**: < 500ms per frame on RTX 4060 at 720p input resolution.

---

## 7. Database Schema

### DynamoDB Table Design

**Table Name**: `visionvault-videos`

| Attribute | Type | Key | Description |
|---|---|---|---|
| tenant_id | String | Partition Key | Organization identifier |
| video_id | String | Sort Key | Unique video identifier (UUID) |
| file_name | String | - | Original filename |
| upload_timestamp | String (ISO) | GSI-PK | Upload time |
| camera_id | String | GSI-SK | Camera identifier |
| status | String | - | processing/completed/failed |
| original_format | String | - | Input format (MP4/AVI/MOV/MKV) |
| original_codec | String | - | Input codec |
| original_size_bytes | Number | - | Original file size |
| optimized_size_bytes | Number | - | Compressed file size |
| duration_seconds | Number | - | Video duration |
| resolution_width | Number | - | Frame width |
| resolution_height | Number | - | Frame height |
| fps | Number | - | Frames per second |
| bitrate_kbps | Number | - | Original bitrate |
| has_audio | Boolean | - | Audio track present |
| compression_ratio | Number | - | Ratio (0-1) |
| compression_profile | String | - | max_storage/balanced/max_quality |
| crf_used | Number | - | CRF value applied |
| ssim_score | Number | - | Quality score (0-1) |
| psnr_db | Number | - | Quality in decibels |
| processing_time_ms | Number | - | Time to compress |
| s3_original_key | String | - | S3 path to original |
| s3_optimized_key | String | - | S3 path to optimized |
| storage_saved_bytes | Number | - | Bytes saved |
| estimated_cost_savings_usd | Number | - | Monthly cost savings |
| retention_improvement_days | Number | - | Additional retention |
| bedrock_summary | String | - | Cached business summary |
| created_at | String (ISO) | - | Record creation time |
| updated_at | String (ISO) | - | Last modification |

**Global Secondary Index (GSI-1)**: `upload_timestamp` (PK) + `camera_id` (SK)  
Purpose: Query by date range and camera

**Global Secondary Index (GSI-2)**: `tenant_id` (PK) + `status` (SK)  
Purpose: Query processing status per tenant

### S3 Bucket Structure

```
visionvault-storage-{account-id}/
|
|--- {tenant_id}/
|    |--- original/
|    |    |--- {video_id}.{ext}        # Original uploaded file
|    |--- optimized/
|    |    |--- {video_id}.mp4          # H.265 optimized file
|    |--- enhanced/
|    |    |--- {video_id}_enhanced.mp4 # AI-enhanced (cached, optional)
|    |--- thumbnails/
|         |--- {video_id}_thumb.jpg    # Preview thumbnail
```

---

## 8. API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /api/auth/login | Initiate Cognito login flow | Public |
| POST | /api/auth/callback | Handle Cognito OAuth callback | Public |
| POST | /api/auth/refresh | Refresh access token | Public |
| POST | /api/auth/logout | Invalidate session | Authenticated |
| GET | /api/auth/me | Get current user profile | Authenticated |

### Upload Endpoints

| Method | Endpoint | Description | Auth | Role |
|---|---|---|---|---|
| POST | /api/upload | Upload video file (multipart) | Authenticated | Operator+ |
| GET | /api/upload/{upload_id}/status | Get upload/processing status | Authenticated | Operator+ |

### Video Endpoints

| Method | Endpoint | Description | Auth | Role |
|---|---|---|---|---|
| GET | /api/videos | List videos (paginated, filtered) | Authenticated | All |
| GET | /api/videos/{video_id} | Get video details + metrics | Authenticated | All |
| DELETE | /api/videos/{video_id} | Delete video and storage | Authenticated | Admin |
| GET | /api/videos/{video_id}/stream | Stream optimized video | Authenticated | All |
| GET | /api/videos/search | Search by camera, date, name | Authenticated | All |

### Dashboard Endpoints

| Method | Endpoint | Description | Auth | Role |
|---|---|---|---|---|
| GET | /api/dashboard/summary | Aggregate metrics summary | Authenticated | All |
| GET | /api/dashboard/analytics | Detailed analytics data | Authenticated | All |
| GET | /api/dashboard/savings | Cost savings breakdown | Authenticated | Admin |

### Playback and Enhancement Endpoints

| Method | Endpoint | Description | Auth | Role |
|---|---|---|---|---|
| POST | /api/playback/{video_id}/enhance | Trigger AI enhancement | Authenticated | Operator+ |
| GET | /api/playback/{video_id}/enhanced | Stream enhanced video | Authenticated | All |
| GET | /api/playback/{video_id}/compare | Side-by-side comparison data | Authenticated | All |

### Bedrock Endpoints

| Method | Endpoint | Description | Auth | Role |
|---|---|---|---|---|
| POST | /api/bedrock/summary/{video_id} | Generate per-video summary | Authenticated | Operator+ |
| POST | /api/bedrock/aggregate | Generate aggregate report | Authenticated | Admin |
| GET | /api/bedrock/summary/{video_id} | Get cached summary | Authenticated | All |

### Settings Endpoints

| Method | Endpoint | Description | Auth | Role |
|---|---|---|---|---|
| GET | /api/settings | Get tenant settings | Authenticated | Admin |
| PUT | /api/settings | Update tenant settings | Authenticated | Admin |
| GET | /api/settings/users | List tenant users | Authenticated | Admin |

---

## 9. Request/Response Models

### Upload Request
```
POST /api/upload
Content-Type: multipart/form-data

Fields:
  file: Binary (video file, max 2 GB)
  camera_id: String (optional, user-provided)
  description: String (optional)
```

### Upload Response
```json
{
  "video_id": "uuid-string",
  "status": "processing",
  "file_name": "parking_lot_cam3.mp4",
  "original_size_bytes": 524288000,
  "upload_timestamp": "2026-06-25T10:30:00Z",
  "estimated_processing_time_seconds": 120
}
```

### Video Details Response
```json
{
  "video_id": "uuid-string",
  "file_name": "parking_lot_cam3.mp4",
  "status": "completed",
  "metadata": {
    "resolution": "1920x1080",
    "fps": 25,
    "duration_seconds": 300,
    "original_codec": "h264",
    "bitrate_kbps": 8000,
    "has_audio": false
  },
  "compression": {
    "profile": "balanced",
    "crf_used": 25,
    "original_size_bytes": 524288000,
    "optimized_size_bytes": 157286400,
    "compression_ratio": 0.70,
    "processing_time_ms": 45000
  },
  "quality": {
    "ssim_score": 0.91,
    "psnr_db": 38.5
  },
  "savings": {
    "storage_saved_bytes": 367001600,
    "estimated_monthly_savings_usd": 8.45,
    "estimated_annual_savings_usd": 101.40,
    "retention_improvement_days": 180
  },
  "urls": {
    "stream_original": "/api/videos/{id}/stream?quality=original",
    "stream_optimized": "/api/videos/{id}/stream",
    "thumbnail": "/api/videos/{id}/thumbnail"
  },
  "timestamps": {
    "uploaded_at": "2026-06-25T10:30:00Z",
    "processed_at": "2026-06-25T10:30:45Z"
  }
}
```

### Dashboard Summary Response
```json
{
  "total_videos": 47,
  "total_original_size_gb": 23.5,
  "total_optimized_size_gb": 7.8,
  "overall_compression_ratio": 0.67,
  "total_storage_saved_gb": 15.7,
  "estimated_monthly_savings_usd": 362.10,
  "estimated_annual_savings_usd": 4345.20,
  "average_quality_score": 0.89,
  "average_processing_time_seconds": 42,
  "retention_improvement_average_days": 150,
  "videos_by_status": {
    "completed": 45,
    "processing": 1,
    "failed": 1
  }
}
```

### Enhancement Response
```json
{
  "video_id": "uuid-string",
  "enhancement_status": "completed",
  "enhanced_stream_url": "/api/playback/{id}/enhanced",
  "processing_time_ms": 15000,
  "enhancement_model": "RealESRGAN_x4plus",
  "scale_factor": 4
}
```

### Bedrock Summary Response
```json
{
  "video_id": "uuid-string",
  "summary": "Your parking lot camera footage (Camera 3) was optimized from 500 MB to 150 MB, achieving a 70% reduction in storage. This translates to approximately $8.45 monthly savings per camera. At this compression ratio, your current storage budget can retain footage for an additional 180 days beyond the standard 90-day policy, effectively extending retention to 270 days without additional cost. The optimized footage maintains a quality score of 0.91 (excellent), meaning facial features and license plates remain clearly identifiable.",
  "roi_metrics": {
    "monthly_savings_usd": 8.45,
    "annual_savings_usd": 101.40,
    "retention_extension_days": 180,
    "quality_preserved_percent": 91
  },
  "recommendation": "Based on the low motion detected in this footage, consider applying the Maximum Storage profile for similar static camera feeds to achieve up to 80% compression.",
  "generated_at": "2026-06-25T10:31:00Z"
}
```

---

## 10. AWS Architecture

### AWS Service Justification

| Service | Purpose | Why This Service |
|---|---|---|
| Amazon S3 | Store original and optimized video files | Unlimited scalability, 11-nines durability, lifecycle policies for tiered storage, cost-effective for large binary objects |
| Amazon DynamoDB | Store video metadata, compression metrics, quality scores | Single-digit ms latency, serverless, auto-scaling, flexible schema for metadata, partition-key enables tenant isolation |
| Amazon Cognito | User authentication, SSO, RBAC | Managed auth service, SAML/OIDC federation, user pools with groups (roles), hosted UI for rapid integration |
| Amazon Bedrock | Generate natural-language business summaries | Managed LLM access (Claude/Titan), no model hosting required, pay-per-use, enterprise security |
| AWS Lambda | Lightweight triggers (S3 events, scheduled tasks) | Event-driven triggers for post-upload processing notifications, scheduled Bedrock digest generation |
| Amazon CloudWatch | Monitoring, logging, custom metrics, alarms | Native AWS observability, custom metrics for business KPIs (videos processed, savings), operational dashboards |
| AWS CloudTrail | Audit logging for compliance | All API calls logged, GDPR/ISO 27001 audit trail requirement |
| AWS Secrets Manager | Store API keys, DB credentials, model paths | Rotation support, IAM-integrated access, no hardcoded secrets |

### AWS Architecture Diagram (Text)

```
+------------------+          +------------------+
|   AWS Cognito    |          |  Amazon Bedrock  |
|   (Auth/SSO)     |          |  (Claude/Titan)  |
+--------+---------+          +--------+---------+
         |                             |
         | JWT Token                   | InvokeModel API
         v                             v
+---------------------------------------------------+
|              FastAPI Backend (Local)               |
|                  localhost:8000                    |
+---------------------------------------------------+
         |              |              |
         | PutObject    | PutItem      | PutMetricData
         v              v              v
+------------+  +-------------+  +--------------+
| Amazon S3  |  |  DynamoDB   |  | CloudWatch   |
| (Videos)   |  |  (Metadata) |  | (Monitoring) |
+------------+  +-------------+  +--------------+
         |
         | S3 Event Notification
         v
+------------+
| AWS Lambda |
| (Triggers) |
+------------+
```

### IAM Security Model

| Principal | Access | Resources |
|---|---|---|
| Backend Application (IAM User/Role) | s3:PutObject, s3:GetObject, s3:DeleteObject | S3 bucket (scoped to tenant prefix) |
| Backend Application | dynamodb:PutItem, dynamodb:Query, dynamodb:DeleteItem | DynamoDB table |
| Backend Application | bedrock:InvokeModel | Bedrock models |
| Backend Application | logs:PutLogEvents, cloudwatch:PutMetricData | CloudWatch |
| Backend Application | cognito-idp:AdminGetUser | Cognito User Pool |
| Lambda Function | s3:GetObject (read events) | S3 bucket (read only) |
| Lambda Function | ses:SendEmail | SES (notifications) |

---

## 11. Processing Pipeline

### Complete Video Processing Pipeline

```
STAGE 1: UPLOAD
  User --> [Drag-Drop UI] --> [FastAPI /upload]
      --> Validate (format, size)
      --> Save temp file locally
      --> Return upload_id, status=processing

STAGE 2: METADATA EXTRACTION
  [FFprobe] --> Parse video file
      --> Extract: resolution, fps, bitrate, codec, duration, audio
      --> Store raw metadata

STAGE 3: VIDEO ANALYSIS (Optimization Engine)
  [Metadata Analyzer] --> Parse FFprobe output
  [Scene Analyzer] --> Sample every 30th frame, histogram comparison
  [Motion Estimator] --> Frame differencing on consecutive pairs
  [Brightness Analyzer] --> Luminance statistics per sample frame
  [Noise Estimator] --> Laplacian variance method
      --> All outputs feed into Recommendation Engine

STAGE 4: COMPRESSION STRATEGY
  [Recommendation Engine]
      --> Input: all analyzer scores
      --> Output: profile (max_storage/balanced/max_quality)
      --> Output: CRF value, bitrate_kbps, encoder preset
      --> Decision based on rule matrix

STAGE 5: H.265 COMPRESSION
  [FFmpeg]
      --> Input: original video + recommended parameters
      --> Encode: libx265, CRF={recommended}, preset={recommended}
      --> Constraint: preserve FPS (no frame dropping)
      --> Constraint: preserve duration (no trimming)
      --> Output: optimized .mp4 file

STAGE 6: QUALITY VERIFICATION
  [Quality Module]
      --> Calculate SSIM (original vs compressed)
      --> Calculate PSNR (original vs compressed)
      --> Calculate compression ratio
      --> Record processing time
      --> IF SSIM < 0.85: flag as quality_warning

STAGE 7: STORAGE
  [S3 Upload]
      --> Upload original to s3://{tenant}/original/{id}.{ext}
      --> Upload optimized to s3://{tenant}/optimized/{id}.mp4
  [DynamoDB Write]
      --> Store all metadata, metrics, quality scores
      --> Set status = completed

STAGE 8: NOTIFICATION
  [Notification Service]
      --> Emit processing_complete event
      --> Update dashboard via WebSocket/polling
      --> Log to CloudWatch
```

### Enhancement Pipeline (On-Demand)

```
STAGE E1: USER REQUEST
  User clicks "AI Enhance" on Video Detail page
      --> POST /api/playback/{id}/enhance

STAGE E2: FRAME EXTRACTION
  [OpenCV]
      --> Load compressed video from S3 (or local cache)
      --> Extract frames for requested segment

STAGE E3: GPU INFERENCE
  [Real-ESRGAN on RTX 4060]
      --> Load RealESRGAN_x4plus.pth model
      --> Process frames in batches
      --> 4x upscaling per frame
      --> GPU memory management (batch size tuning)

STAGE E4: REASSEMBLY
  [OpenCV/FFmpeg]
      --> Reassemble enhanced frames
      --> Encode as playable stream

STAGE E5: DELIVERY
  --> Serve enhanced stream to frontend player
  --> Cache enhanced result (optional, S3 enhanced/ prefix)
```

---

## 12. Dashboard Navigation

### Navigation Structure

```
Sidebar Navigation:
|
|--- Home (/)
|    |--- Quick Stats (cards: total saved, videos processed, avg ratio)
|    |--- Recent Uploads (last 5 videos with status)
|    |--- Quick Actions (Upload button, View Library)
|
|--- Upload (/upload)
|    |--- Drag-and-Drop Zone
|    |--- Upload Queue (multiple files)
|    |--- Processing Status (real-time)
|
|--- Video Library (/library)
|    |--- Search Bar (camera, date, name)
|    |--- Filter Panel (date range, camera, status, profile)
|    |--- Video Grid/List (thumbnails, metrics summary)
|    |--- Pagination
|
|--- Video Details (/video/:id)
|    |--- Video Player (original/enhanced toggle)
|    |--- AI Enhance Button
|    |--- Compression Metrics Panel
|    |--- Quality Scores Panel
|    |--- Savings Panel (monthly, annual, retention)
|    |--- Bedrock Summary Panel (generate/view)
|    |--- Metadata Panel (technical details)
|
|--- Analytics (/analytics)
|    |--- Storage Savings Chart (over time)
|    |--- Compression Ratio Trends
|    |--- Retention Improvement Chart
|    |--- Cost Savings Chart (monthly/annual)
|    |--- Videos Processed Over Time
|    |--- Quality Distribution Histogram
|
|--- Settings (/settings) [Admin only]
|    |--- Compression Defaults (default profile)
|    |--- User Management (invite, roles)
|    |--- Tenant Information
|    |--- Storage Quota
```

### Dashboard Metrics Display

| Metric | Location | Visualization |
|---|---|---|
| Original Size | Video Details, Dashboard | Text (formatted GB/MB) |
| Compressed Size | Video Details, Dashboard | Text (formatted GB/MB) |
| Storage Saved | Home, Analytics | Card + Chart |
| Compression Ratio | Video Details, Library | Percentage badge |
| Quality Score (SSIM) | Video Details | Score bar (0-1) |
| Processing Time | Video Details | Text (seconds) |
| Monthly Savings (USD) | Home, Analytics, Video Details | Card + Chart |
| Annual Savings (USD) | Analytics, Video Details | Card |
| Retention Improvement | Home, Analytics, Video Details | Days badge |
| Storage Recommendation | Video Details (Bedrock) | Text panel |

---

## 13. Sequence Diagrams

### Sequence 1: Video Upload and Optimization

```
User          Frontend        Backend         FFprobe    OptEngine    FFmpeg     S3      DynamoDB
 |               |               |               |          |          |        |          |
 |--Upload File->|               |               |          |          |        |          |
 |               |--POST /upload>|               |          |          |        |          |
 |               |               |--Validate---->|          |          |        |          |
 |               |               |<--Metadata----|          |          |        |          |
 |               |               |--Analyze----->|--------->|          |        |          |
 |               |               |               |          |          |        |          |
 |               |               |<--Recommendation---------|          |        |          |
 |               |               |--Compress---->|--------->|--------->|        |          |
 |               |               |<--Optimized File--------|----------|        |          |
 |               |               |--Quality Check---------->|          |        |          |
 |               |               |<--SSIM/PSNR-------------|          |        |          |
 |               |               |--Upload to S3------------------------->|    |          |
 |               |               |--Store Metadata----------------------------------->|   |
 |               |<-Processing Complete--|       |          |          |        |          |
 |<-Dashboard Update-|          |               |          |          |        |          |
```

### Sequence 2: AI-Enhanced Playback

```
User          Frontend        Backend         S3        OpenCV     Real-ESRGAN(GPU)
 |               |               |             |           |              |
 |--Click Enhance->|             |             |           |              |
 |               |--POST /enhance>|            |           |              |
 |               |               |--Get Video->|           |              |
 |               |               |<--Video File-|          |              |
 |               |               |--Extract Frames-------->|              |
 |               |               |<--Frames----|-----------|              |
 |               |               |--Upscale Frames---------------------->|
 |               |               |<--Enhanced Frames---------------------|
 |               |               |--Reassemble Video------>|              |
 |               |<--Enhanced Stream--|        |           |              |
 |<--Play Enhanced--|            |             |           |              |
```

### Sequence 3: Bedrock Business Summary

```
User          Frontend        Backend         DynamoDB     Bedrock
 |               |               |               |            |
 |--Generate Summary->|         |               |            |
 |               |--POST /bedrock/summary-->|   |            |
 |               |               |--Get Metrics->|            |
 |               |               |<--Video Data--|            |
 |               |               |--Build Prompt------------>|
 |               |               |<--Generated Summary-------|
 |               |               |--Cache Summary->|         |
 |               |<--Summary Response--|         |            |
 |<--Display Summary--|          |               |            |
```

---

## 14. Error Handling Strategy

### Error Categories

| Category | HTTP Code | Handling | User Experience |
|---|---|---|---|
| Validation Error | 400 | Return field-level errors | Show specific validation messages |
| Authentication Error | 401 | Redirect to login | "Session expired, please log in" |
| Authorization Error | 403 | Log attempt, deny access | "You don't have permission" |
| Not Found | 404 | Return standard message | "Video not found" |
| File Too Large | 413 | Reject before upload completes | "File exceeds 2 GB limit" |
| Unsupported Format | 415 | Reject with supported list | "Please upload MP4, AVI, MOV, or MKV" |
| Processing Error | 500 | Retry once, then mark failed | "Processing failed — retry available" |
| AWS Service Error | 502/503 | Circuit breaker, fallback | "Service temporarily unavailable" |
| Rate Limited | 429 | Exponential backoff | "Too many requests, please wait" |

### Error Recovery Patterns

| Component | Failure Mode | Recovery Strategy |
|---|---|---|
| Upload | Network interruption | Chunked upload with resume |
| FFmpeg | Encoding crash | Retry with default preset; mark failed after 2 attempts |
| Real-ESRGAN | GPU OOM | Reduce batch size; fallback to CPU (slower) |
| S3 | Upload timeout | Retry with exponential backoff (3 attempts) |
| DynamoDB | Throttling | Exponential backoff; on-demand capacity |
| Bedrock | Rate limit / timeout | Return cached summary; queue for retry |
| Cognito | Token expired | Auto-refresh; redirect to login if refresh fails |

### Error Response Format (Standardized)
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Video optimization failed after 2 attempts",
    "details": "FFmpeg exited with code 1: insufficient memory",
    "video_id": "uuid-string",
    "retry_available": true,
    "timestamp": "2026-06-25T10:30:00Z"
  }
}
```

---

## 15. Logging Strategy

### Log Levels

| Level | Usage | Example |
|---|---|---|
| DEBUG | Development troubleshooting | "FFprobe output: {json}" |
| INFO | Normal operations | "Video {id} compression started" |
| WARNING | Non-critical issues | "SSIM 0.82 below threshold for video {id}" |
| ERROR | Failures requiring attention | "S3 upload failed: {error}" |
| CRITICAL | System-level failures | "GPU not available, enhancement disabled" |

### Structured Log Format
```json
{
  "timestamp": "2026-06-25T10:30:00.123Z",
  "level": "INFO",
  "service": "compression_service",
  "tenant_id": "acme-bank",
  "video_id": "uuid-string",
  "action": "compression_complete",
  "details": {
    "original_size": 524288000,
    "optimized_size": 157286400,
    "ratio": 0.70,
    "processing_time_ms": 45000,
    "profile": "balanced",
    "crf": 25
  },
  "request_id": "req-uuid"
}
```

### CloudWatch Integration

| Log Group | Source | Retention |
|---|---|---|
| /visionvault/api | FastAPI request/response logs | 30 days |
| /visionvault/processing | Compression pipeline logs | 30 days |
| /visionvault/enhancement | AI enhancement logs | 14 days |
| /visionvault/auth | Authentication events | 90 days |
| /visionvault/errors | All ERROR and CRITICAL logs | 90 days |

### Custom CloudWatch Metrics

| Metric | Namespace | Dimensions | Unit |
|---|---|---|---|
| VideosProcessed | VisionVault | tenant_id, profile | Count |
| CompressionRatio | VisionVault | tenant_id, profile | Percent |
| ProcessingTime | VisionVault | tenant_id | Milliseconds |
| StorageSavedBytes | VisionVault | tenant_id | Bytes |
| EnhancementLatency | VisionVault | tenant_id | Milliseconds |
| UploadFailures | VisionVault | tenant_id, error_type | Count |
| APILatency | VisionVault | endpoint | Milliseconds |

---

## 16. Security Architecture

### Authentication Flow

```
User --> Cognito Hosted UI --> Login (username/password or SSO)
    --> Cognito issues JWT (id_token + access_token + refresh_token)
    --> Frontend stores tokens (secure httpOnly cookies or memory)
    --> Every API request includes Authorization: Bearer {access_token}
    --> Backend AuthMiddleware validates JWT signature + expiry + claims
    --> Extract tenant_id + role from JWT claims
    --> TenantMiddleware injects tenant context into request
    --> All downstream queries scoped to tenant_id
```

### Security Layers

| Layer | Control | Implementation |
|---|---|---|
| Network | HTTPS only | TLS 1.3 on all connections |
| Authentication | JWT validation | Cognito public keys, signature verification |
| Authorization | RBAC | Role extracted from JWT groups claim |
| Tenant Isolation | Data partitioning | All queries filtered by tenant_id (partition key) |
| Input Validation | Schema enforcement | Pydantic models validate all inputs |
| File Validation | Format + size check | Whitelist allowed extensions, reject > 2 GB |
| Rate Limiting | Throttling | Per-user request limits (100 req/min) |
| Encryption at Rest | S3 + DynamoDB | SSE-KMS (AES-256) |
| Encryption in Transit | TLS | HTTPS for all external communication |
| Secrets | No hardcoded credentials | AWS Secrets Manager + .env (local dev) |
| Audit | All actions logged | CloudTrail + application audit log |

### RBAC Permission Matrix

| Action | Admin | Operator | Viewer |
|---|---|---|---|
| Upload video | Yes | Yes | No |
| View own videos | Yes | Yes | Yes |
| View all org videos | Yes | Yes | Yes |
| Delete videos | Yes | No | No |
| Trigger enhancement | Yes | Yes | No |
| View enhanced playback | Yes | Yes | Yes |
| Generate Bedrock summary | Yes | Yes | No |
| View summaries | Yes | Yes | Yes |
| Manage users | Yes | No | No |
| Change settings | Yes | No | No |
| View analytics | Yes | Yes | Yes |
| View CloudWatch | Yes | No | No |

---

## 17. Performance Targets

### Response Time Targets

| Operation | Target | Measurement Point |
|---|---|---|
| Page load (dashboard) | < 3 seconds | First contentful paint |
| API metadata queries | < 200 ms (p95) | Backend response time |
| File upload start | < 1 second | First byte acknowledged |
| Video playback start | < 2 seconds | First frame rendered |
| Enhancement generation | < 30 seconds (per 30-sec clip) | Request to first enhanced frame |
| Bedrock summary | < 10 seconds | Request to response |
| Search results | < 500 ms | Query to results displayed |

### Throughput Targets

| Metric | Target | Constraint |
|---|---|---|
| Concurrent uploads | 3 simultaneous | Network bandwidth |
| Compression jobs | 1-2 concurrent (GPU-limited) | RTX 4060 memory |
| Enhancement jobs | 1 at a time | GPU memory (8 GB VRAM) |
| API requests | 100/minute per user | Rate limiter |
| DynamoDB reads | 25 RCU (on-demand auto-scales) | Table capacity |
| DynamoDB writes | 25 WCU (on-demand auto-scales) | Table capacity |

### GPU Resource Allocation (RTX 4060, 8 GB VRAM)

| Operation | VRAM Usage | Priority |
|---|---|---|
| Real-ESRGAN inference (720p input) | ~4 GB | High (user-initiated) |
| Real-ESRGAN inference (1080p input) | ~6 GB | High (user-initiated) |
| FFmpeg NVENC (if GPU encoding) | ~1 GB | Medium |
| Reserved/OS | ~1 GB | System |

**GPU Scheduling**: One enhancement job at a time. Queue additional requests. FFmpeg uses CPU encoding (libx265) to keep GPU free for Real-ESRGAN.

---

## 18. Deployment Architecture (Hackathon)

### Local Development Deployment

```
Developer Laptop (Windows, RTX 4060)
|
|--- Terminal 1: Frontend Dev Server
|    $ cd frontend && npm run dev
|    Running: localhost:5173
|
|--- Terminal 2: Backend API Server
|    $ cd backend && uvicorn app.main:app --reload
|    Running: localhost:8000
|
|--- GPU: CUDA available for PyTorch
|    Real-ESRGAN model loaded on demand
|
|--- Local File System:
|    /temp/uploads/   (temporary upload storage)
|    /models/         (Real-ESRGAN weights)
|
|--- Remote (AWS):
|    S3: visionvault-storage-{account}
|    DynamoDB: visionvault-videos
|    Cognito: visionvault-user-pool
|    Bedrock: us-east-1 (Claude)
|    CloudWatch: /visionvault/* log groups
```

### Environment Configuration

| Variable | Value (Local Dev) | Purpose |
|---|---|---|
| AWS_REGION | us-east-1 | AWS service region |
| S3_BUCKET | visionvault-storage-{id} | Video storage bucket |
| DYNAMODB_TABLE | visionvault-videos | Metadata table |
| COGNITO_USER_POOL_ID | us-east-1_xxxxx | Auth pool |
| COGNITO_CLIENT_ID | xxxxxxxxx | App client |
| BEDROCK_MODEL_ID | anthropic.claude-3-sonnet | LLM model |
| FFMPEG_PATH | /usr/bin/ffmpeg (or Windows path) | FFmpeg binary |
| ESRGAN_MODEL_PATH | ./models/realesrgan/RealESRGAN_x4plus.pth | Model weights |
| CUDA_VISIBLE_DEVICES | 0 | GPU selection |
| LOG_LEVEL | INFO | Logging verbosity |
| CORS_ORIGINS | http://localhost:5173 | Allowed frontend origin |
| MAX_UPLOAD_SIZE_MB | 2048 | Upload limit |

### Future Production Deployment (Post-Hackathon)

```
                     Route 53 (DNS)
                          |
                          v
                   CloudFront (CDN)
                          |
              +-----------+-----------+
              |                       |
              v                       v
     S3 (Static Frontend)      ALB (Load Balancer)
                                      |
                                      v
                              ECS Fargate Cluster
                              |               |
                              v               v
                     API Service        GPU Service
                     (FastAPI)          (Enhancement)
                              |               |
              +-------+-------+-------+       |
              |       |       |       |       |
              v       v       v       v       v
            S3    DynamoDB  Cognito Bedrock  GPU(p3)
```

---

## 19. Future Extension Points

| Extension | Design Consideration | How Current Architecture Supports |
|---|---|---|
| RTSP Camera Integration | New ingestion module | Upload Module has clean interface; add RTSPIngestionModule alongside |
| Advanced AI Analytics | Object detection, tracking | AI Layer is modular; add new models alongside Real-ESRGAN |
| Multi-Region Deployment | DynamoDB Global Tables, S3 Cross-Region | Storage Module abstracts S3/DynamoDB; change config for multi-region |
| Edge Processing | Local compute nodes | Processing pipeline is stateless; can run anywhere with FFmpeg + model |
| Billing Integration | Stripe/AWS Marketplace | Add BillingModule to Backend; DynamoDB already tracks usage metrics |
| Mobile App | React Native / Flutter | API-first architecture; mobile client hits same REST endpoints |
| Webhook Notifications | Third-party integrations | NotificationModule extensible; add webhook delivery alongside email |
| Custom AI Models | Fine-tuned enhancement | EnhancementModule loads model by config; swap model weights |
| Batch Processing | Process thousands of videos | CompressionService is stateless; add queue (SQS) for batch jobs |
| Real-time Streaming | Live camera feeds | Separate module; does not affect recorded footage pipeline |

---

## 20. Component Responsibilities (Summary Matrix)

| Component | Owns | Consumes | Produces |
|---|---|---|---|
| Auth Module | JWT validation, RBAC, session management | Cognito tokens | Authenticated user context, tenant_id |
| Upload Module | File reception, validation, progress | Raw video files from user | Validated video file, upload record |
| Metadata Module | FFprobe execution, field extraction | Validated video file | Structured metadata (resolution, fps, etc.) |
| Optimization Engine | Video analysis, compression strategy | Metadata + video frames | CompressionRecommendation (CRF, bitrate, preset) |
| Compression Engine | FFmpeg H.265 encoding | Original video + recommendation | Optimized video file |
| Quality Module | SSIM/PSNR calculation | Original + optimized video | Quality scores, compression ratio |
| Storage Module | S3 upload/download, DynamoDB CRUD | Video files + metadata | Storage confirmation, retrieval URLs |
| Dashboard Module | Metrics aggregation, analytics queries | DynamoDB records | Formatted metrics, chart data |
| Playback Module | Video streaming, frame serving | S3 stored videos | Video stream to frontend player |
| AI Enhancement Module | Real-ESRGAN inference, frame processing | Compressed video frames | Enhanced video frames/stream |
| Bedrock Module | Prompt construction, LLM invocation | Video metrics from DynamoDB | Natural-language business summary |
| Notification Module | Event broadcasting, email sending | Processing events | User notifications (in-app, email) |

### Inter-Component Data Flow

```
[Upload] --> raw_file --> [Metadata] --> metadata_json --> [Optimization Engine]
                                                               |
                                                    recommendation
                                                               |
                                                               v
                          [Compression Engine] <-- original_file + params
                                    |
                              optimized_file
                                    |
                                    v
                          [Quality Module] <-- original + optimized
                                    |
                              quality_scores
                                    |
                                    v
                          [Storage Module] <-- optimized_file + metadata + scores
                                    |
                              stored (S3 + DynamoDB)
                                    |
                     +--------------+--------------+
                     |              |              |
                     v              v              v
              [Dashboard]    [Playback]     [Bedrock]
              (metrics)      (streaming)    (summaries)
                                    |
                                    v
                          [AI Enhancement] (on-demand)
```

---

## Document Approval

| Role | Name | Date | Status |
|---|---|---|---|
| Product Owner | - | - | Pending |
| Technical Lead | - | - | Pending |
| Architecture Lead | - | - | Pending |

---

*End of Application Design Document*

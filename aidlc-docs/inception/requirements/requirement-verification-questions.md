# VisionVault AI - Requirements Verification Questions

Please answer the following questions to help clarify the requirements for VisionVault AI.
Fill in the letter choice after each [Answer]: tag. If none of the options match, choose "Other" and describe your preference.

---

## Question 1
What is the target deployment model for VisionVault AI?

A) Fully cloud-hosted SaaS (multi-tenant, customers access via browser)

B) Single-tenant cloud deployment (dedicated AWS infrastructure per customer)

C) Hybrid deployment (cloud processing with on-premises video ingestion agents)

D) Fully on-premises deployment with AWS services replicated locally

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 2
What is the expected video upload mechanism?

A) Web-based manual upload (drag-and-drop or file picker in browser dashboard)

B) Automated integration with existing CCTV/NVR systems via API/SDK

C) Both manual upload and automated integration

D) Batch upload from local storage (USB/NAS) with scheduled sync

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 3
What video formats should the platform accept as input?

A) Standard CCTV formats only (H.264/AVC, MJPEG)

B) Wide format support (H.264, H.265, MJPEG, MPEG-4, AVI, MP4, MKV)

C) Any video format (universal transcoding from any source)

D) Only H.264 encoded MP4 files (simplified scope for MVP)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 4
What is the expected maximum single video file size the platform should handle?

A) Up to 2 GB per file

B) Up to 10 GB per file

C) Up to 50 GB per file (typical for 24-hour continuous recordings)

D) Up to 100+ GB per file (multi-day recordings)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 5
How many concurrent users should the platform support at launch?

A) Small scale: up to 50 concurrent users

B) Medium scale: 50-500 concurrent users

C) Large scale: 500-5000 concurrent users

D) Enterprise scale: 5000+ concurrent users

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 6
What is the expected daily video ingestion volume?

A) Low: up to 100 videos/day (small deployment)

B) Medium: 100-1000 videos/day (single large facility)

C) High: 1000-10,000 videos/day (multi-site enterprise)

D) Very High: 10,000+ videos/day (smart city / airport scale)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 7
What authentication and access control model is required?

A) Simple username/password with role-based access (Admin, Operator, Viewer)

B) Enterprise SSO integration (SAML/OIDC) with fine-grained RBAC

C) Multi-tenant with organization-level isolation and per-tenant admin

D) AWS IAM-based authentication with federated identity

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 8
What is the required video retention policy?

A) Configurable retention per customer (7 days to 1 year)

B) Compliance-driven retention (fixed periods per industry regulation)

C) Tiered storage (hot/warm/cold) with automatic lifecycle transitions

D) Indefinite retention with cost optimization through storage tiering

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 9
Should the AI enhancement (Real-ESRGAN) be applied in real-time during playback or pre-processed?

A) Real-time enhancement during playback (on-demand, higher compute cost)

B) Pre-processed enhancement stored as a separate enhanced copy

C) Hybrid: light enhancement in real-time, heavy enhancement pre-processed on request

D) User-selectable: viewer can toggle between original and enhanced quality

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 10
What level of video search and analytics capability is required?

A) Basic: search by filename, date, camera ID, location

B) Intermediate: metadata search + AI-generated video summaries

C) Advanced: object detection, person tracking, event detection, scene understanding

D) Minimal: just list/browse stored videos with filter by date

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 11
What compliance and regulatory requirements must be addressed?

A) GDPR only (data privacy, right to deletion)

B) Multiple: GDPR + industry-specific (PCI-DSS for banks, HIPAA for hospitals)

C) Government-grade: FedRAMP, SOC2, ISO 27001

D) No specific compliance requirements for MVP (address post-launch)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 12
What is the target technology stack for the application layer?

A) Serverless-first: AWS Lambda + API Gateway + DynamoDB + S3

B) Container-based: ECS/EKS with microservices architecture

C) Traditional: EC2 instances with load balancers

D) Hybrid: Serverless for API/metadata, containers for video processing

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 13
What is the pricing/billing model for the platform?

A) Per-GB storage pricing (pay for what you store)

B) Subscription tiers (Basic/Pro/Enterprise with storage limits)

C) Per-video processing fee + storage costs

D) Flat monthly fee per camera/device connected

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 14
What is the project timeline and MVP scope?

A) MVP in 4-6 weeks: core upload, compress, store, view workflow only

B) MVP in 8-12 weeks: full workflow including AI enhancement and dashboard

C) MVP in 3-6 months: complete platform with multi-tenancy, compliance, analytics

D) Proof of concept in 2-3 weeks: demonstrate compression + AI enhancement

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 15
What monitoring and observability features are required?

A) Basic: CloudWatch metrics and alarms for system health

B) Standard: Centralized logging + metrics + alerting + dashboards

C) Advanced: Distributed tracing, APM, custom business metrics, anomaly detection

D) Minimal: Just error logging for debugging

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 16: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 17: Resiliency Extensions
Should the resiliency baseline be applied to this project?

**What this extension is.** Enabling it applies a set of directional, design-time best practices for building resilient systems, derived from the AWS Well-Architected Framework (Reliability Pillar) and resilience-review guidance. It steers requirements, design, and code toward fault tolerance, high availability, observability, and recoverability — covering 15 practice areas across business goals, change management, observability, high availability, disaster recovery, and continuous improvement.

**What this extension is NOT.** Enabling it does not make your workload production-ready, nor does it certify or guarantee any availability, RTO, or RPO target. It is a starting point that scaffolds good resiliency decisions early — it is not a substitute for a formal AWS Well-Architected Review of the built system.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 18: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

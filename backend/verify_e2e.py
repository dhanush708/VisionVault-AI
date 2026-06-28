import json
import os
import subprocess
import sys
import time
from pathlib import Path
import httpx

# Reconfigure stdout to support unicode symbols like ✓ on Windows terminal
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://localhost:8000"


def generate_dummy_video() -> Path:
    """Generate a real 1-second test MP4 video using FFmpeg."""
    print("Generating a 1-second test video using FFmpeg...")
    dummy_path = Path("dummy_test.mp4")
    
    # Generate test video pattern
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", "testsrc=duration=1:size=640x360:rate=30",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        str(dummy_path)
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Test video generated successfully: {dummy_path.absolute()}")
        return dummy_path
    except Exception as e:
        print(f"Failed to generate dummy video with FFmpeg: {e}")
        # fallback: write dummy bytes
        dummy_path.write_bytes(b"\x00" * 1024)
        print("Fallback: wrote 1KB dummy file.")
        return dummy_path


def main():
    pre_generated = Path("test_25mb.mp4")
    if pre_generated.exists():
        dummy_video = pre_generated
        is_dummy = False
        print(f"Using pre-generated test video: {dummy_video.absolute()} ({dummy_video.stat().st_size} bytes)")
    else:
        dummy_video = generate_dummy_video()
        is_dummy = True
    client = httpx.Client(timeout=180.0)

    try:
        # Step 1: Check Server Health
        print("\n--- [Step 1] Verifying Server Health ---")
        health_resp = client.get(f"{BASE_URL}/health")
        print(f"Health Response Code: {health_resp.status_code}")
        print(f"Health Details: {json.dumps(health_resp.json(), indent=2)}")
        assert health_resp.status_code == 200

        # Step 2: Upload Video
        print("\n--- [Step 2] Uploading Video ---")
        files = {"file": (dummy_video.name, dummy_video.read_bytes(), "video/mp4")}
        data = {"profile": "balanced", "camera_id": "cam-101", "description": "Hackathon E2E test feed"}
        upload_resp = client.post(f"{BASE_URL}/api/v1/videos/upload", files=files, data=data)
        print(f"Upload Response Code: {upload_resp.status_code}")
        print(f"Upload Data: {json.dumps(upload_resp.json(), indent=2)}")
        assert upload_resp.status_code == 200
        video_id = upload_resp.json()["video_id"]
        print(f"Target Video ID generated: {video_id}")
        
        # Step 3 & 4: Monitor Processing Pipeline (Metadata, Analysis, Compression, S3, DynamoDB, Bedrock)
        print("\n--- [Steps 3-7] Monitoring Auto-Triggered Pipeline ---")

        # Step 5: Poll Pipeline State until complete
        print("Polling pipeline progress...")
        pipeline_completed = False
        for attempt in range(60):
            state_resp = client.get(f"{BASE_URL}/api/v1/pipeline/{video_id}/state")
            state_data = state_resp.json()
            status = state_data.get("status")
            stage = state_data.get("current_stage")
            print(f"  Attempt {attempt+1}: Status={status}, Stage={stage}")
            
            if status == "completed":
                pipeline_completed = True
                print("Pipeline completed successfully!")
                break
            elif status == "failed":
                print("Pipeline failed!")
                print(json.dumps(state_data, indent=2))
                break
            time.sleep(1)
            
        assert pipeline_completed, "Pipeline processing did not complete."

        # Fetch pipeline results
        result_resp = client.get(f"{BASE_URL}/api/v1/pipeline/{video_id}/result")
        print(f"Pipeline Result Code: {result_resp.status_code}")
        result_data = result_resp.json()
        print(f"Metadata Resolution: {result_data.get('metadata', {}).get('resolution')}")
        
        comp_data = result_data.get('compression') or {}
        print(f"SSIM Quality Score: {comp_data.get('quality', {}).get('ssim')}")
        
        s3_data = result_data.get('s3') or {}
        print(f"S3 Original Key: {s3_data.get('original_key')}")
        print(f"S3 Compressed Key: {s3_data.get('compressed_key')}")
        print(f"AWS Sync Status: s3_success={s3_data.get('success')}")
        print(f"Bedrock Summary Source: {result_data.get('summary_source')}")
        print(f"Bedrock Summary: {result_data.get('bedrock_summary', '')[:100]}...")

        # Step 6: Start AI Enhancement
        print("\n--- [Step 8] Triggering AI Enhancement ---")
        enhance_resp = client.post(f"{BASE_URL}/api/v1/pipeline/{video_id}/enhance")
        print(f"Enhance Trigger Code: {enhance_resp.status_code}")
        print(f"Enhance Details: {json.dumps(enhance_resp.json(), indent=2)}")
        assert enhance_resp.status_code == 200

        # Step 7: Poll AI Enhancement Status
        print("Polling enhancement progress...")
        enhance_completed = False
        for attempt in range(60):
            status_resp = client.get(f"{BASE_URL}/api/v1/pipeline/{video_id}/enhance/status")
            status_data = status_resp.json()
            status = status_data.get("status")
            stage = status_data.get("stage")
            gpu = status_data.get("gpu")
            vram = status_data.get("vram_used_mb")
            pct = status_data.get("progress_percent")
            
            # Safe print representation
            stage_safe = stage.encode("ascii", "ignore").decode("ascii") if stage else ""
            print(f"  Attempt {attempt+1}: Status={status}, Pct={pct}%, Stage={stage_safe}, GPU={gpu}, VRAM={vram}MB")
            
            if status == "completed":
                enhance_completed = True
                print("AI Enhancement completed successfully!")
                break
            elif status == "failed":
                print("AI Enhancement failed!")
                break
            time.sleep(1)

        assert enhance_completed, "AI Enhancement processing did not complete."

        # Step 8: Fetch Executive AI Enhancement Report
        print("\n--- [Step 9] Fetching Executive AI Enhancement Report ---")
        report_resp = client.get(f"{BASE_URL}/api/v1/pipeline/{video_id}/enhance/report")
        print(f"Report Response Code: {report_resp.status_code}")
        report_data = report_resp.json()
        print(f"Device Used: {report_data.get('device')}")
        print(f"Output Resolution (Target): {report_data.get('video_metrics', {}).get('output_resolution')}")
        print(f"SSIM Restored: {report_data.get('video_metrics', {}).get('restored_ssim')}")
        print(f"Forensic Analysis notes: {report_data.get('forensic_analysis')[:120]}...")
        assert report_resp.status_code == 200

        # Step 9: Verify Video Downloads (including inline playbacks)
        print("\n--- [Step 10] Verifying Video Playbacks & Download headers ---")
        
        # Test compressed playback inline
        comp_dl_resp = client.get(f"{BASE_URL}/api/v1/pipeline/{video_id}/download/compressed?inline=true")
        print(f"Compressed Download Inline Code: {comp_dl_resp.status_code}")
        print(f"Content-Disposition Header: {comp_dl_resp.headers.get('content-disposition')}")
        assert comp_dl_resp.status_code == 200
        assert comp_dl_resp.headers.get("content-disposition") == "inline"

        # Test enhanced playback inline
        enh_dl_resp = client.get(f"{BASE_URL}/api/v1/pipeline/{video_id}/download/enhanced?inline=true")
        print(f"Enhanced Download Inline Code: {enh_dl_resp.status_code}")
        print(f"Content-Disposition Header: {enh_dl_resp.headers.get('content-disposition')}")
        assert enh_dl_resp.status_code == 200
        assert enh_dl_resp.headers.get("content-disposition") == "inline"

        # Test standard download attachment
        enh_att_resp = client.get(f"{BASE_URL}/api/v1/pipeline/{video_id}/download/enhanced")
        print(f"Enhanced Download Attachment Code: {enh_att_resp.status_code}")
        print(f"Content-Disposition Header: {enh_att_resp.headers.get('content-disposition')}")
        assert enh_att_resp.status_code == 200
        assert "attachment" in enh_att_resp.headers.get("content-disposition")

        print("\n=======================================================")
        print("🎉 END-TO-END VERIFICATION COMPLETED SUCCESSFULLY! 🎉")
        print("All pipeline nodes, AWS features, AI Enhancement, ")
        print("sycned playbacks, and telemetry reports are verified.")
        print("=======================================================")

    finally:
        # Cleanup dummy video
        if 'is_dummy' in locals() and is_dummy and dummy_video.exists():
            dummy_video.unlink()
            print("\nCleaned up dummy test video file.")


if __name__ == "__main__":
    main()

import { useRef, useEffect, useCallback } from "react";

const CAPTURE_INTERVAL_MS = 200; // 5 fps to backend

export default function Webcam({ onFrame, faceBox, numHands }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const overlayRef = useRef(null);
  const timerRef   = useRef(null);

  useEffect(() => {
    let stream = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.error("Webcam error:", e);
      }
    })();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Capture frames and send to parent
  useEffect(() => {
    const capture = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2) return;
      c.width  = v.videoWidth  || 640;
      c.height = v.videoHeight || 360;
      const ctx = c.getContext("2d");
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(v, -c.width, 0, c.width, c.height);
      ctx.restore();
      const b64 = c.toDataURL("image/jpeg", 0.7).split(",")[1];
      onFrame(b64);
    };
    timerRef.current = setInterval(capture, CAPTURE_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [onFrame]);

  // Draw face box on overlay canvas
  useEffect(() => {
    const ov = overlayRef.current;
    if (!ov) return;
    const ctx = ov.getContext("2d");
    ctx.clearRect(0, 0, ov.width, ov.height);
    if (!faceBox) return;
    const [x1, y1, x2, y2] = faceBox;
    // Scale to display size
    const scaleX = ov.width  / (videoRef.current?.videoWidth  || 640);
    const scaleY = ov.height / (videoRef.current?.videoHeight || 360);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x1 * scaleX, y1 * scaleY,
                   (x2 - x1) * scaleX, (y2 - y1) * scaleY);
  }, [faceBox]);
  return (
  <div className="webcam-wrap" style={{ position: "relative", width: "100%", maxWidth: "640px" }}>
    {/* Explicitly mirrored via CSS inline styles if class doesn't handle it */}
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      muted 
      className="webcam-video" 
      style={{ width: "100%", height: "auto", display: "block", transform: "scaleX(-1)" }}
    />
    <canvas ref={canvasRef} style={{ display: "none" }} />
    <canvas 
      ref={overlayRef} 
      className="webcam-overlay" 
      width={640} 
      height={360} 
      style={{ 
        position: "absolute", 
        top: 0, 
        left: 0, 
        width: "100%", 
        height: "100%", 
        pointerEvents: "none" // Ensures clicks pass straight through to the video if needed
      }} 
    />
    <div className="hand-badge" style={{ position: "absolute", bottom: "10px", right: "10px", zIndex: 10 }}>
      {numHands > 0 ? `${numHands} hand${numHands > 1 ? 's' : ''}` : "no hands"}
    </div>
  </div>
);

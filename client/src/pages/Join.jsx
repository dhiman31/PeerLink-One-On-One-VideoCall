import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWebRTC } from "../hooks/useWebRTC";

import "../styles/base.css";
import "../styles/call.css";
import "../styles/video.css";

const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconFile = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
    <polyline points="13 2 13 9 20 9"/>
  </svg>
);

const STEPS = [
  { id: "camera", label: "Accessing camera & microphone" },
  { id: "sdp",    label: "Processing offer" },
  { id: "answer", label: "Creating answer" },
  { id: "ice",    label: "Gathering ICE candidates" },
];

function useCallTimer(running) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) { setSecs(0); return; }
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function Join() {
  const nav = useNavigate();

  const {
    localVideoRef,
    remoteVideoRef,
    connectionState,
    signalData,
    joinWithOffer,
    hangUp,
    error,
  } = useWebRTC();

  const [offer, setOffer]       = useState("");
  const [fileName, setFileName] = useState("");
  const [gatherStep, setGatherStep] = useState(0);
  const fileInputRef = useRef(null);
  const timer = useCallTimer(connectionState === "connected");

  useEffect(() => {
    if (connectionState !== "gathering") { setGatherStep(0); return; }
    const delays = [0, 500, 900, 1400];
    const timers = delays.map((d, i) =>
      setTimeout(() => setGatherStep(i + 1), d)
    );
    return () => timers.forEach(clearTimeout);
  }, [connectionState]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setOffer(text);
    setFileName(file.name);
  };

  const downloadAnswer = () => {
    const blob = new Blob([signalData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "answer.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const leave = () => { hangUp(); nav("/"); };

  // ── Connected screen ──────────────────────────
  if (connectionState === "connected") {
    return (
      <div className="video-page">
        <video ref={remoteVideoRef} autoPlay playsInline className="video-remote" />
        <video ref={localVideoRef} autoPlay muted playsInline className="video-local" />

        <div className="connected-banner">
          <span className="status-dot" style={{ background: "var(--green)", animation: "dot-pulse 2s ease-in-out infinite" }} />
          Connected · {timer}
        </div>

        <button className="btn btn-red end-btn" onClick={leave}>
          End call
        </button>
      </div>
    );
  }

  // ── Setup card ────────────────────────────────
  return (
    <div className="center-page">
      <div className="card">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="call-title">Join call</h2>
          {connectionState === "gathering" && (
            <span className="status-badge gathering">
              <span className="status-dot pulse" />
              Processing…
            </span>
          )}
          {connectionState === "ready" && (
            <span className="status-badge ready">
              <IconCheck />
              Answer ready
            </span>
          )}
        </div>

        {/* Gathering progress */}
        {connectionState === "gathering" && (
          <div className="gathering-steps">
            {STEPS.map((step, i) => {
              const isDone   = i < gatherStep - 1;
              const isActive = i === gatherStep - 1;
              return (
                <div
                  key={step.id}
                  className={`gathering-step ${isDone ? "done" : isActive ? "active" : ""}`}
                  style={{ animationDelay: `${i * 0.07}s`, opacity: i >= gatherStep ? 0.4 : 1 }}
                >
                  <span className="step-icon">
                    {isDone
                      ? <IconCheck />
                      : isActive
                        ? <span className="spinner" />
                        : <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--border-bright)", display: "block" }} />
                    }
                  </span>
                  {step.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Idle: upload offer */}
        {connectionState === "idle" && (
          <div className="action-group">
            <p className="step-label">Upload offer file from caller</p>

            <label
              className={`file-upload-label ${fileName ? "has-file" : ""}`}
              htmlFor="offer-upload"
            >
              {fileName
                ? <><IconCheck /> {fileName}</>
                : <><IconFile /> Choose offer.txt…</>
              }
            </label>
            <input
              id="offer-upload"
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="file-input-hidden"
              onChange={handleUpload}
            />

            <button
              className="btn btn-primary"
              onClick={() => joinWithOffer(offer)}
              disabled={!offer}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Start joining
            </button>
          </div>
        )}

        {/* Ready: download answer */}
        {connectionState === "ready" && (
          <div className="action-group">
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Your answer is ready. Send this file back to the caller so they can connect.
            </p>
            <button className="btn btn-green" onClick={downloadAnswer}>
              <IconDownload />
              Download answer.txt
            </button>
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              Waiting for caller to connect…
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span className="spinner" style={{ color: "var(--amber)" }} />
              <span style={{ fontSize: 13, color: "var(--amber)" }}>Listening for connection</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error-msg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Back */}
        <button
          className="btn btn-ghost"
          onClick={leave}
          style={{ height: 36, fontSize: 13, color: "var(--text-muted)" }}
        >
          ← Back to home
        </button>

      </div>
    </div>
  );
}
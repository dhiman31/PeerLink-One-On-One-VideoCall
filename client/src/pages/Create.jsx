import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebRTC } from "../hooks/useWebRTC.js";

export default function Create() {
  const nav = useNavigate();
  const { localVideoRef, remoteVideoRef, phase, localSignal, error, startCreate, acceptAnswer, hangUp } = useWebRTC();
  const [answer, setAnswer] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { startCreate(); }, []);

  const copy = () => {
    navigator.clipboard.writeText(localSignal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connect = () => acceptAnswer(answer);

  const leave = () => { hangUp(); nav("/"); };

  // ── Connected: full screen videos ──
  if (phase === "connected") {
    return (
      <div style={{ background: "#000", height: "100vh", position: "relative" }}>
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <video ref={localVideoRef} autoPlay playsInline muted style={{ position: "absolute", bottom: 16, right: 16, width: 180, borderRadius: 8, border: "2px solid #fff" }} />
        <button onClick={leave} style={{ position: "absolute", top: 16, left: 16, padding: "10px 20px", background: "red", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16 }}>
          End Call
        </button>
      </div>
    );
  }

  // ── Signaling UI ──
  return (
    <div style={{ fontFamily: "sans-serif", background: "#111", color: "#fff", minHeight: "100vh", padding: 24 }}>
      <button onClick={leave} style={{ background: "none", border: "1px solid #444", color: "#aaa", padding: "6px 14px", cursor: "pointer", borderRadius: 6, marginBottom: 24 }}>
        ← Back
      </button>

      <h2 style={{ marginTop: 0 }}>Create Call</h2>

      {/* Local preview */}
      <video ref={remoteVideoRef} autoPlay playsInline style={{ display: "none" }} />
      <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 240, borderRadius: 8, marginBottom: 24, background: "#222" }} />

      {/* Step 1: gathering */}
      {phase === "gathering" && (
        <p style={{ color: "#ffaa00" }}>⏳ Gathering ICE candidates… please wait</p>
      )}

      {/* Step 2: signal ready — copy it */}
      {(phase === "ready" || phase === "failed") && localSignal && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "#00c853" }}>✅ Signal ready! Copy and send to your peer via WhatsApp.</p>
          <textarea
            readOnly
            value={localSignal}
            rows={4}
            style={{ width: "100%", background: "#1a1a1a", color: "#aaa", border: "1px solid #333", borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
          />
          <button onClick={copy} style={{ marginTop: 8, padding: "10px 24px", background: copied ? "#444" : "#00c853", color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 15 }}>
            {copied ? "Copied ✓" : "Copy Signal"}
          </button>
        </div>
      )}

      {/* Step 3: paste answer */}
      {(phase === "ready" || phase === "failed") && (
        <div>
          <p style={{ color: "#aaa" }}>Paste the answer signal from your peer:</p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Paste answer signal here…"
            style={{ width: "100%", background: "#1a1a1a", color: "#fff", border: "1px solid #333", borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
          />
          <button onClick={connect} disabled={!answer.trim()} style={{ marginTop: 8, padding: "10px 24px", background: "#2979ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 15 }}>
            Connect →
          </button>
        </div>
      )}

      {error && <p style={{ color: "red", marginTop: 16 }}>Error: {error}</p>}
    </div>
  );
}
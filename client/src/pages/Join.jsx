import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebRTC } from "../hooks/useWebRTC.js";

export default function Join() {
  const nav = useNavigate();
  const { localVideoRef, remoteVideoRef, phase, localSignal, error, startJoin, hangUp } = useWebRTC();
  const [offer, setOffer] = useState("");
  const [copied, setCopied] = useState(false);

  const start = () => startJoin(offer);

  const copy = () => {
    navigator.clipboard.writeText(localSignal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  return (
    <div style={{ fontFamily: "sans-serif", background: "#111", color: "#fff", minHeight: "100vh", padding: 24 }}>
      <button onClick={leave} style={{ background: "none", border: "1px solid #444", color: "#aaa", padding: "6px 14px", cursor: "pointer", borderRadius: 6, marginBottom: 24 }}>
        ← Back
      </button>

      <h2 style={{ marginTop: 0 }}>Join Call</h2>

      <video ref={remoteVideoRef} autoPlay playsInline style={{ display: "none" }} />
      <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 240, borderRadius: 8, marginBottom: 24, background: "#222", display: phase === "idle" ? "none" : "block" }} />

      {/* Step 1: paste offer */}
      {phase === "idle" && (
        <div>
          <p style={{ color: "#aaa" }}>Paste the offer signal from the call creator:</p>
          <textarea
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            rows={4}
            placeholder="Paste offer signal here…"
            style={{ width: "100%", background: "#1a1a1a", color: "#fff", border: "1px solid #333", borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
          />
          <button onClick={start} disabled={!offer.trim()} style={{ marginTop: 8, padding: "10px 24px", background: "#2979ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 15 }}>
            Start →
          </button>
        </div>
      )}

      {/* Step 2: gathering */}
      {phase === "gathering" && (
        <p style={{ color: "#ffaa00" }}>⏳ Gathering ICE candidates… please wait</p>
      )}

      {/* Step 3: answer ready — copy and send back */}
      {phase === "ready" && localSignal && (
        <div>
          <p style={{ color: "#00c853" }}>✅ Answer ready! Copy and send back to the creator via WhatsApp.</p>
          <textarea
            readOnly
            value={localSignal}
            rows={4}
            style={{ width: "100%", background: "#1a1a1a", color: "#aaa", border: "1px solid #333", borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
          />
          <button onClick={copy} style={{ marginTop: 8, padding: "10px 24px", background: copied ? "#444" : "#00c853", color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 15 }}>
            {copied ? "Copied ✓" : "Copy Answer"}
          </button>
          <p style={{ color: "#888", marginTop: 12, fontSize: 13 }}>⏳ Waiting for creator to paste your answer and connect…</p>
        </div>
      )}

      {error && <p style={{ color: "red", marginTop: 16 }}>Error: {error}</p>}
    </div>
  );
}
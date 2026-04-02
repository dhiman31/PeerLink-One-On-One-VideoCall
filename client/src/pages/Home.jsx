import { useNavigate } from "react-router-dom";

const s = {
  page: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 20, fontFamily: "sans-serif", background: "#111", color: "#fff" },
  h1: { fontSize: 40, margin: 0 },
  sub: { color: "#aaa", marginTop: -10 },
  btn: { padding: "14px 40px", fontSize: 18, cursor: "pointer", borderRadius: 8, border: "none" },
};

export default function Home() {
  const nav = useNavigate();
  return (
    <div style={s.page}>
      <h1 style={s.h1}>📹 WebRTC Call</h1>
      <p style={s.sub}>No server. Direct peer-to-peer.</p>
      <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
        <button style={{ ...s.btn, background: "#00c853", color: "#000" }} onClick={() => nav("/create")}>
          Create Call
        </button>
        <button style={{ ...s.btn, background: "#2979ff", color: "#fff" }} onClick={() => nav("/join")}>
          Join Call
        </button>
      </div>
    </div>
  );
}
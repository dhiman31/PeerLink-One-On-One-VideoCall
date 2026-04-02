import { useRef, useState, useCallback, useEffect } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ── Compress JSON → base64 string ──
async function encodeSignal(obj) {
  const json = JSON.stringify(obj);
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(new TextEncoder().encode(json));
  writer.close();
  const compressed = await new Response(stream.readable).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(compressed)));
}

// ── base64 → decompress → JSON ──
async function decodeSignal(b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const text = await new Response(stream.readable).text();
  return JSON.parse(text);
}

export function useWebRTC() {
  const pcRef = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [phase, setPhase] = useState("idle");
  const [localSignal, setLocalSignal] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [gathered, setGathered] = useState(false);
  const [error, setError] = useState("");

  // ── Attach streams to video elements whenever phase changes ──
  useEffect(() => {
    console.log("[WebRTC] phase →", phase);
    if (localVideoRef.current && localStream.current) {
      console.log("[WebRTC] attaching local stream to video");
      localVideoRef.current.srcObject = localStream.current;
    }
    if (remoteVideoRef.current && remoteStream.current) {
      console.log("[WebRTC] attaching remote stream to video");
      remoteVideoRef.current.srcObject = remoteStream.current;
    }
  }, [phase]);

  // ── Build + encode signal once all ICE candidates gathered ──
  useEffect(() => {
    if (!gathered || !pcRef.current) return;
    const signal = {
      sdp: pcRef.current.localDescription,
      candidates,
    };
    console.log("[WebRTC] gathering complete, candidates:", candidates.length);
    encodeSignal(signal).then((encoded) => {
      setLocalSignal(encoded);
      setPhase("ready");
    });
  }, [gathered, candidates]);

  // ── Get camera + mic ──
  const getMedia = async () => {
    console.log("[WebRTC] requesting camera and mic...");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log("[WebRTC] got local stream, tracks:", stream.getTracks().map((t) => t.kind));
    localStream.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      console.log("[WebRTC] local video attached immediately");
    }
    return stream;
  };

  // ── Create RTCPeerConnection ──
  const createPC = (stream) => {
    console.log("[WebRTC] creating RTCPeerConnection");
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach((t) => {
      pc.addTrack(t, stream);
      console.log("[WebRTC] added local track:", t.kind);
    });

    pc.ontrack = (e) => {
      console.log("[WebRTC] ontrack! kind:", e.track.kind, "streams:", e.streams.length);
      remoteStream.current = e.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
        console.log("[WebRTC] remote video attached immediately");
      } else {
        console.log("[WebRTC] remoteVideoRef null — will attach after phase change");
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("[WebRTC] ICE candidate:", e.candidate.type, e.candidate.protocol);
        setCandidates((prev) => [...prev, e.candidate.toJSON()]);
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log("[WebRTC] iceGatheringState →", pc.iceGatheringState);
      if (pc.iceGatheringState === "complete") setGathered(true);
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] connectionState →", pc.connectionState);
      if (pc.connectionState === "connected")    setPhase("connected");
      if (pc.connectionState === "failed")       setPhase("failed");
      if (pc.connectionState === "disconnected") setPhase("failed");
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] iceConnectionState →", pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log("[WebRTC] signalingState →", pc.signalingState);
    };

    return pc;
  };

  // ── CALLER: create offer ──
  const startCreate = useCallback(async () => {
    try {
      console.log("[WebRTC] === CALLER START ===");
      setError("");
      setPhase("gathering");
      const stream = await getMedia();
      const pc = createPC(stream);
      const offer = await pc.createOffer();
      console.log("[WebRTC] offer created, setting localDescription...");
      await pc.setLocalDescription(offer);
    } catch (e) {
      console.error("[WebRTC] startCreate error:", e);
      setError(e.message);
      setPhase("idle");
    }
  }, []);

  // ── CALLER: accept joiner's answer ──
  const acceptAnswer = useCallback(async (raw) => {
    try {
      console.log("[WebRTC] === ACCEPTING ANSWER ===");
      const { sdp, candidates } = await decodeSignal(raw.trim());
      const pc = pcRef.current;
      console.log("[WebRTC] setting remoteDescription (answer)...");
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log("[WebRTC] adding", candidates.length, "remote ICE candidates...");
      for (const c of candidates) await pc.addIceCandidate(new RTCIceCandidate(c));
      console.log("[WebRTC] done — waiting for connectionState: connected");
    } catch (e) {
      console.error("[WebRTC] acceptAnswer error:", e);
      setError("Bad signal: " + e.message);
    }
  }, []);

  // ── JOINER: paste offer, generate answer ──
  const startJoin = useCallback(async (raw) => {
    try {
      console.log("[WebRTC] === JOINER START ===");
      setError("");
      setPhase("gathering");
      const { sdp, candidates: remoteCandidates } = await decodeSignal(raw.trim());
      const stream = await getMedia();
      const pc = createPC(stream);
      console.log("[WebRTC] setting remoteDescription (offer)...");
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log("[WebRTC] adding", remoteCandidates.length, "remote candidates...");
      for (const c of remoteCandidates) await pc.addIceCandidate(new RTCIceCandidate(c));
      const answer = await pc.createAnswer();
      console.log("[WebRTC] answer created, setting localDescription...");
      await pc.setLocalDescription(answer);
    } catch (e) {
      console.error("[WebRTC] startJoin error:", e);
      setError(e.message);
      setPhase("idle");
    }
  }, []);

  // ── Hang up ──
  const hangUp = useCallback(() => {
    console.log("[WebRTC] hanging up");
    pcRef.current?.close();
    localStream.current?.getTracks().forEach((t) => t.stop());
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    localStream.current  = null;
    remoteStream.current = null;
    setPhase("idle");
    setLocalSignal("");
    setCandidates([]);
    setGathered(false);
  }, []);

  return {
    localVideoRef, remoteVideoRef,
    phase, localSignal, error,
    startCreate, startJoin, acceptAnswer, hangUp,
  };
}
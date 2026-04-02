import { useRef, useState, useCallback, useEffect } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useWebRTC() {
  const peerConnectionRef = useRef(null);
  const localMediaStreamRef = useRef(null);
  const remoteMediaStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [connectionState, setConnectionState] = useState("idle");
  const [signalData, setSignalData] = useState("");
  const [iceCandidates, setIceCandidates] = useState([]);
  const [isGatheringComplete, setIsGatheringComplete] = useState(false);
  const [error, setError] = useState("");

  // Attach streams
  useEffect(() => {
    if (localVideoRef.current && localMediaStreamRef.current) {
      localVideoRef.current.srcObject = localMediaStreamRef.current;
    }
    if (remoteVideoRef.current && remoteMediaStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteMediaStreamRef.current;
    }
  }, [connectionState]);

  // Build signal JSON
  useEffect(() => {
    if (!isGatheringComplete || !peerConnectionRef.current) return;

    const signal = {
      sdp: peerConnectionRef.current.localDescription,
      candidates: iceCandidates,
    };

    setSignalData(JSON.stringify(signal, null, 2));
    setConnectionState("ready");
  }, [isGatheringComplete, iceCandidates]);

  // Get media
  const getUserMediaStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localMediaStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  };

  // Create peer connection
  const createPeerConnection = (stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      remoteMediaStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        setIceCandidates((prev) => [...prev, event.candidate.toJSON()]);
      }
    };

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        setIsGatheringComplete(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionState("connected");
      }
      if (["failed", "disconnected"].includes(pc.connectionState)) {
        setConnectionState("failed");
      }
    };

    return pc;
  };

  // CREATE CALL
  const createOffer = useCallback(async () => {
    try {
      setError("");
      setConnectionState("gathering");

      const stream = await getUserMediaStream();
      const pc = createPeerConnection(stream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
    } catch (e) {
      setError(e.message);
      setConnectionState("idle");
    }
  }, []);

  // APPLY ANSWER
  const applyAnswer = useCallback(async (raw) => {
    try {
      const { sdp, candidates } = JSON.parse(raw);

      const pc = peerConnectionRef.current;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      for (const c of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
    } catch (e) {
      setError("Invalid answer file");
    }
  }, []);

  // JOIN CALL
  const joinWithOffer = useCallback(async (raw) => {
    try {
      setError("");
      setConnectionState("gathering");

      const { sdp, candidates } = JSON.parse(raw);

      const stream = await getUserMediaStream();
      const pc = createPeerConnection(stream);

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      for (const c of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
    } catch (e) {
      setError("Invalid offer file");
      setConnectionState("idle");
    }
  }, []);

  const hangUp = useCallback(() => {
    peerConnectionRef.current?.close();
    localMediaStreamRef.current?.getTracks().forEach((t) => t.stop());

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setConnectionState("idle");
    setSignalData("");
    setIceCandidates([]);
    setIsGatheringComplete(false);
  }, []);

  return {
    localVideoRef,
    remoteVideoRef,
    connectionState,
    signalData,
    error,
    createOffer,
    joinWithOffer,
    applyAnswer,
    hangUp,
  };
}
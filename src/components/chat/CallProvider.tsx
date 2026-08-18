"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { initiateCall, signalCall, updateCallStatus, getMyDbUserId } from "@/actions/call.action";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCallScreen from "./ActiveCallScreen";
import toast from "react-hot-toast";

type CallType = "AUDIO" | "VIDEO";

type IncomingCall = {
  callId: string;
  caller: any;
  callType: CallType;
};

type ActiveCall = {
  callId: string;
  peerId: string;
  callType: CallType;
  status: "CONNECTING" | "ONGOING";
};

interface CallContextValue {
  startCall: (peerId: string, type: CallType) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  activeCall: ActiveCall | null;
  toggleMute: () => void;
  toggleVideo: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

const CALL_TIMEOUT_MS = 45_000; // 45 seconds

export function CallProvider({ children }: { children: React.ReactNode }) {
  // Use DB user ID (not Clerk ID) to match Pusher channel naming convention
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidate[]>([]);
  const hasRemoteDescriptionRef = useRef(false);

  const activeCallRef = useRef<ActiveCall | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Fetch DB user ID on mount
  useEffect(() => {
    getMyDbUserId().then((id) => {
      if (id) setDbUserId(id);
    });
  }, []);

  // Cleanup helper using refs to avoid stale closures
  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    pcRef.current = null;
    remoteUserIdRef.current = null;
    iceCandidateQueueRef.current = [];
    hasRemoteDescriptionRef.current = false;
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  // Flush queued ICE candidates after remote description is set
  const flushIceCandidateQueue = useCallback(async () => {
    if (!pcRef.current) return;
    const queue = iceCandidateQueueRef.current;
    iceCandidateQueueRef.current = [];
    for (const candidate of queue) {
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.warn("Failed to add queued ICE candidate:", err);
      }
    }
  }, []);

  const initPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserIdRef.current && activeCallRef.current?.callId) {
        signalCall(remoteUserIdRef.current, {
          type: "webrtc_ice_candidate",
          callId: activeCallRef.current.callId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        cleanupCall();
      }
    };

    pcRef.current = pc;
    hasRemoteDescriptionRef.current = false;
    return pc;
  }, [cleanupCall]);

  // Pusher real-time listening — subscribe using DB user ID
  useEffect(() => {
    if (!dbUserId) return;

    const channel = pusherClient.subscribe(`user-${dbUserId}`);

    channel.bind("call-event", async (data: any) => {
      if (data.type === "incoming_call") {
        setIncomingCall({
          callId: data.callId,
          caller: data.caller,
          callType: data.callType,
        });
      } else if (data.type === "call_accepted") {
        await onCallAccepted();
      } else if (data.type === "call_rejected" || data.type === "call_ended") {
        cleanupCall();
      } else if (data.type === "webrtc_offer") {
        await handleOffer(data);
      } else if (data.type === "webrtc_answer") {
        await handleAnswer(data);
      } else if (data.type === "webrtc_ice_candidate") {
        await handleIceCandidate(data);
      }
    });

    return () => {
      pusherClient.unsubscribe(`user-${dbUserId}`);
    };
  }, [dbUserId]);

  const startCall = async (peerId: string, type: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "VIDEO",
        audio: true,
      });
      setLocalStream(stream);

      const res = await initiateCall(peerId, type);
      if (!res.success) {
        stream.getTracks().forEach((t) => t.stop());
        toast.error(res.error || "Failed to start call");
        cleanupCall();
        return;
      }

      setActiveCall({ callId: res.callId!, peerId, callType: type, status: "CONNECTING" });
      remoteUserIdRef.current = peerId;

      // Auto-timeout after 45 seconds if not accepted
      callTimeoutRef.current = setTimeout(() => {
        if (activeCallRef.current?.status === "CONNECTING") {
          updateCallStatus(activeCallRef.current.callId, "MISSED");
          cleanupCall();
        }
      }, CALL_TIMEOUT_MS);
    } catch (err) {
      console.error(err);
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCall.callType === "VIDEO",
        audio: true,
      });
      setLocalStream(stream);

      const peerId = incomingCall.caller.id;
      setActiveCall({
        callId: incomingCall.callId,
        peerId,
        callType: incomingCall.callType,
        status: "CONNECTING",
      });
      remoteUserIdRef.current = peerId;

      updateCallStatus(incomingCall.callId, "ONGOING");
      signalCall(peerId, { type: "call_accepted", callId: incomingCall.callId });

      setIncomingCall(null);
    } catch (err) {
      console.error(err);
      // Stop tracks if getUserMedia succeeded but something else failed
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      rejectCall();
    }
  };

  // Called on caller side when receiver accepts
  const onCallAccepted = async () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (activeCallRef.current) setActiveCall({ ...activeCallRef.current, status: "ONGOING" });
    const pc = initPeerConnection();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (remoteUserIdRef.current && activeCallRef.current) {
      signalCall(remoteUserIdRef.current, {
        type: "webrtc_offer",
        callId: activeCallRef.current.callId,
        sdp: offer,
      });
    }
  };

  const handleOffer = async (data: any) => {
    // Callee receives offer
    const pc = initPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    hasRemoteDescriptionRef.current = true;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signalCall(remoteUserIdRef.current!, {
      type: "webrtc_answer",
      callId: data.callId,
      sdp: answer,
    });

    // Flush any ICE candidates that arrived before the offer
    await flushIceCandidateQueue();
  };

  const handleAnswer = async (data: any) => {
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      hasRemoteDescriptionRef.current = true;

      // Flush any ICE candidates that arrived before the answer
      await flushIceCandidateQueue();
    }
  };

  const handleIceCandidate = async (data: any) => {
    const candidate = new RTCIceCandidate(data.candidate);

    // Queue ICE candidates if remote description hasn't been set yet
    if (!hasRemoteDescriptionRef.current || !pcRef.current) {
      iceCandidateQueueRef.current.push(candidate);
      return;
    }

    try {
      await pcRef.current.addIceCandidate(candidate);
    } catch (err) {
      console.warn("Failed to add ICE candidate:", err);
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      updateCallStatus(incomingCall.callId, "REJECTED");
      signalCall(incomingCall.caller.id, { type: "call_rejected", callId: incomingCall.callId });
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    const call = activeCallRef.current;
    if (call) {
      updateCallStatus(call.callId, "COMPLETED");
      signalCall(call.peerId, { type: "call_ended", callId: call.callId });
      cleanupCall();
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider
      value={{
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        localStream,
        remoteStream,
        activeCall,
        toggleMute,
        toggleVideo,
        isMuted,
        isVideoOff,
      }}
    >
      {children}
      {incomingCall && !activeCall && (
        <IncomingCallModal caller={incomingCall.caller} type={incomingCall.callType} onAccept={acceptCall} onReject={rejectCall} />
      )}
      {activeCall && (
        <ActiveCallScreen />
      )}
    </CallContext.Provider>
  );
}

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
};

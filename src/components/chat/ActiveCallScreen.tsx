"use client";

import { useEffect, useRef } from "react";
import { useCall } from "./CallProvider";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

export default function ActiveCallScreen() {
  const {
    activeCall,
    endCall,
    localStream,
    remoteStream,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall) return null;

  const isVideo = activeCall.callType === "VIDEO";

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="relative flex h-full w-full max-w-5xl flex-col justify-center p-4">
        {activeCall.status === "CONNECTING" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-xl">Connecting...</p>
          </div>
        )}

        <div className={`relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl bg-gray-900 ${isVideo ? "" : "hidden"}`}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-4 right-4 h-36 w-24 sm:h-48 sm:w-32 overflow-hidden rounded-2xl border-2 border-white/20 bg-black shadow-lg shadow-black/50">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {!isVideo && (
          <div className="flex flex-1 flex-col items-center justify-center text-white">
            <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-primary/20">
              <div className="absolute h-full w-full animate-ping rounded-full bg-primary/20"></div>
              <p className="text-3xl sm:text-4xl font-bold">{activeCall.peerId.slice(0, 2).toUpperCase()}</p>
            </div>
            <p className="mt-6 sm:mt-8 text-xl sm:text-2xl font-semibold">Voice Call</p>
          </div>
        )}

        <div className="mt-6 sm:mt-8 flex justify-center gap-4 sm:gap-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          <Button
            onClick={toggleMute}
            variant="outline"
            size="icon"
            className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full border-none text-white ${
              isMuted ? "bg-red-500/80 hover:bg-red-600" : "bg-white/20 hover:bg-white/30"
            }`}
          >
            {isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
          </Button>

          {isVideo && (
            <Button
              onClick={toggleVideo}
              variant="outline"
              size="icon"
              className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full border-none text-white ${
                isVideoOff ? "bg-red-500/80 hover:bg-red-600" : "bg-white/20 hover:bg-white/30"
              }`}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>
          )}

          <Button
            onClick={endCall}
            variant="destructive"
            size="icon"
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full"
          >
            <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

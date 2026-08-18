"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  MicIcon,
  VideoIcon,
  Volume2Icon,
  VideoOffIcon,
  MicOffIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
} from "lucide-react";
import toast from "react-hot-toast";

export default function DeviceSettings() {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");

  // Mic Testing State
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Camera Testing State
  const [isTestingCam, setIsTestingCam] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  // Load available media devices
  const loadDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const videoInputs = devices.filter((d) => d.kind === "videoinput");

      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);

      if (audioInputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (videoInputs.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
    }
  };

  useEffect(() => {
    loadDevices();

    return () => {
      stopMicTest();
      stopCamTest();
    };
  }, []);

  // Microphone test toggle
  const startMicTest = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedAudioDevice
          ? { deviceId: { exact: selectedAudioDevice } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicVolume(normalized);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
      setIsTestingMic(true);
      toast.success("Microphone active! Speak to test level.");
      // Reload devices so labels are populated
      loadDevices();
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsTestingMic(false);
    setMicVolume(0);
  };

  // Camera test toggle
  const startCamTest = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedVideoDevice
          ? { deviceId: { exact: selectedVideoDevice }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      camStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsTestingCam(true);
      toast.success("Camera preview started!");
      loadDevices();
    } catch (err) {
      console.error("Camera access denied:", err);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamTest = () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((track) => track.stop());
      camStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTestingCam(false);
  };

  // Speaker audio test chime (pleasant two-tone chime)
  const playTestTone = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
      toast.success("Playing test audio tone 🔔");
    } catch (err) {
      console.error("Failed to play test audio:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold">Audio & Video Devices</h3>
        <p className="text-xs text-muted-foreground">
          Configure and test your hardware devices before joining real-time WebRTC calls.
        </p>
      </div>

      {/* Microphone Section */}
      <div className="space-y-4 rounded-2xl border border-border bg-card/30 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-sky-500">
              <MicIcon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Microphone</h4>
              <p className="text-xs text-muted-foreground">Select input device and test level</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={isTestingMic ? stopMicTest : startMicTest}
            className="rounded-full gap-2 text-xs"
          >
            {isTestingMic ? (
              <>
                <MicOffIcon className="h-3.5 w-3.5 text-destructive" />
                Stop Test
              </>
            ) : (
              <>
                <MicIcon className="h-3.5 w-3.5" />
                Test Mic
              </>
            )}
          </Button>
        </div>

        {audioDevices.length > 0 && (
          <select
            value={selectedAudioDevice}
            onChange={(e) => {
              setSelectedAudioDevice(e.target.value);
              if (isTestingMic) {
                stopMicTest();
              }
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none"
          >
            {audioDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone (${d.deviceId.slice(0, 8)}...)`}
              </option>
            ))}
          </select>
        )}

        {/* Live Volume Meter */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Input Volume</span>
            <span className="font-mono">{micVolume}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60 border border-border/50">
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                micVolume > 70
                  ? "bg-amber-500"
                  : micVolume > 20
                  ? "bg-emerald-500"
                  : "bg-sky-500"
              }`}
              style={{ width: `${isTestingMic ? Math.max(4, micVolume) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Camera Section */}
      <div className="space-y-4 rounded-2xl border border-border bg-card/30 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <VideoIcon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Camera</h4>
              <p className="text-xs text-muted-foreground">Preview video stream and adjust framing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isTestingCam && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMirrored(!isMirrored)}
                className="h-8 rounded-full text-xs"
              >
                <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
                {isMirrored ? "Mirrored" : "Normal"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={isTestingCam ? stopCamTest : startCamTest}
              className="rounded-full gap-2 text-xs"
            >
              {isTestingCam ? (
                <>
                  <VideoOffIcon className="h-3.5 w-3.5 text-destructive" />
                  Stop Preview
                </>
              ) : (
                <>
                  <VideoIcon className="h-3.5 w-3.5" />
                  Test Camera
                </>
              )}
            </Button>
          </div>
        </div>

        {videoDevices.length > 0 && (
          <select
            value={selectedVideoDevice}
            onChange={(e) => {
              setSelectedVideoDevice(e.target.value);
              if (isTestingCam) {
                stopCamTest();
              }
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none"
          >
            {videoDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera (${d.deviceId.slice(0, 8)}...)`}
              </option>
            ))}
          </select>
        )}

        {/* Camera Live Preview Box */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted/40 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover transition-transform ${
              isMirrored ? "scale-x-[-1]" : ""
            } ${!isTestingCam ? "hidden" : ""}`}
          />
          {!isTestingCam && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-6 text-center">
              <VideoIcon className="h-10 w-10 opacity-30" />
              <p className="text-xs">Camera preview is off. Click &quot;Test Camera&quot; to test your webcam.</p>
            </div>
          )}
        </div>
      </div>

      {/* Speaker Section */}
      <div className="space-y-4 rounded-2xl border border-border bg-card/30 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-500">
              <Volume2Icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Speaker & Audio Output</h4>
              <p className="text-xs text-muted-foreground">Test system sound output</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={playTestTone}
            className="rounded-full gap-2 text-xs"
          >
            <Volume2Icon className="h-3.5 w-3.5" />
            Play Test Sound
          </Button>
        </div>
      </div>
    </div>
  );
}

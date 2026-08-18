import { pusherServer } from "./pusher";

export type CallSignalPayload = 
  | { type: "incoming_call", callId: string, caller: any, callType: "AUDIO" | "VIDEO" }
  | { type: "call_accepted", callId: string }
  | { type: "call_rejected", callId: string }
  | { type: "call_ended", callId: string }
  | { type: "webrtc_offer", callId: string, sdp: any }
  | { type: "webrtc_answer", callId: string, sdp: any }
  | { type: "webrtc_ice_candidate", callId: string, candidate: any };

export function publishCallEvent(userId: string, payload: CallSignalPayload) {
  pusherServer.trigger(`user-${userId}`, "call-event", payload).catch((error) => {
    console.error("Failed to publish call event to Pusher:", error);
  });
}

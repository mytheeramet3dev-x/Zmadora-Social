"use server";

import prisma from "@/lib/prisma";
import { publishCallEvent } from "@/lib/call-events";
import { getDbUserId } from "./user.action";

/**
 * Expose DB user ID to the client (for CallProvider to subscribe to the correct Pusher channel).
 */
export async function getMyDbUserId() {
  return getDbUserId();
}

export async function initiateCall(receiverId: string, type: "AUDIO" | "VIDEO") {
  try {
    const callerId = await getDbUserId();
    if (!callerId) return { success: false, error: "Unauthorized" };

    if (callerId === receiverId) {
      return { success: false, error: "Cannot call yourself" };
    }

    const [caller, receiver] = await Promise.all([
      prisma.user.findUnique({
        where: { id: callerId },
        select: { id: true, name: true, username: true, image: true },
      }),
      prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true },
      }),
    ]);

    if (!caller) return { success: false, error: "Caller not found" };
    if (!receiver) return { success: false, error: "Receiver not found" };

    // Verify relationship: Both users must follow each other (mutual friends) to start a call
    const followRelationship = await prisma.follows.findMany({
      where: {
        OR: [
          { followerId: callerId, followingId: receiverId },
          { followerId: receiverId, followingId: callerId },
        ],
      },
    });

    const isCallerFollowingReceiver = followRelationship.some(
      (f) => f.followerId === callerId && f.followingId === receiverId
    );
    const isReceiverFollowingCaller = followRelationship.some(
      (f) => f.followerId === receiverId && f.followingId === callerId
    );

    if (!isCallerFollowingReceiver || !isReceiverFollowingCaller) {
      return {
        success: false,
        error: "You can only call mutual friends (both users must follow each other)",
      };
    }

    const call = await prisma.call.create({
      data: {
        callerId,
        receiverId,
        type,
        status: "PENDING",
      },
    });

    publishCallEvent(receiverId, {
      type: "incoming_call",
      callId: call.id,
      caller,
      callType: type,
    });

    return { success: true, callId: call.id };
  } catch (error) {
    console.error("Failed to initiate call:", error);
    return { success: false, error: "Failed to initiate call" };
  }
}

export async function updateCallStatus(callId: string, status: "ONGOING" | "COMPLETED" | "REJECTED" | "MISSED") {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const call = await prisma.call.findUnique({ where: { id: callId } });
    if (!call) return { success: false, error: "Call not found" };
    if (call.callerId !== userId && call.receiverId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const data: any = { status };
    if (status === "COMPLETED" || status === "REJECTED" || status === "MISSED") {
      data.endedAt = new Date();
    }

    await prisma.call.update({
      where: { id: callId },
      data,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update call status:", error);
    return { success: false, error: "Failed to update call status" };
  }
}

export async function signalCall(receiverId: string, payload: any) {
  try {
    const callerId = await getDbUserId();
    if (!callerId) return { success: false, error: "Unauthorized" };

    // Validate that the caller has an active call with this receiver
    const callId = payload?.callId;
    if (!callId) return { success: false, error: "Missing callId" };

    const call = await prisma.call.findUnique({ where: { id: callId } });
    if (!call) return { success: false, error: "Call not found" };

    // Verify this user is actually part of this call
    const isParticipant =
      (call.callerId === callerId && call.receiverId === receiverId) ||
      (call.receiverId === callerId && call.callerId === receiverId);

    if (!isParticipant) {
      return { success: false, error: "Unauthorized: not a participant of this call" };
    }

    // Don't allow signaling on ended calls
    if (call.status === "COMPLETED" || call.status === "REJECTED" || call.status === "MISSED") {
      return { success: false, error: "Call already ended" };
    }

    publishCallEvent(receiverId, payload);
    return { success: true };
  } catch (error) {
    console.error("Failed to signal call:", error);
    return { success: false, error: "Failed to signal call" };
  }
}

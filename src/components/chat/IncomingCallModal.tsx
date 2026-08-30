"use client";

import { useCall } from "./CallProvider";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, Video, PhoneOff } from "lucide-react";

interface IncomingCallModalProps {
  caller: any;
  type: "AUDIO" | "VIDEO";
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({ caller, type, onAccept, onReject }: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex w-80 flex-col items-center rounded-3xl border border-white/10 bg-card p-6 shadow-2xl animate-in zoom-in-95">
        <div className="mb-4 text-center">
          <Avatar className="mx-auto h-24 w-24 border-4 border-primary/20">
            <AvatarImage src={caller.image || "/avatar.png"} />
          </Avatar>
          <h2 className="mt-4 text-xl font-bold">{caller.name || caller.username}</h2>
          <p className="text-sm text-muted-foreground">
            Incoming {type === "VIDEO" ? "Video" : "Voice"} Call...
          </p>
        </div>

        <div className="flex w-full justify-center gap-6 mt-4">
          <Button
            onClick={onReject}
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          <Button
            onClick={onAccept}
            size="icon"
            className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
          >
            {type === "VIDEO" ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

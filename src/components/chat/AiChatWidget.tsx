"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { BotIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "สวัสดีครับ ผมคือ Epistemic AI ลองส่งคำสั่งที่ engine รองรับได้เลยครับ เช่น calc 2+3*4",
    },
  ]);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok || !result.message) throw new Error(result.error || "AI request failed");
      setMessages((current) => [...current, { role: "assistant", content: result.message! }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: error instanceof Error ? error.message : "เชื่อมต่อ AI ไม่สำเร็จครับ" },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
        title="คุยกับ AI"
        className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-20 z-[10001] h-12 w-12 rounded-full bg-violet-600 text-white shadow-2xl shadow-violet-600/30 hover:bg-violet-500 md:bottom-6 md:right-24"
      >
        {isOpen ? <XIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />}
      </Button>

      {isOpen ? (
        <section className="fixed bottom-[calc(140px+env(safe-area-inset-bottom,0px))] right-3 z-[10000] flex h-[min(620px,calc(100dvh-180px))] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-xl md:bottom-20 md:right-6">
          <header className="flex items-center gap-3 border-b border-border bg-violet-600 px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <BotIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Zmadora AI</h2>
              <p className="text-[11px] text-white/75">ผู้ช่วยทดลองระบบ</p>
            </div>
          </header>

          <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "bg-violet-600 text-white" : "bg-muted text-foreground"}`}>
                  {message.content}
                </div>
              </div>
            ))}
            {isSending ? <p className="text-xs text-muted-foreground">กำลังคิด...</p> : null}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border p-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="พิมพ์ข้อความ..."
              className="max-h-28 min-h-10 resize-none text-sm"
              rows={1}
              disabled={isSending}
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0 bg-violet-600 hover:bg-violet-500" disabled={isSending || !draft.trim()} aria-label="Send message">
              <SendIcon className="h-4 w-4" />
            </Button>
          </form>
        </section>
      ) : null}
    </>
  );
}

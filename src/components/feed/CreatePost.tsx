"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  BoldIcon,
  Code2Icon,
  EyeIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  PenLineIcon,
  SigmaIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPost } from "@/actions/post.action";
import toast from "react-hot-toast";
import PostContentRenderer from "@/components/posts/renderer/PostContentRenderer";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type PostMode = "TEXT" | "MARKDOWN";

function CreatePost({
  userImage,
  onPostCreated,
}: {
  userImage?: string | null;
  onPostCreated?: () => void;
}) {
  const [mode, setMode] = useState<PostMode>("TEXT");
  const [isPreview, setIsPreview] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 360)}px`;
    }
  };

  const handleInsertHelper = (snippet: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previous = content;
    const next = previous.substring(0, start) + snippet + previous.substring(end);
    setContent(next);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 360)}px`;
    }, 50);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, and GIF are supported");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image size must be 5MB or smaller");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Upload failed");
      }

      setImageUrl(payload.url);
      toast.success("Image attached");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload image";
      toast.error(message);
      setPreviewUrl("");
      setImageUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (isUploading) {
      toast.error("Please wait for the image to finish uploading");
      return;
    }

    if (!content.trim() && !imageUrl) return;

    setIsPosting(true);
    try {
      const result = await createPost(content, imageUrl, mode);
      if (result?.success) {
        setContent("");
        setImageUrl("");
        setPreviewUrl("");
        setIsPreview(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        toast.success("Post published!");
        onPostCreated?.();
      } else {
        toast.error(result?.error || "Failed to create post");
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      toast.error("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const displayImage = imageUrl || previewUrl;

  return (
    <div id="create-post" className="p-3.5 sm:p-4 bg-card/40 transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileSelect}
        disabled={isPosting || isUploading}
      />

      {/* Mode Selector Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
        <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => {
              setMode("TEXT");
              setIsPreview(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mode === "TEXT"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileTextIcon className="h-3.5 w-3.5" />
            <span>Text</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("MARKDOWN")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mode === "MARKDOWN"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SparklesIcon className="h-3.5 w-3.5 text-primary" />
            <span>Markdown · LaTeX</span>
          </button>
        </div>

        {mode === "MARKDOWN" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="h-7 px-2.5 text-xs font-medium rounded-md gap-1.5 border-border shadow-xs"
          >
            {isPreview ? (
              <>
                <PenLineIcon className="h-3 w-3" />
                <span>Edit</span>
              </>
            ) : (
              <>
                <EyeIcon className="h-3 w-3 text-primary" />
                <span>Preview</span>
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar className="h-10 w-10 border border-border shrink-0 mt-0.5">
          <AvatarImage src={userImage || "/avatar.png"} />
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Markdown Helper Toolbar */}
          {mode === "MARKDOWN" && !isPreview && (
            <div className="flex items-center gap-1 py-0.5 overflow-x-auto text-xs text-muted-foreground border-b border-border/30 pb-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleInsertHelper("**bold**")}
                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                title="Bold (**text**)"
              >
                <BoldIcon className="h-3 w-3 mr-1" />
                Bold
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleInsertHelper("\n```ts\n// write code here\n```\n")}
                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground font-mono"
                title="Code block (```lang)"
              >
                <Code2Icon className="h-3 w-3 mr-1 text-primary" />
                Code
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleInsertHelper("\n$$\nE = mc^2\n$$\n")}
                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground font-serif"
                title="LaTeX equation ($$...$$)"
              >
                <SigmaIcon className="h-3 w-3 mr-1 text-primary" />
                LaTeX
              </Button>
            </div>
          )}

          {/* Edit / Write Mode vs Preview Mode */}
          {isPreview ? (
            <div className="min-h-[72px] rounded-xl border border-border/80 bg-background/60 p-3 sm:p-4 text-sm">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Live Preview
              </p>
              {content.trim() ? (
                <PostContentRenderer source={content} contentType="MARKDOWN" showCopyMarkdown={false} />
              ) : (
                <p className="text-xs text-muted-foreground italic">Nothing to preview yet. Type some Markdown!</p>
              )}
            </div>
          ) : (
            <Textarea
              ref={textareaRef}
              placeholder={
                mode === "MARKDOWN"
                  ? "Write Markdown... Supports **bold**, ```code```, and $$LaTeX$$"
                  : "What's happening?"
              }
              className="min-h-[36px] sm:min-h-[40px] w-full resize-none border-none bg-transparent px-1.5 py-1 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 shadow-none leading-relaxed overflow-hidden"
              value={content}
              onChange={handleContentChange}
              disabled={isPosting}
              rows={1}
            />
          )}

          {displayImage && (
            <div className="relative overflow-hidden rounded-md border border-border bg-muted max-h-72">
              <Image
                src={displayImage}
                alt="Post preview"
                width={600}
                height={400}
                className="w-full h-auto object-cover max-h-72"
              />

              {isUploading ? (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5">
                  <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs font-medium text-foreground">Uploading image...</span>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 rounded-md shadow-sm"
                  aria-label="Remove image"
                  onClick={handleRemoveImage}
                  disabled={isPosting}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPosting || isUploading}
                aria-label="Attach photo"
              >
                <ImageIcon className="mr-1.5 h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Photo</span>
              </Button>
            </div>

            <Button
              size="sm"
              className="h-8 px-4 rounded-md font-medium shadow-sm transition-all"
              onClick={handleSubmit}
              disabled={(!content.trim() && !imageUrl) || isPosting || isUploading}
            >
              {isPosting ? (
                <>
                  <Loader2Icon className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Posting...
                </>
              ) : isUploading ? (
                <>
                  <Loader2Icon className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatePost;

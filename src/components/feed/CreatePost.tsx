"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPost } from "@/actions/post.action";
import toast from "react-hot-toast";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function CreatePost({
  userImage,
  onPostCreated,
}: {
  userImage?: string | null;
  onPostCreated?: () => void;
}) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      const result = await createPost(content, imageUrl);
      if (result?.success) {
        setContent("");
        setImageUrl("");
        setPreviewUrl("");
        if (fileInputRef.current) fileInputRef.current.value = "";
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
    <div id="create-post" className="p-4 sm:p-5 bg-card/40 transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileSelect}
        disabled={isPosting || isUploading}
      />

      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar className="h-10 w-10 border border-border shrink-0 mt-0.5">
          <AvatarImage src={userImage || "/avatar.png"} />
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <Textarea
            placeholder="What's happening?"
            className="min-h-[72px] w-full resize-none border-none bg-transparent p-0 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 shadow-none leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isPosting}
          />

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

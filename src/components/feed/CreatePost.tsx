"use client";

import { useState } from "react";
import Image from "next/image";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2Icon, SparklesIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPost } from "@/actions/post.action";
import toast from "react-hot-toast";
import ImageUpload from "@/components/ImageUpload";

function CreatePost({
  userImage,
  onPostCreated,
}: {
  userImage?: string | null;
  onPostCreated?: () => void;
}) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() && !imageUrl) return;

    setIsPosting(true);
    try {
      const result = await createPost(content, imageUrl);
      if (result?.success) {
        setContent("");
        setImageUrl("");
        setShowImageUpload(false);
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

  return (
    <div id="create-post" className="p-4 sm:p-5 bg-card/40 transition-colors">
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

          {imageUrl && (
            <div className="relative overflow-hidden rounded-md border border-border bg-muted max-h-72">
              <Image
                src={imageUrl}
                alt="Post preview"
                width={600}
                height={400}
                className="w-full h-auto object-cover max-h-72"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 rounded-md shadow-sm"
                aria-label="Remove image"
                onClick={() => {
                  setImageUrl("");
                  setShowImageUpload(false);
                }}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          )}

          {showImageUpload && !imageUrl && (
            <div className="overflow-hidden rounded-md border border-border bg-muted/30 p-3">
              <ImageUpload
                value={imageUrl}
                onChange={(url) => {
                  setImageUrl(url);
                  if (url) setShowImageUpload(false);
                }}
                disabled={isPosting}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={() => setShowImageUpload((current) => !current)}
                disabled={isPosting}
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
              disabled={(!content.trim() && !imageUrl) || isPosting}
            >
              {isPosting ? (
                <>
                  <Loader2Icon className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Posting...
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

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlusIcon, Loader2Icon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "./ui/button";

type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function ImageUpload({ value, onChange, disabled = false }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  const validateFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, and GIF are supported");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image size must be 5MB or smaller");
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

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

      onChange(payload.url);
      if (payload.warning) {
        toast(payload.warning, {
          icon: "Info",
        });
      }
      toast.success("Image uploaded");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload image";
      toast.error(message);
      setPreviewUrl(value);
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsUploading(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await uploadFile(files[0]);
  };

  const handleRemove = () => {
    setPreviewUrl("");
    onChange("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
        disabled={disabled || isUploading}
      />

      <button
        type="button"
        className={[
          "flex min-h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled || isUploading ? "cursor-not-allowed opacity-60" : "hover:border-primary/60 hover:bg-muted/40",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !isUploading) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (disabled || isUploading) return;
          void handleFiles(event.dataTransfer.files);
        }}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <>
            <Loader2Icon className="mb-3 size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Uploading image...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Please wait while we process your file
            </p>
          </>
        ) : (
          <>
            <UploadCloudIcon className="mb-3 size-8 text-primary" />
            <p className="text-sm font-medium">Drag and drop an image here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to choose a file. JPG, PNG, WEBP, GIF up to 5MB.
            </p>
          </>
        )}
      </button>

      {previewUrl ? (
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImagePlusIcon className="size-4 text-primary" />
              Image preview
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <Trash2Icon className="mr-2 size-4" />
              Remove
            </Button>
          </div>

          <div className="relative h-40 overflow-hidden rounded-lg border bg-background sm:h-52">
            <Image
              src={previewUrl}
              alt="Upload preview"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 448px"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ImageUpload;

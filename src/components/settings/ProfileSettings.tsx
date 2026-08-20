"use client";

import { updateProfile } from "@/actions/user.action";
import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GlobeIcon, MapPinIcon, Loader2Icon, CheckCircle2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

type ProfileSettingsProps = {
  user: {
    id: string;
    name: string | null;
    username: string;
    bio: string | null;
    location: string | null;
    website: string | null;
    image: string | null;
  };
};

function inputWrapperClass() {
  return "relative flex items-center rounded-2xl border border-border bg-background transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40";
}

function inputClass() {
  return "w-full bg-transparent px-4 py-3 text-[16px] md:text-sm text-foreground outline-none placeholder:text-muted-foreground";
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [location, setLocation] = useState(user.location || "");
  const [website, setWebsite] = useState(user.website || "");
  const [image, setImage] = useState(user.image || "");
  const [isPending, startTransition] = useTransition();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);

    startTransition(async () => {
      const result = await updateProfile({
        name,
        bio,
        location,
        website,
        image,
      });

      if (!result?.success) {
        toast.error(result?.error || "Failed to update profile");
        return;
      }

      toast.success("Profile updated successfully!");
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Public Profile</h3>
        <p className="text-xs text-muted-foreground">
          This information will be displayed publicly on your profile page.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card/30 p-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Profile Photo
        </label>
        <ImageUpload value={image} onChange={setImage} disabled={isPending} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Display Name
          </label>
          <div className={inputWrapperClass()}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              className={inputClass()}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Username
          </label>
          <div className="flex items-center rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-mono">@{user.username}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Username is tied to your account identity.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Location
          </label>
          <div className={inputWrapperClass()}>
            <MapPinIcon className="ml-3.5 h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bangkok, Thailand"
              maxLength={80}
              className={inputClass()}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Website
          </label>
          <div className={inputWrapperClass()}>
            <GlobeIcon className="ml-3.5 h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="yourwebsite.com"
              maxLength={160}
              className={inputClass()}
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bio
          </label>
          <span className="text-xs text-muted-foreground">{bio.length}/280</span>
        </div>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell everyone a little bit about yourself, hobbies, or what you work on..."
          maxLength={280}
          rows={4}
          className="rounded-2xl border-border bg-background shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
          disabled={isPending}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 animate-in fade-in">
            <CheckCircle2Icon className="h-4 w-4" />
            Saved!
          </span>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-full px-6 min-w-[120px]"
        >
          {isPending ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}

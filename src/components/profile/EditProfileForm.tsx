"use client";

import { updateProfile } from "@/actions/user.action";
import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

type EditProfileFormProps = {
  initialName: string;
  initialBio: string;
  initialLocation: string;
  initialWebsite: string;
  initialImage: string;
  onSaved?: (profile: {
    name: string;
    bio: string;
    location: string;
    website: string;
    image: string;
  }) => void;
};

function inputClassName() {
  return "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
}

function EditProfileForm({
  initialName,
  initialBio,
  initialLocation,
  initialWebsite,
  initialImage,
  onSaved,
}: EditProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [website, setWebsite] = useState(initialWebsite);
  const [image, setImage] = useState(initialImage);
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setName(initialName);
    setBio(initialBio);
    setLocation(initialLocation);
    setWebsite(initialWebsite);
    setImage(initialImage);
  };

  const handleSave = () => {
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

      onSaved?.({
        name,
        bio,
        location,
        website,
        image,
      });
      toast.success("Profile updated");
      setIsEditing(false);
    });
  };

  if (!isEditing) {
    return (
      <div className="mt-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          Edit profile
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-md border border-border bg-card p-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Profile photo
        </label>
        <ImageUpload value={image} onChange={setImage} disabled={isPending} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Display name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your display name"
            maxLength={80}
            className={inputClassName()}
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Location
          </label>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Bangkok, Thailand"
            maxLength={80}
            className={inputClassName()}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Website
        </label>
        <input
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder="your-site.com"
          maxLength={160}
          className={inputClassName()}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Bio
        </label>
        <Textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Tell people a bit about yourself..."
          maxLength={280}
          className="min-h-[100px] rounded-md border-border bg-background shadow-sm focus-visible:border-primary"
          disabled={isPending}
        />
        <p className="text-right text-xs text-muted-foreground">{bio.trim().length}/280</p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetForm();
            setIsEditing(false);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

export default EditProfileForm;

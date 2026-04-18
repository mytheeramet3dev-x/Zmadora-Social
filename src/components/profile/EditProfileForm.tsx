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
  return "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-none outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/50";
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
    <div className="mt-4 space-y-4 rounded-[28px] border border-border bg-muted/30 p-4">
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Profile photo
        </label>
        <ImageUpload value={image} onChange={setImage} disabled={isPending} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
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

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
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

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Bio
        </label>
        <Textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Tell people a bit about yourself..."
          maxLength={280}
          className="min-h-[120px] rounded-2xl border-border bg-background shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50"
          disabled={isPending}
        />
        <p className="text-right text-xs text-muted-foreground">{bio.trim().length}/280</p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            resetForm();
            setIsEditing(false);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

export default EditProfileForm;

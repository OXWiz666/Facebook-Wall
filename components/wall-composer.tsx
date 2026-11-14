"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, LoaderCircle, Send, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_LENGTH = 280;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export function WallComposer({
  onShare,
  onAvatarChange,
  disabled,
}: {
  onShare: (body: string, avatar: File | null, image: File | null) => Promise<{ avatarUrl: string | null }>;
  onAvatarChange: (file: File) => Promise<string>;
  disabled: boolean;
}) {
  const [body, setBody] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    setSavedAvatar(localStorage.getItem("wall-guest-avatar"));
  }, []);
  useEffect(() => {
    if (!avatar) { setAvatarPreview(""); return; }
    const url = URL.createObjectURL(avatar);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);
  useEffect(() => {
    if (!image) { setImagePreview(""); return; }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function selectFile(event: ChangeEvent<HTMLInputElement>, kind: "avatar" | "image") {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (file.size > MAX_IMAGE_SIZE) { setError("Images must be 2 MB or smaller."); return; }
    setError("");
    if (kind === "avatar") {
      setAvatar(file);
      try {
        const url = await onAvatarChange(file);
        setSavedAvatar(url);
        setAvatar(null);
        localStorage.setItem("wall-guest-avatar", url);
        window.dispatchEvent(new CustomEvent("thefacewall:avatar-change", { detail: url }));
      } catch (cause) {
        setAvatar(null);
        setError(cause instanceof Error ? cause.message : "Avatar upload failed.");
      }
    } else setImage(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = body.trim();
    if ((!message && !image) || message.length > MAX_LENGTH || disabled || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await onShare(message, null, image);
      if (result.avatarUrl) {
        localStorage.setItem("wall-guest-avatar", result.avatarUrl);
        setSavedAvatar(result.avatarUrl);
      }
      setBody(""); setAvatar(null); setImage(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your post could not be shared. Try again.");
    } finally { setIsSubmitting(false); }
  }

  const remaining = MAX_LENGTH - body.length;
  const canShare = (body.trim().length > 0 || !!image) && remaining >= 0 && !disabled && !isSubmitting;
  const displayedAvatar = avatarPreview || savedAvatar;

  return (
    <section className="rounded-xl border border-[#d5dce8] bg-white shadow-[0_4px_16px_rgba(24,45,78,0.07)]" aria-labelledby="composer-title">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5"><h2 id="composer-title" className="text-sm font-semibold text-slate-700">Share with the community</h2></div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-5">
        <div className="flex gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e7effb] text-[#315b92] ring-1 ring-[#d5dce8]">
            {displayedAvatar ? <img src={displayedAvatar} alt="Your guest avatar" className="size-full object-cover" /> : <UserRound className="size-5" />}
          </div>
          <label htmlFor="post-message" className="sr-only">Your message</label>
          <Textarea id="post-message" value={body} onChange={(event) => setBody(event.target.value)} maxLength={MAX_LENGTH} placeholder="What's on your mind?" aria-describedby="character-count post-error" disabled={disabled || isSubmitting} className="min-h-24 border-0 bg-slate-50 text-[15px] leading-6 focus-visible:ring-1" />
        </div>
        {imagePreview && <div className="relative ml-14 mt-3 w-fit"><img src={imagePreview} alt="Selected post attachment" className="max-h-64 max-w-full rounded-lg object-cover" /><button type="button" onClick={() => setImage(null)} aria-label="Remove attached photo" className="absolute right-2 top-2 rounded-full bg-slate-900/75 p-1.5 text-white"><X className="size-4" /></button></div>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span id="character-count" aria-live="polite" className={remaining < 20 ? "font-semibold text-amber-700" : ""}>{remaining} characters left</span>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 font-medium text-[#4267a9] hover:bg-[#edf3fb]"><UserRound className="size-4" />{displayedAvatar ? "Change avatar" : "Add avatar"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={disabled || isSubmitting} onChange={(event) => selectFile(event, "avatar")} /></label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 font-medium text-[#4267a9] hover:bg-[#edf3fb]"><ImagePlus className="size-4" />{image ? "Change photo" : "Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={disabled || isSubmitting} onChange={(event) => selectFile(event, "image")} /></label>
          </div>
          <Button type="submit" disabled={!canShare}>{isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{isSubmitting ? "Sharing." : "Share"}</Button>
        </div>
        <p id="post-error" role="alert" className="mt-2 min-h-5 text-sm text-red-600">{error}</p>
      </form>
    </section>
  );
}


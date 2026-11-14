"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Bell, ChevronDown, LoaderCircle, Search, UsersRound, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const AVATAR_EVENT = "thefacewall:avatar-change";
export function SiteHeader() {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(localStorage.getItem("wall-guest-avatar") ?? "");
    const updateAvatar = (event: Event) => setAvatarUrl((event as CustomEvent<string>).detail ?? "");
    const updateSearch = (event: Event) => setSearch((event as CustomEvent<string>).detail ?? "");
    window.addEventListener(AVATAR_EVENT, updateAvatar);
    window.addEventListener("thefacewall:search-change", updateSearch);
    const pickAvatar = () => inputRef.current?.click();
    window.addEventListener("thefacewall:pick-avatar", pickAvatar);
    return () => {
      window.removeEventListener(AVATAR_EVENT, updateAvatar);
      window.removeEventListener("thefacewall:search-change", updateSearch);
      window.removeEventListener("thefacewall:pick-avatar", pickAvatar);
    };
  }, []);

  async function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setMessage("Choose an image up to 2 MB."); return;
    }
    if (!supabase) { setMessage("Connect Supabase to upload an avatar."); return; }
    setBusy(true); setMessage("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}-avatar.${ext}`;
    const { error } = await supabase.storage.from("guest-avatars").upload(path, file, { contentType: file.type });
    if (error) setMessage("Avatar upload failed. Check Supabase Storage setup.");
    else {
      const url = supabase.storage.from("guest-avatars").getPublicUrl(path).data.publicUrl;
      localStorage.setItem("wall-guest-avatar", url);
      setAvatarUrl(url);
      window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: url }));
      setMessage("Avatar saved on this browser.");
    }
    setBusy(false);
  }

  function searchWall(value: string) {
    setSearch(value);
    window.dispatchEvent(new CustomEvent("thefacewall:search-change", { detail: value }));
  }

  return <header className="wall-header sticky top-0 z-30 border-b border-[#294b7c] text-white shadow-md">
    <div className="mx-auto flex min-h-[64px] max-w-[1160px] items-center gap-4 px-4 md:px-6">
      <a href="#main" className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20"><UsersRound className="size-[18px]" /></span>
        <span className="text-[19px] font-extrabold tracking-[-0.045em]">TheFaceWall</span>
      </a>
      <label className="ml-2 hidden h-10 max-w-[520px] flex-1 items-center gap-2.5 rounded-lg border border-white/20 bg-white/10 px-3 text-white/80 transition-colors focus-within:bg-white/15 sm:flex">
        <Search className="size-4 shrink-0" /><span className="sr-only">Search posts</span><input value={search} onChange={(e) => searchWall(e.target.value)} placeholder="Search people, posts, and more" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/65" /><kbd className="rounded bg-black/10 px-1.5 py-0.5 text-[10px]">? K</kbd>
      </label>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" aria-label="Notifications" title="No new notifications" className="relative flex size-10 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10"><Bell className="size-[18px]" /><span className="absolute right-2 top-2 size-2 rounded-full border border-[#365f98] bg-amber-300" /></button>
        <div className="mx-1 hidden h-8 w-px bg-white/20 sm:block" />
        <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-white/10" title="Change guest avatar">
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-[#dce9fa] text-xs font-bold text-[#365f98] ring-1 ring-white/30">{busy ? <LoaderCircle className="size-4 animate-spin" /> : avatarUrl ? <img src={avatarUrl} alt="Guest profile" className="size-full object-cover" /> : <UserRound className="size-4" />}</span><span className="hidden sm:inline">Guest</span><ChevronDown className="hidden size-3.5 sm:block" />
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => void changeAvatar(e)} />
      </div>
    </div>
    {message && <div role="status" className="absolute right-4 top-full mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">{message}</div>}
  </header>;
}


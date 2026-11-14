"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowDown, CircleCheck, LoaderCircle, Radio, RefreshCw, Search, ShieldCheck, UsersRound } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { WallPost } from "@/types/post";
import { Button } from "@/components/ui/button";
import { WallComposer } from "@/components/wall-composer";
import { WallPostCard } from "@/components/wall-post-card";

function newestFirst(posts: WallPost[]) { return [...posts].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)); }

export function FacebookWall() {
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [query, setQuery] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [connectionState, setConnectionState] = useState<"connecting" | "live" | "offline" | "setup">(isSupabaseConfigured ? "connecting" : "setup");

  useEffect(() => {
    let id = localStorage.getItem("wall-visitor-id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("wall-visitor-id", id); }
    setVisitorId(id);
  }, []);

  useEffect(() => {
    setAvatarUrl(localStorage.getItem("wall-guest-avatar") ?? "");
    const onAvatar = (event: Event) => setAvatarUrl((event as CustomEvent<string>).detail ?? "");
    const onSearch = (event: Event) => setQuery((event as CustomEvent<string>).detail ?? "");
    window.addEventListener("thefacewall:avatar-change", onAvatar);
    window.addEventListener("thefacewall:search-change", onSearch);
    return () => {
      window.removeEventListener("thefacewall:avatar-change", onAvatar);
      window.removeEventListener("thefacewall:search-change", onSearch);
    };
  }, []);

  const loadPosts = useCallback(async () => {
    if (!supabase) { setIsLoading(false); return; }
    setLoadError("");
    const { data, error } = await supabase.from("posts").select("id, author_name, avatar_url, image_url, body, created_at").order("created_at", { ascending: false }).limit(100);
    if (error) setLoadError("We couldn't load the wall. Check the Supabase setup, then try again.");
    else setPosts((current) => newestFirst([...(data ?? []) as WallPost[], ...current.filter((p) => !(data ?? []).some((row) => row.id === p.id))]));
    const likes = await supabase.from("post_likes").select("post_id, visitor_id");
    if (!likes.error) {
      const counts: Record<string, number> = {};
      for (const like of likes.data ?? []) counts[like.post_id] = (counts[like.post_id] ?? 0) + 1;
      setLikeCounts(counts);
      if (visitorId) setLikedIds((likes.data ?? []).filter((like) => like.visitor_id === visitorId).map((like) => like.post_id));
    }
    setIsLoading(false);
  }, [visitorId]);

  useEffect(() => {
    if (!supabase || !visitorId) { if (!supabase) setIsLoading(false); return; }
    const channel = supabase.channel("public-wall-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        const incoming = payload.new as WallPost;
        setPosts((current) => newestFirst([incoming, ...current.filter((post) => post.id !== incoming.id)]));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionState("live");
        else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) setConnectionState("offline");
      });
    void loadPosts();
    return () => { void supabase?.removeChannel(channel); };
  }, [loadPosts, visitorId]);

  async function upload(file: File, label: string) {
    if (!supabase) throw new Error("Connect Supabase before sharing photos.");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}-${label}.${ext}`;
    const { error } = await supabase.storage.from("guest-avatars").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("Photo upload failed. Check the guest-avatars bucket and upload policy.");
    return supabase.storage.from("guest-avatars").getPublicUrl(path).data.publicUrl;
  }

  async function sharePost(body: string, avatar: File | null, image: File | null) {
    if (!supabase) throw new Error("Add your Supabase URL and public key to .env.local to enable sharing.");
    const avatarUrl = avatar ? await upload(avatar, "avatar") : localStorage.getItem("wall-guest-avatar");
    const imageUrl = image ? await upload(image, "post") : null;
    const { data, error } = await supabase.from("posts").insert({ body: body || " ", avatar_url: avatarUrl, image_url: imageUrl }).select("id, author_name, avatar_url, image_url, body, created_at").single();
    if (error) throw new Error("Your post couldn't be saved. Please check the database setup and try again.");
    const post = data as WallPost;
    setPosts((current) => newestFirst([post, ...current.filter((item) => item.id !== post.id)]));
    return { avatarUrl };
  }

  async function saveAvatar(file: File) {
    const url = await upload(file, "avatar");
    localStorage.setItem("wall-guest-avatar", url);
    setAvatarUrl(url);
    window.dispatchEvent(new CustomEvent("thefacewall:avatar-change", { detail: url }));
    return url;
  }

  async function toggleLike(postId: string) {
    if (!supabase || !visitorId) return;
    const liked = likedIds.includes(postId);
    const result = liked ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("visitor_id", visitorId) : await supabase.from("post_likes").insert({ post_id: postId, visitor_id: visitorId });
    if (result.error) return;
    setLikedIds((ids) => liked ? ids.filter((id) => id !== postId) : [...ids, postId]);
    setLikeCounts((counts) => ({ ...counts, [postId]: Math.max(0, (counts[postId] ?? 0) + (liked ? -1 : 1)) }));
  }

  const filtered = posts.filter((post) => `${post.body} ${post.author_name}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <main className="mx-auto grid w-full max-w-[1080px] grid-cols-1 gap-5 px-4 pb-16 pt-6 md:grid-cols-[210px_minmax(0,1fr)] md:gap-6 md:px-6 md:pt-8">
      <aside className="hidden md:block"><div className="sticky top-6 space-y-3">
        <div className="rounded-xl border border-[#d5dce8] bg-white p-4 shadow-sm"><div className="flex items-center gap-3">{avatarUrl ? <img src={avatarUrl} alt="Guest profile" className="size-11 rounded-full object-cover ring-1 ring-slate-200" /> : <div className="flex size-11 items-center justify-center rounded-full bg-[#d8e7fb] text-sm font-bold text-[#315b92]">G</div>}<div><p className="font-semibold text-slate-800">Guest Visitor</p><p className="text-xs text-slate-500">Your wall profile</p></div></div><button type="button" onClick={() => window.dispatchEvent(new Event("thefacewall:pick-avatar"))} className="mt-3 text-xs font-semibold text-[#4267a9] hover:underline">{avatarUrl ? "Change profile photo" : "Add profile photo"}</button></div>
        <div className="rounded-xl border border-[#d5dce8] bg-white p-3 shadow-sm"><p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">SHORTCUTS</p><div className="space-y-1 text-sm text-slate-600"><div className="flex items-center gap-3 rounded-md bg-[#edf3fb] px-2.5 py-2 font-semibold text-[#365f98]"><UsersRound className="size-4" /> TheFaceWall</div><div className="flex items-center gap-3 rounded-md px-2.5 py-2"><CircleCheck className="size-4" /> Latest posts</div></div></div>
        <p className="px-2 text-[11px] leading-5 text-slate-400">A little corner of the internet, circa 2008.</p>
      </div></aside>
      <section className="min-w-0 space-y-4" aria-label="Community wall">
        {!isSupabaseConfigured && <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" /><div><p className="font-semibold">Connect Supabase to publish your wall</p><p className="mt-1 leading-6">Add your project URL and public key to <code>.env.local</code>, then run <code>supabase/setup.sql</code>.</p></div></div>}
        <WallComposer onShare={sharePost} onAvatarChange={saveAvatar} disabled={!isSupabaseConfigured} />
        <div className="flex flex-col gap-3 px-1 pt-1 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold tracking-tight text-[#233d60]">TheFaceWall</h2><p className="mt-0.5 text-xs text-slate-500">A live feed from around the community</p></div><label className="flex items-center gap-2 rounded-lg border border-[#d5dce8] bg-white px-3 py-2 text-slate-500 shadow-sm"><Search className="size-4" /><span className="sr-only">Search posts</span><input value={query} onChange={(event) => { setQuery(event.target.value); window.dispatchEvent(new CustomEvent("thefacewall:search-change", { detail: event.target.value })); }} placeholder="Search posts" className="w-full bg-transparent text-sm text-slate-700 outline-none sm:w-44" /></label><div className="flex items-center gap-2 text-xs text-slate-500" aria-live="polite">{connectionState === "live" ? <Radio className="size-3.5 text-emerald-600" /> : <span className={`size-2 rounded-full ${connectionState === "connecting" ? "animate-pulse bg-amber-400" : "bg-slate-300"}`} />}<span>{connectionState === "live" ? "Live" : connectionState === "connecting" ? "Connecting" : connectionState === "setup" ? "Not connected" : "Reconnecting"}</span></div></div>
        {loadError && <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><span>{loadError}</span><Button size="sm" variant="outline" onClick={() => { setIsLoading(true); void loadPosts(); }}><RefreshCw className="size-3.5" /> Retry</Button></div>}
        {isLoading ? <div className="flex min-h-32 items-center justify-center gap-2 rounded-lg border border-[#d5dce8] bg-white text-sm text-slate-500"><LoaderCircle className="size-4 animate-spin" /> Loading the latest posts.</div> : filtered.length ? <div className="space-y-3" aria-live="polite">{filtered.map((post) => <WallPostCard key={post.id} post={post} isLiked={likedIds.includes(post.id)} likeCount={likeCounts[post.id] ?? 0} onLike={() => void toggleLike(post.id)} />)}<div className="flex justify-center py-3 text-xs text-slate-400"><ArrowDown className="mr-1.5 size-3.5" /> You&apos;re all caught up</div></div> : !loadError && <div className="rounded-xl border border-dashed border-[#c7d2e0] bg-white/70 px-6 py-12 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#e5eefb] text-[#4267a9]"><Radio className="size-5" /></div><h3 className="mt-4 font-semibold text-slate-800">{query ? "No matching posts" : "It's quiet on the wall"}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{query ? "Try another search term." : "Be the first to share a thought with the community."}</p></div>}
        <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-slate-400"><ShieldCheck className="size-3.5" /> Posts are public and visible to every visitor.</div>
      </section>
    </main>
  );
}


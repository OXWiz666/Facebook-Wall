"use client";

import { useState, type FormEvent } from "react";
import { MessageCircle, ThumbsUp, UserRound, Send, LoaderCircle } from "lucide-react";
import type { WallPost } from "@/types/post";
import { supabase } from "@/lib/supabase/client";

type Comment = { id: string; body: string; created_at: string };
function formatDate(date: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date)); }

export function WallPostCard({ post, isLiked, likeCount, onLike }: { post: WallPost; isLiked: boolean; likeCount: number; onLike: () => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function toggleComments() {
    const opening = !showComments;
    setShowComments(opening);
    if (!opening || comments.length || !supabase) return;
    setIsLoadingComments(true);
    const { data, error } = await supabase.from("post_comments").select("id, body, created_at").eq("post_id", post.id).order("created_at", { ascending: true });
    if (error) setCommentError("Could not load comments."); else setComments(data ?? []);
    setIsLoadingComments(false);
  }

  async function sendComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = comment.trim();
    if (!body || !supabase || isSending) return;
    setIsSending(true); setCommentError("");
    const { data, error } = await supabase.from("post_comments").insert({ post_id: post.id, body }).select("id, body, created_at").single();
    if (error) setCommentError("Your comment couldn't be sent.");
    else { setComments((current) => [...current, data]); setComment(""); }
    setIsSending(false);
  }

  return <article className="post-card overflow-hidden rounded-xl border border-[#d5dce8] bg-white shadow-[0_3px_12px_rgba(24,45,78,0.06)]">
    <div className="flex gap-3 p-4 sm:p-5">
      {post.avatar_url ? <img src={post.avatar_url} alt="Guest avatar" className="size-11 shrink-0 rounded-full object-cover ring-1 ring-[#d5dce8]" /> : <div aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d9e9ff] to-[#a9c9f5] text-[#315b92] ring-1 ring-[#a7bfdc]"><UserRound className="size-5" /></div>}
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="font-semibold text-[#365f98]">{post.author_name}</h2><time className="text-xs text-slate-500" dateTime={post.created_at}>{formatDate(post.created_at)}</time></div>
        {post.body.trim() && <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">{post.body}</p>}
        {post.image_url && <img src={post.image_url} alt="Photo shared by Guest" className="mt-3 max-h-[520px] w-full rounded-lg border border-slate-100 object-cover" />}
      </div>
    </div>
    {(likeCount > 0 || comments.length > 0) && <div className="flex justify-between px-5 pb-2 text-xs text-slate-500"><span>{likeCount ? `?? ${likeCount}` : ""}</span><span>{comments.length ? `${comments.length} comments` : ""}</span></div>}
    <div className="mx-4 border-t border-slate-100 sm:mx-5" />
    <div className="grid grid-cols-2 gap-1 px-3 py-2">
      <button type="button" onClick={onLike} aria-pressed={isLiked} className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium hover:bg-slate-50 ${isLiked ? "text-[#4267a9]" : "text-slate-500"}`}><ThumbsUp className="size-4" />{isLiked ? "Liked" : "Like"}</button>
      <button type="button" onClick={() => void toggleComments()} aria-expanded={showComments} className="inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"><MessageCircle className="size-4" />Comment</button>
    </div>
    {showComments && <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
      {isLoadingComments ? <p className="text-sm text-slate-500">Loading comments.</p> : comments.map((item) => <div key={item.id} className="mb-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700"><p>{item.body}</p><time className="mt-1 block text-[11px] text-slate-400">{formatDate(item.created_at)}</time></div>)}
      <form onSubmit={sendComment} className="mt-2 flex gap-2"><label className="sr-only" htmlFor={`comment-${post.id}`}>Write a comment</label><input id={`comment-${post.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={280} placeholder="Write a comment." className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-300" /><button disabled={!comment.trim() || isSending} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#4267a9] text-white disabled:opacity-50" aria-label="Send comment">{isSending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}</button></form>
      {commentError && <p role="alert" className="mt-2 text-xs text-red-600">{commentError}</p>}
    </div>}
  </article>;
}


import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "TheFaceWall - Your community wall",
  description: "Share a thought and see what the community is saying on TheFaceWall.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader /><div id="main">{children}</div><footer className="mx-auto max-w-[1080px] px-6 pb-8 text-center text-[11px] text-slate-400">TheFaceWall � A little social, circa 2008</footer></body></html>;
}


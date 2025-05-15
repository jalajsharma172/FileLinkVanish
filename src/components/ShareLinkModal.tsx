
import React from "react";
import { Copy, Link, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ShareLinkModal: React.FC<{ link: string; reset: () => void }> = ({
  link,
  reset,
}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied!", description: "Share this with your recipient." });
  };

  const shareNative = async () => {
    try {
      await (navigator as any).share({
        title: "FileSend - Secure File",
        url: link,
      });
    } catch {}
  };

  return (
    <div className="fixed inset-0 bg-gray-900/20 z-30 flex items-center justify-center">
      <div className="bg-white w-full max-w-xs rounded-xl p-6 shadow-2xl flex flex-col items-center animate-scale-in">
        <Link size={30} className="mb-2 text-primary" />
        <div className="text-center text-lg mb-2 font-bold">Link Ready!</div>
        <div
          className="bg-gray-100 rounded p-2 text-xs break-all mb-3 cursor-pointer text-gray-700"
          onClick={copyToClipboard}
        >
          {link}
        </div>
        <div className="flex gap-2 w-full justify-center mb-3">
          <button
            className="bg-primary text-white px-3 py-1 rounded-lg shadow flex items-center gap-2 hover:bg-primary/90 transition-all"
            onClick={copyToClipboard}
          >
            <Copy size={16} /> Copy Link
          </button>
          {navigator.share && (
            <button
              className="bg-secondary text-primary px-2.5 py-1 rounded-lg flex items-center gap-1 shadow hover:bg-secondary/80 transition-all"
              onClick={shareNative}
            >
              <Share2 size={15} /> Share
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 mb-3">
          This file will self-destruct after viewed or after expiry time.
        </div>
        <button
          className="text-primary font-semibold underline text-xs"
          onClick={reset}
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default ShareLinkModal;


import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, File as FileIcon, Clock } from "lucide-react";

const FAKE_API_DELAY = 1200;
// This is placeholder logic - would be replaced by fetch(`/api/file/${id}`)
const fetchFileMeta = async (id: string) => {
  // Simulate no file after view (self-destruct)
  const viewed = window.localStorage.getItem("fileViewed_" + id);
  if (viewed) {
    return { expired: true };
  }
  // Simulated response
  await new Promise(res => setTimeout(res, FAKE_API_DELAY));
  return {
    filename: "secret-document.pdf",
    fileUrl: "https://ipfs.io/ipfs/QmExampleHash", // fake
    size: "1.2 MB",
    expiry: "one-time",
    uploadedAt: Date.now() - 1000 * 60 * 40,
    expiresAt: Date.now() + 1000 * 60 * 20,
    viewed: false,
    fileId: id,
  };
};

const FileView = () => {
  const { id } = useParams();
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchFileMeta(id).then((res) => {
      if (res.expired) setExpired(true);
      else setMeta(res);
      setLoading(false);
    });
  }, [id]);

  const handleDownload = () => {
    if (!meta) return;
    setDownloading(true);
    setTimeout(() => {
      // Mark as viewed, self-destruct
      window.localStorage.setItem("fileViewed_" + id, "true");
      window.location.reload(); // force simulate one-time view
    }, 800);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="flex flex-col items-center animate-fade-in">
          <Loader2 className="animate-spin text-primary mb-2" size={40} />
          <span className="text-primary">Fetching your file…</span>
        </div>
      </div>
    );

  if (expired)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="bg-white/80 p-8 rounded-lg shadow-xl animate-fade-in">
          <h2 className="text-2xl font-semibold text-red-700 mb-2">File Unavailable</h2>
          <p className="text-gray-600 mb-4">This file link has expired or was already viewed.</p>
          <Link className="text-blue-600 hover:underline" to="/">Upload a new file</Link>
        </div>
      </div>
    );

  // Not expired, show download + self-destruct info
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="w-full max-w-lg bg-white/90 rounded-xl shadow-xl p-8 animate-fade-in text-center">
        <FileIcon className="mx-auto mb-4 text-primary" size={46} />
        <div className="mb-4">
          <span className="block text-lg font-bold">{meta.filename}</span>
          <span className="text-gray-500 text-sm">{meta.size}</span>
        </div>
        <button
          onClick={handleDownload}
          className="bg-primary text-white flex items-center gap-2 px-6 py-2 rounded-md shadow hover:bg-primary/90 transition-all mx-auto disabled:opacity-60"
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {downloading ? "Downloading..." : "Download"}
        </button>
        <div className="mt-8 text-gray-600 flex flex-col items-center">
          <Clock size={20} className="mr-1 inline" />
          <span className="inline">
            {meta.expiry === "one-time"
              ? "This file will self-destruct after this download."
              : "Expires soon or after download."}
          </span>
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Uploaded: {new Date(meta.uploadedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default FileView;

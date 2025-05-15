import React, { useRef, useState } from "react";
import ExpirySelector from "./ExpirySelector";
import ShareLinkModal from "./ShareLinkModal";
import { toast } from "@/hooks/use-toast";
import { Upload, FileUp } from "lucide-react";
import { encryptFileWithPassword } from "@/utils/encryption";

const MAX_FILE_SIZE_MB = 25;

// Pinata credentials (publishable for demo)
const PINATA_API_KEY = "cef51513720833c1d72b";
const PINATA_SECRET_API_KEY = "8fc9833cc8bc4bb0e31972ff969112879b6cd5e3c8dcbe3f576e0db1fcc0e397";

// New: bundle metadata and encrypted file as a "FileBundle" (barebones json+file)
async function bundleMetadataAndEncryptedFile({
  file,
  encryptedBlob,
  metadata,
}: {
  file: File;
  encryptedBlob: Blob;
  metadata: any;
}): Promise<FormData> {
  const formData = new FormData();
  const metadataBlob = new Blob([JSON.stringify({ ...metadata, originalName: file.name })], {
    type: "application/json",
  });
  formData.append("file", encryptedBlob, file.name + ".pgp");
  formData.append("metadata", metadataBlob, "metadata.json");
  return formData;
}

async function uploadToPinata(formData: FormData) {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  const headers: Record<string, string> = {
    pinata_api_key: PINATA_API_KEY,
    pinata_secret_api_key: PINATA_SECRET_API_KEY,
    // 'Content-Type': ...  <-- Do NOT include this!
  };

  // Print debugging info for FormData entries
  console.log("Uploading to Pinata: logging FormData entries ---");
  for (const [key, value] of formData.entries()) {
    if (
      value &&
      typeof value === "object" &&
      "size" in value &&
      "type" in value
    ) {
      // Most likely Blob or File
      const obj = value as Blob;
      console.log(
        `FormData field: ${key}, filename: ${"name" in value ? (value as any).name : "blob"}, size: ${obj.size}, type: ${obj.type}`
      );
    } else {
      console.log(`FormData field: ${key}, value: ${value}`);
    }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Pinata upload failed, status:", res.status, "body:", errText);
      throw new Error("IPFS upload failed: " + errText);
    }
    const data = await res.json();
    return data.IpfsHash;
  } catch (e) {
    console.error("Caught error in uploadToPinata:", e);
    throw e;
  }
}

const downloadOptions = [
  { key: 1, label: "One-time (1)" },
  { key: 3, label: "Up to 3 downloads" },
  { key: 99999, label: "Unlimited" },
];

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState<"one-time" | "1h" | "24h" | "7d">("one-time");
  const [downloadLimit, setDownloadLimit] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChangeRaw = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    chooseFile(e.target.files[0]);
  };

  const chooseFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErr(`File too large (max ${MAX_FILE_SIZE_MB}MB)`);
      setFile(null);
      return;
    }
    setErr(null);
    setFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files?.[0]) return;
    chooseFile(e.dataTransfer.files[0]);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      // Log before encrypting
      console.log("Original file object:", file);
      console.log("Original file name:", file.name, "size:", file.size, "type:", file.type);

      // Step 1: Encrypt
      toast({ title: "Encrypting file...", description: "Your file is being encrypted." });
      const encryptedBlob = await encryptFileWithPassword(file);

      console.log("Encrypted blob:", encryptedBlob);
      console.log("Encrypted blob size:", encryptedBlob.size, "type:", encryptedBlob.type);

      // Step 2: Bundle metadata + encrypted file
      const metadata = {
        expiry,
        downloadLimit,
        uploadTime: Date.now(),
      };
      const bundleFormData = await bundleMetadataAndEncryptedFile({
        file,
        encryptedBlob,
        metadata,
      });

      // Step 3: Upload bundle to Pinata/IPFS
      toast({ title: "Uploading to IPFS...", description: "Almost done!" });
      const ipfsHash = await uploadToPinata(bundleFormData);

      // Step 4: Generate shareable link
      const gatewayLink = `${window.location.origin}/file/${ipfsHash}`;

      setShareUrl(gatewayLink);
      setFile(null);
      toast({
        title: "File encrypted & uploaded!",
        description: "Your shareable link is ready.",
      });
    } catch (e) {
      setErr("Upload failed. Try again.");
      toast({
        title: "Upload Failed",
        description: e && typeof e === "object" && "message" in e ? e.message : "Please try again.",
      });
      console.error("Upload error:", e);
    }
    setUploading(false);
  };

  return (
    <>
      <div
        className={`border-2 border-dashed rounded-xl px-6 py-10 flex flex-col items-center justify-center bg-white transition-all ${
          file ? "border-primary" : "border-gray-300"
        } mb-4 relative`}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="absolute inset-0 opacity-0 cursor-pointer"
          style={{ zIndex: 2 }}
          tabIndex={-1}
          onChange={onFileChangeRaw}
          disabled={uploading}
        />
        <div className="flex flex-col items-center gap-3 z-1 pointer-events-none">
          <FileUp size={44} className="text-primary pointer-events-none" />
          <span className="font-medium text-gray-800">
            {file ? file.name : "Drag & drop a file here"}
          </span>
          <span className="text-xs text-gray-500">
            or{" "}
            <span
              className="underline cursor-pointer text-primary"
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
              role="button"
              style={{ pointerEvents: "auto" }}
            >
              browse
            </span>
          </span>
        </div>
      </div>
      {err && <div className="text-red-500 mb-3">{err}</div>}

      {/* Expiry UI */}
      <ExpirySelector expiry={expiry} setExpiry={setExpiry} disabled={uploading} />

      {/* Download limit UI */}
      <div className="mb-2 flex flex-col items-center">
        <span className="text-gray-600 mb-1 text-sm font-medium">Download limit:</span>
        <div className="flex gap-2 flex-wrap justify-center mt-1">
          {downloadOptions.map((opt) => (
            <button
              className={`py-2 px-4 rounded-lg border transition-all text-sm font-medium 
                ${downloadLimit === opt.key ? "bg-primary text-white shadow border-primary" : "bg-white text-primary border-gray-200"}
                hover:shadow-md hover:border-primary focus:outline-none`}
              key={opt.key}
              disabled={uploading}
              onClick={() => !uploading && setDownloadLimit(opt.key)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={!file || uploading}
        className="bg-primary text-white py-2 px-7 rounded-md shadow hover:bg-primary/90 transition-all mt-4 mb-2 w-full disabled:opacity-60"
        onClick={handleUpload}
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <Upload className="animate-spin" size={18} />
            {file ? "Encrypting & Uploading…" : "Uploading…"}
          </span>
        ) : file ? (
          "Encrypt & Upload"
        ) : (
          "Choose a File"
        )}
      </button>
      <div className="text-xs text-gray-400 text-center mb-2">
        Max file size: {MAX_FILE_SIZE_MB}MB. No login required.
      </div>
      {shareUrl && (
        <ShareLinkModal link={shareUrl} reset={() => setShareUrl(null)} />
      )}
    </>
  );
};

export default FileUpload;

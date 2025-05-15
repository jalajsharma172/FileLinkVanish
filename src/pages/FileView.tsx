import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, File as FileIcon, Clock } from "lucide-react";
import { getPlatformPassword } from "@/utils/encryption";
import * as openpgp from "openpgp";

const fetchFileFromIPFS = async (ipfsHash: string) => {
  // First try to fetch the encrypted file
  console.log("IPFS Hash-> "+ipfsHash);
  const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
  if (!response.ok) {
    console.log("Failed to fetch file from IPFS");
    throw new Error("Failed to fetch file from IPFS");
  }
  return response.blob();
};

const decryptFile = async (encryptedBlob: Blob): Promise<Blob | null> => {
  try {
    const encryptedData = await encryptedBlob.arrayBuffer();

    const message = await openpgp.readMessage({
      binaryMessage: new Uint8Array(encryptedData),
    });

    const decrypted = await openpgp.decrypt({
      message,
      passwords: [getPlatformPassword()],
      format: "binary",
    });

    return new Blob([decrypted.data], { type: "application/octet-stream" });

  } catch (error) {
    console.error("Unable to decrypt file:", error);
    return null;
  }
};


const FileView = () => {
  const { id } = useParams();
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      // Fetch encrypted file from IPFS
      
      const encryptedBlob = await fetchFileFromIPFS(id);
      
      // Decrypt the file
      const decryptedBlob = await decryptFile(encryptedBlob);
      console.log("Decrypted data:", decryptedBlob);
      if (!decryptedBlob) {
        toast({
          title: "Decryption Failed",
          description: "Failed to decrypt the file. Please try again.",
          variant: "destructive"
        });
        return;
      }
      // Create download link
      const url = window.URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = meta?.filename || "downloaded-file";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "File downloaded successfully!"
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };



  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="w-full max-w-lg bg-white/90 rounded-xl shadow-xl p-8 animate-fade-in text-center">
        <FileIcon className="mx-auto mb-4 text-primary" size={46} />
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Jalaj Sharma</h1>
                {/*  */}
        <button           onClick={handleDownload}          className="bg-primary text-white flex items-center gap-2 px-6 py-2 rounded-md shadow hover:bg-primary/90 transition-all mx-auto disabled:opacity-60"
          disabled={downloading}>
          {downloading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {downloading ? "Downloading..." : "Download"}
        </button>

       
        {/*  */}
        </div>
      </div>
    </div>
  );
};

export default FileView;

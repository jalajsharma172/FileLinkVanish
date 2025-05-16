
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, File as FileIcon, Clock } from "lucide-react";
import { getPlatformPassword } from "@/utils/encryption";
import * as openpgp from "openpgp";

const fetchJsonFromIPFS = async (ipfsHash: string) => {
  const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
  if (!response.ok) throw new Error("Failed to fetch metadata");
  return response.json();
};

const fetchFileFromIPFS = async (ipfsHash: string) => {
  const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
  if (!response.ok) throw new Error("Failed to fetch file");
  return response.blob();
};

const getExtensionFromMime = (mimeType: string) => {
  const mimeToExt: { [key: string]: string } = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/json": ".json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":".docx",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    // Add more as needed
  };
  return mimeToExt[mimeType] || "";
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
    console.error("Decryption failed:", error);
    return null;
  }
};

const isFileExpired = (meta: any): boolean => {
  if (!meta?.fileExpiry || !meta?.fileUploadTime) return false;
  const uploadTime = meta.fileUploadTime;
  const now = Date.now();
  const expiryMap: { [key: string]: number } = {
    "one-time": 0, // Handled by download limit
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };
  const expiryMs = expiryMap[meta.fileExpiry] || 0;
  return expiryMs > 0 && now > uploadTime + expiryMs;
};

const FileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<any>(null);
  const [encryptedFile, setEncryptedFile] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        toast({ title: "Error", description: "Invalid file ID", variant: "destructive" });
        setLoading(false);
        return;
      }

      try {
        // Fetch metadata
        const metadata = await fetchJsonFromIPFS(id);
        setMeta(metadata);

        // Check expiration
        if (isFileExpired(metadata)) {
          setExpired(true);
          setLoading(false);
          return;
        }

        // Fetch encrypted file
        if (metadata.fileEncryptedCid) {
          const encryptedBlob = await fetchFileFromIPFS(metadata.fileEncryptedCid);
          setEncryptedFile(encryptedBlob);
        } else {
          throw new Error("Encrypted file CID missing");
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load file", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDownload = async () => {
    if (!encryptedFile || !meta) return;
    setDownloading(true);

    try {
      // Decrypt file
      const decryptedBlob = await decryptFile(encryptedFile);
      if (!decryptedBlob) {
        toast({ title: "Decryption Failed", description: "Unable to decrypt file", variant: "destructive" });
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = url;
      const extension = getExtensionFromMime(meta.fileType);
      const baseName = meta.fileName?.replace(/\.[^/.]+$/, "") || "downloaded-file";
      a.download = baseName + extension;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "File downloaded!" });
    } catch (error) {
      toast({ title: "Download Failed", description: "Error downloading file", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="w-full max-w-lg bg-white/90 rounded-xl shadow-xl p-8 text-center">
          <Loader2 className="mx-auto mb-4 text-primary animate-spin" size={46} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="w-full max-w-lg bg-white/90 rounded-xl shadow-xl p-8 text-center">
          <Clock className="mx-auto mb-4 text-red-500" size={46} />
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">File Expired</h1>
          <p className="text-gray-600 mb-4">This file is no longer available.</p>
          <Link to="/" className="text-primary underline">Upload a new file</Link>
        </div>
      </div>
    );
  }

  if (!meta || !encryptedFile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="w-full max-w-lg bg-white/90 rounded-xl shadow-xl p-8 text-center">
          <FileIcon className="mx-auto mb-4 text-red-500" size={46} />
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">File Not Found</h1>
          <p className="text-gray-600 mb-4">Unable to load file.</p>
          <Link to="/" className="text-primary underline">Upload a new file</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="w-full max-w-lg bg-white/90 rounded-xl shadow-xl p-8 text-center">
        <FileIcon className="mx-auto mb-4 text-primary" size={46} />
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">{meta.fileName || "Unknown File"}</h1>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Type: {meta.fileType || "Unknown"}</p>
            <p>Size: {meta.fileSize ? `${(meta.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown"}</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="bg-primary text-white flex items-center gap-2 px-6 py-2 rounded-md shadow hover:bg-primary/90 disabled:opacity-60"
          disabled={downloading}
        >
          {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {downloading ? "Downloading..." : "Download"}
        </button>
      </div>
    </div>
  );
};

export default FileView;



// import React, { useEffect, useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import { toast } from "@/hooks/use-toast";
// import { Loader2, Download, File as FileIcon, Clock } from "lucide-react";
// import { getPlatformPassword } from "@/utils/encryption";
// import * as openpgp from "openpgp";

// const fetchFileFromIPFS = async (ipfsHash: string) => {
//   // First try to fetch the encrypted file
//   console.log("IPFS Hash-> "+ipfsHash);
//   const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
//   if (!response.ok) {
//     console.log("Failed to fetch file from IPFS");
//     throw new Error("Failed to fetch file from IPFS");
//   }

  
//   return response.blob();
// };

// const fetchJsonFromIPFS = async (ipfsHash: string) => {
//   try {
//     const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
//     if (!response.ok) {
//       throw new Error("Failed to fetch metadata");
//     }
//     const data = await response.json();
//     // console.log(data);
//     return data.blob();
//   } catch (error) {
//     console.error("Error fetching metadata:", error);
//     return null;
//   }
// };

// // Fetch .Extensuoin
// function getExtensionFromMime(mimeType) {
//   const mimeToExt = {
//     'application/pdf': '.pdf',
//     'text/plain': '.txt',
//     'application/msword': '.doc',
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
//     'application/vnd.ms-excel': '.xls',
//     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
//     'image/jpeg': '.jpg',
//     'image/png': '.png',
//     'image/gif': '.gif',
//     'application/zip': '.zip',
//     'application/json': '.json',
//     'text/html': '.html',
//     'text/csv': '.csv'
//     // Add more as needed
//   };

//   return mimeToExt[mimeType] || '';
// }

// const decryptFile = async (encryptedBlob: Blob): Promise<Blob | null> => {
//   try {
//     const encryptedData = await encryptedBlob.arrayBuffer();

//     const message = await openpgp.readMessage({
//       binaryMessage: new Uint8Array(encryptedData),
//     });

//     const decrypted = await openpgp.decrypt({
//       message,
//       passwords: [getPlatformPassword()],
//       format: "binary",
//     });

//     return new Blob([decrypted.data], { type: "application/octet-stream" });

//   } catch (error) {
//     console.error("Unable to decrypt file:", error);
//     return null;
//   }
// };

// const FileView = () => {
//   const { id } = useParams();
//   const [meta, setMeta] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [expired, setExpired] = useState(false);
//   const [downloading, setDownloading] = useState(false);
//   const [file, setFile] = useState<File | null>(null);// Origial File - Name 
//   const [encriptedFile, setEncriptedFile] = useState<File | null>(null);// Expired File 
//   const [metadata, setMetadata] = useState<any>(null);//  Metadata - expiry

//   useEffect(() => {
//     const fetchMetadataAndFile = async () => {
//         const ipfsFile=await fetchFileFromIPFS(id);
//         // setFile(await ipfsFile.file);
//         // setEncriptedFile(await ipfsFile)
//     };
//     fetchMetadataAndFile();
//   }, []);

//   const handleDownload = async () => {
//     try {
//       setDownloading(true);
      
//       // Fetch encrypted file from IPFS
//       const encryptedBlob = await fetchFileFromIPFS(id);
      
//       // Decrypt the file
//       // const decryptedBlob = await decryptFile(encryptedBlob);
//       const decryptedBlob = await decryptFile(encriptedFile);
      
//       console.log("Decrypted data:", decryptedBlob);
//       if (!decryptedBlob) {
//         toast({
//           title: "Decryption Failed",
//           description: "Failed to decrypt the file. Please try again.",
//           variant: "destructive"
//         });
//         return;
//       }
//       // Create download link
//       const url = window.URL.createObjectURL(decryptedBlob);
//       const a = document.createElement('a');
//       a.href = url;
//       const extension = getExtensionFromMime(file.type);
//       const baseName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'downloaded-file';
//       a.download = baseName + extension;

//       document.body.appendChild(a);
//       a.click();
//       window.URL.revokeObjectURL(url);
//       document.body.removeChild(a);

//       toast({
//         title: "Success",
//         description: "File downloaded successfully!"
//       });
//     } catch (error) {
//       console.error("Download error:", error);
//       toast({
//         title: "Download Failed",
//         description: "Failed to download file. Please try again.",
//         variant: "destructive"
//       });
//     } finally {
//       setDownloading(false);
//     }
//   };

// useEffect(
// ()=>{
//   if (loading) {
//     return (
//      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
//       <div className="w-full max-w-lg bg-white/90 rounded-xl shadow-xl p-8 animate-fade-in text-center">
//         <FileIcon className="mx-auto mb-4 text-primary" size={46} />
//         <div className="mb-4">
//           <h1 className="text-2xl font-semibold text-gray-800 mb-2">{meta?.originalName || "Unknown File"}</h1>
//           <div className="text-sm text-gray-600 space-y-1">
//             <p>Type: {meta?.fileType || "Unknown"}</p>
//             <p>Size: {meta?.fileSize ? `${(parseInt(meta.fileSize) / 1024 / 1024).toFixed(2)} MB` : "Unknown"}</p>
//           </div>
//         </div>
//         <button
//           onClick={handleDownload}
//           className="bg-primary text-white flex items-center gap-2 px-6 py-2 rounded-md shadow hover:bg-primary/90 transition-all mx-auto disabled:opacity-60"
//           disabled={downloading}
//         >
//           {downloading ? (
//             <Loader2 size={18} className="animate-spin" />
//           ) : (
//             <Download size={18} />
//           )}
//           {downloading ? "Downloading..." : "Download"}
//         </button>
//       </div>
//     </div>
//     );
//   }
// }
//   ,[loading]);

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
//       <div className="w-full max-w-lg bg-white/90 rounded-xl shadow-xl p-8 animate-fade-in text-center">
//         <FileIcon className="mx-auto mb-4 text-primary" size={46} />
//         <div className="mb-4">
//           <h1 className="text-2xl font-semibold text-gray-800 mb-2">{meta?.originalName || "Unknown File"}</h1>
//           <div className="text-sm text-gray-600 space-y-1">
//             <p>Type: {meta?.fileType || "Unknown"}</p>
//             <p>Size: {meta?.fileSize ? `${(parseInt(meta.fileSize) / 1024 / 1024).toFixed(2)} MB` : "Unknown"}</p>
//           </div>
//         </div>
//         <button
//           onClick={handleDownload}
//           className="bg-primary text-white flex items-center gap-2 px-6 py-2 rounded-md shadow hover:bg-primary/90 transition-all mx-auto disabled:opacity-60"
//           disabled={downloading}
//         >
//           {downloading ? (
//             <Loader2 size={18} className="animate-spin" />
//           ) : (
//             <Download size={18} />
//           )}
//           {downloading ? "Downloading..." : "Download"}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default FileView;

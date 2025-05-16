import * as openpgp from "openpgp";
import { toast } from "@/hooks/use-toast";
// A predefined password. Change this to rotate platform encryption.
const PLATFORM_PASSWORD = "FileSendOpenPGP2024Secret!";

export async function encryptFileWithPassword(file: File): Promise<Blob> {
   // Step 1: Encrypt
   toast({ title: "Encrypting file...", description: "Your file is being encrypted." });
  const fileBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(fileBuffer);

  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ binary: uint8Array }),
    passwords: [PLATFORM_PASSWORD],
    format: "binary",
  });

  return new Blob([encrypted], { type: "application/octet-stream" });
}

// Expose the password for decryption elsewhere
export function getPlatformPassword() {
  return PLATFORM_PASSWORD;
}


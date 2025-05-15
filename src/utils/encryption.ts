
import * as openpgp from "openpgp";

// A predefined password. Change this to rotate platform encryption.
const PLATFORM_PASSWORD = "FileSendOpenPGP2024Secret!";

export async function encryptFileWithPassword(file: File): Promise<Blob> {
  const fileBuffer = await file.arrayBuffer();

  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ binary: fileBuffer }),
    passwords: [PLATFORM_PASSWORD],
    format: "binary",
  });

  return new Blob([encrypted], { type: "application/octet-stream" });
}

// Expose the password for decryption elsewhere
export function getPlatformPassword() {
  return PLATFORM_PASSWORD;
}


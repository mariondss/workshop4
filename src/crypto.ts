import crypto, { webcrypto } from "crypto";

// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const { privateKey, publicKey } = await webcrypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
  );
  return { publicKey, privateKey };
}

// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("spki", key);
  const exportedKeyBuffer = new Uint8Array(exportedKey);
  return arrayBufferToBase64(exportedKeyBuffer.buffer);
}

// Export a crypto private key to a base64 string format
export async function exportPrvKey(
    key: webcrypto.CryptoKey | null
): Promise<string | null> {
  if (!key) return null;
  const exportedKey = await webcrypto.subtle.exportKey("pkcs8", key);
  const exportedKeyBuffer = new Uint8Array(exportedKey);
  return arrayBufferToBase64(exportedKeyBuffer.buffer);
}

// Import a base64 string public key to its native format
export async function importPubKey(
    strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
      "spki",
      keyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
  );
}

// Import a base64 string private key to its native format
export async function importPrvKey(
    strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
      "pkcs8",
      keyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
  );
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt(
    b64Data: string,
    strPublicKey: string
): Promise<string> {
  const publicKey = await importPubKey(strPublicKey);
  const dataBuffer = base64ToArrayBuffer(b64Data);
  const encryptedData = await webcrypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      dataBuffer
  );
  return arrayBufferToBase64(encryptedData);
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt(
    data: string,
    privateKey: webcrypto.CryptoKey
): Promise<string> {
  const encryptedDataBuffer = base64ToArrayBuffer(data);
  const decryptedData = await webcrypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      encryptedDataBuffer
  );
  return arrayBufferToBase64(decryptedData);
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  return await webcrypto.subtle.generateKey(
      {
        name: "AES-CBC",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
  );
}

// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string format to its crypto native format
export async function importSymKey(
    strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-CBC",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
  );
}

// Encrypt a message using a symmetric key
export async function symEncrypt(
    key: webcrypto.CryptoKey,
    data: string
): Promise<string> {
  const encodedData = new TextEncoder().encode(data);
  const iv = webcrypto.getRandomValues(new Uint8Array(16));
  const encryptedData = await webcrypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      key,
      encodedData
  );
  const resultBuffer = new Uint8Array(iv.byteLength + encryptedData.byteLength);
  resultBuffer.set(new Uint8Array(iv), 0);
  resultBuffer.set(new Uint8Array(encryptedData), iv.byteLength);
  return arrayBufferToBase64(resultBuffer);
}

export async function symDecrypt(
    strKey: string,
    encryptedData: string
): Promise<string> {
    const key = await importSymKey(strKey);
    const dataBuffer = base64ToArrayBuffer(encryptedData);
    const iv = dataBuffer.slice(0, 16);
    const encryptedDataBuffer = dataBuffer.slice(16);

  const decryptedData = await webcrypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: iv
      },
      key,
      encryptedDataBuffer
  );

  return new TextDecoder().decode(decryptedData);
}

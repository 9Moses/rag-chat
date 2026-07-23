/* localStorage helpers for user persistence with AES encryption using crypto-js */

import CryptoJS from "crypto-js";

const USER_ID_KEY = "rag_chat_user_id";
const USER_EMAIL_KEY = "rag_chat_user_email";
const STORAGE_SECRET_KEY =
  process.env.NEXT_PUBLIC_STORAGE_SECRET_KEY || "rag_chat_secure_secret_key_2026";

/**
 * Encrypts a plain text string using AES.
 */
export function encryptData(value: string): string {
  if (!value) return value;
  return CryptoJS.AES.encrypt(value, STORAGE_SECRET_KEY).toString();
}

/**
 * Decrypts an AES encrypted ciphertext string back to plain text.
 */
export function decryptData(ciphertext: string): string | null {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, STORAGE_SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted) {
      return decrypted;
    }
    // Fallback if value was stored unencrypted
    return ciphertext;
  } catch {
    // Fallback if decryption fails (e.g. unencrypted legacy string)
    return ciphertext;
  }
}

/**
 * Stores an encrypted key-value pair in localStorage.
 */
export function setEncryptedItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    const encrypted = encryptData(value);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error(`Error setting encrypted item for key "${key}":`, error);
  }
}

/**
 * Retrieves and decrypts a value from localStorage.
 */
export function getDecryptedItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return null;
    return decryptData(rawValue);
  } catch (error) {
    console.error(`Error getting decrypted item for key "${key}":`, error);
    return null;
  }
}

/**
 * Removes an item from localStorage.
 */
export function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

export function getUserId(): string | null {
  return getDecryptedItem(USER_ID_KEY);
}

export function setUserId(userId: string): void {
  setEncryptedItem(USER_ID_KEY, userId);
}

export function getUserEmail(): string | null {
  return getDecryptedItem(USER_EMAIL_KEY);
}

export function setUserEmail(email: string): void {
  setEncryptedItem(USER_EMAIL_KEY, email);
}

export function clearUser(): void {
  if (typeof window === "undefined") return;
  removeStorageItem(USER_ID_KEY);
  removeStorageItem(USER_EMAIL_KEY);
}


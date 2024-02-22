import { genSalt, hash } from "bcrypt";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Object that contains the encrypted password and salt.
 *
 * @param password encrypted password
 * @param salt salt used for encryption
 */
interface PasswordObject {
  password: string;
  salt: string;
}

/**
 * Encrypts a password and returns the encrypted password and salt.
 *
 * @param password password to be encrypted
 * @param salt salt to be used for encryption
 * @returns encrypted password and salt
 */
export async function encryptPassword(
  password: string,
  salt?: string
): Promise<PasswordObject> {
  const usedSalt = salt ? salt : await genSalt(10);
  const hashedPassword = await hash(password, usedSalt);

  const remadePassword = hashedPassword.split("$")[3].slice(22);

  return {
    password: remadePassword,
    salt: usedSalt,
  };
}

/**
 * Encrypts a text using a symmetric key and returns the encrypted text and iv.
 *
 * @param text text to encrypt
 * @param key secret key
 * @returns encrypted text and iv
 */
export function encryptSymmetric(text: string, key: string) {
  const iv = randomBytes(16).toString("base64");

  const cipher = createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "base64")
  );

  let ciphertext = cipher.update(text, "utf8", "base64");

  ciphertext += cipher.final("base64");

  return { ciphertext, iv };
}

/**
 * Decrypts a text using a symmetric key and iv.
 *
 * @param key secret key
 * @param ciphertext encrypted text
 * @param iv initialization vector
 * @returns decrypted text
 */
export function decryptSymmetric(key: string, ciphertext: string, iv: string) {
  const decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "base64")
  );

  let plaintext = decipher.update(ciphertext, "base64", "utf8");

  plaintext += decipher.final("utf8");

  return plaintext;
}

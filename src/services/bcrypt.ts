import { genSalt, hash } from "bcrypt";

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

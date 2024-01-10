import { initializeApp } from "firebase/app"; // for init firebase

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import "dotenv/config"; // config from .env

// init firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};
initializeApp(firebaseConfig);

const auth = getAuth(); // firebase auth

/**
 * Registers a new user to firebase and returns the created user.
 * Also logs the user in.
 *
 * @param email user's email
 * @param password user's password
 * @returns created user in firebase
 */
export async function registerUser(email: string, password: string) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;

  return user;
}

/**
 * Logs in a user to firebase and returns the logged in user.
 *
 * @param email user's email
 * @param password user's password
 * @returns logged in user in firebase
 */
export async function signIn(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;

  return user;
}

/**
 * Logs out the current user.
 *
 * @returns void
 */
export async function signOut() {
  await auth.signOut();
}

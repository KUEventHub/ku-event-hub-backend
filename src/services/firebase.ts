import { initializeApp } from "firebase/app"; // for init firebase
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
} from "firebase/storage";

import "dotenv/config"; // config from .env

// init firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};
initializeApp(firebaseConfig);

// init references
const auth = getAuth(); // firebase auth
const storage = getStorage(); // firebase storage

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

/**
 * Uploads a profile picture to firebase storage and returns the url of the uploaded image.
 * Needs user to be logged in before calling.
 * 
 * @param auth0id user's auth0 id
 * @param base64Image base64 encoded image
 * @returns url of the uploaded image
 */
export async function uploadProfilePicture(
  auth0id: string,
  base64Image: string
) {
  const profilePictureRef = ref(storage, `profile-pictures/${auth0id}.png`);
  await uploadString(profilePictureRef, base64Image, "base64");

  const pictureUrl = await getDownloadURL(profilePictureRef);
  return pictureUrl;
}

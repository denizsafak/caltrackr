import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './config';
import { createUserProfile, getUserProfile } from './firestore';

export async function signUpWithEmail(email: string, password: string, name: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await createUserProfile(credential.user.uid, {
    name,
    email,
    photoURL: null,
  });
  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogleWeb() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const existingProfile = await getUserProfile(result.user.uid);
  if (!existingProfile) {
    await createUserProfile(result.user.uid, {
      name: result.user.displayName ?? 'User',
      email: result.user.email ?? '',
      photoURL: result.user.photoURL,
    });
  }
  return { user: result.user, isNewUser: !existingProfile };
}

export async function signInWithGoogle(idToken: string, accessToken?: string) {
  const googleCredential = GoogleAuthProvider.credential(idToken, accessToken);
  const result = await signInWithCredential(auth, googleCredential);

  const existingProfile = await getUserProfile(result.user.uid);
  if (!existingProfile) {
    await createUserProfile(result.user.uid, {
      name: result.user.displayName ?? 'User',
      email: result.user.email ?? '',
      photoURL: result.user.photoURL,
    });
  }
  return { user: result.user, isNewUser: !existingProfile };
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

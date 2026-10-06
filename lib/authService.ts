import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import type { Auth } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase';
import { isPreview } from '@/lib/preview';

/** Deliberately minimal: no token, no role. The server only ever needs the verified uid from the ID token. */
export interface AuthUser {
  uid: string;
  email: string | null;
}

export interface AuthService {
  /** False when Firebase config is missing: sign-in then cannot succeed (nothing is faked). */
  readonly isConfigured: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  getCurrentUser(): AuthUser | null;
  /** Fires once with the restored (or absent) session, then on every change. Returns an unsubscribe. */
  subscribe(listener: (user: AuthUser | null) => void): () => void;
  /** A current, SDK-refreshed Firebase ID token, or null when signed out. Never logged or persisted by the app. */
  getIdToken(): Promise<string | null>;
  signOut(): Promise<void>;
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('Firebase is not configured. Set the EXPO_PUBLIC_FIREBASE_* variables (see customer/.env.example).');
    this.name = 'AuthNotConfiguredError';
  }
}

const toUser = (u: { uid: string; email: string | null }): AuthUser => ({ uid: u.uid, email: u.email });

/**
 * Email + password through the Firebase JS SDK: works on web, iOS and Android
 * with no native build. Phone OTP on native needs a development build with
 * native Firebase (decision 031); this interface is what it would plug into.
 */
export class FirebaseAuthService implements AuthService {
  constructor(private readonly auth: Auth | null) {}

  get isConfigured() {
    return this.auth !== null;
  }

  private requireAuth(): Auth {
    if (!this.auth) throw new AuthNotConfiguredError();
    return this.auth;
  }

  async signIn(email: string, password: string) {
    await signInWithEmailAndPassword(this.requireAuth(), email, password);
  }

  async signUp(email: string, password: string) {
    await createUserWithEmailAndPassword(this.requireAuth(), email, password);
  }

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(this.requireAuth(), email);
  }

  getCurrentUser() {
    const u = this.auth?.currentUser;
    return u ? toUser(u) : null;
  }

  subscribe(listener: (user: AuthUser | null) => void) {
    if (!this.auth) {
      listener(null);
      return () => {};
    }
    return onAuthStateChanged(this.auth, (u) => listener(u ? toUser(u) : null));
  }

  async getIdToken() {
    await this.auth?.authStateReady();
    const u = this.auth?.currentUser;
    // Returns the cached token and refreshes it near expiry: no custom refresh logic.
    return u ? u.getIdToken() : null;
  }

  async signOut() {
    await this.auth?.signOut();
  }
}

/** Dev preview only (lib/preview.ts): an always-signed-in stand-in; the token is never sent anywhere. */
class PreviewAuthService implements AuthService {
  readonly isConfigured = true;
  private user: AuthUser | null = { uid: 'preview-customer', email: 'preview@example.com' };
  private listeners = new Set<(u: AuthUser | null) => void>();

  private set(user: AuthUser | null) {
    this.user = user;
    this.listeners.forEach((l) => l(user));
  }
  async signIn() {
    this.set({ uid: 'preview-customer', email: 'preview@example.com' });
  }
  async signUp() {
    this.set({ uid: 'preview-customer', email: 'preview@example.com' });
  }
  async sendPasswordReset() {}
  getCurrentUser() {
    return this.user;
  }
  subscribe(listener: (u: AuthUser | null) => void) {
    this.listeners.add(listener);
    listener(this.user);
    return () => {
      this.listeners.delete(listener);
    };
  }
  async getIdToken() {
    return this.user ? 'preview-not-a-real-token' : null;
  }
  async signOut() {
    this.set(null);
  }
}

export const authService: AuthService = isPreview ? new PreviewAuthService() : new FirebaseAuthService(getFirebaseAuth());

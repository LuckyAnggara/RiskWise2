
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { getUserDocument } from '@/services/userService';
import type { AppUser } from '@/lib/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean; // This is isLoadingOverall (authLoading || profileLoading)
  profileLoading: boolean; // Explicitly provide profileLoading status
  isProfileComplete: boolean;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_FALLBACK_UPR_ID = 'Pengguna'; // Digunakan jika displayName null
const DEFAULT_PERIOD = new Date().getFullYear().toString();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Loading status for Firebase Auth
  const [profileLoading, setProfileLoading] = useState(false); // Loading status for Firestore profile
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    if (user) {
      console.log("[AuthContext] fetchAppUser: Called for UID:", user.uid);
      setProfileLoading(true);
      try {
        const userDoc = await getUserDocument(user.uid);
        console.log("[AuthContext] fetchAppUser: AppUser data from Firestore:", JSON.stringify(userDoc));
        if (userDoc) {
          setAppUser(userDoc);
          const profileIsComplete = !!(userDoc.displayName && userDoc.uprId && userDoc.activePeriod && userDoc.availablePeriods && userDoc.availablePeriods.length > 0);
          setIsProfileComplete(profileIsComplete);
          console.log("[AuthContext] fetchAppUser: Profile complete status:", profileIsComplete);
        } else {
          setAppUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            role: 'userSatker',
            uprId: user.displayName || null,
            activePeriod: null,
            availablePeriods: [],
            createdAt: new Date().toISOString(),
          });
          setIsProfileComplete(false);
          console.log("[AuthContext] fetchAppUser: No Firestore doc or incomplete, profile set to incomplete.");
        }
      } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("[AuthContext] fetchAppUser: Failed to fetch/create AppUser from Firestore:", errorMessage);
        setAppUser(null);
        setIsProfileComplete(false);
      } finally {
        setProfileLoading(false);
      }
    } else {
      console.log("[AuthContext] fetchAppUser: No Firebase user, setting appUser to null.");
      setAppUser(null);
      setIsProfileComplete(false);
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("[AuthContext] onAuthStateChanged listener attached.");
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged: Firebase user state changed. User:", user ? user.uid : "null");
      setCurrentUser(user);
      try {
        await fetchAppUser(user);
      } catch (error) {
        console.error("[AuthContext] onAuthStateChanged: Error during fetchAppUser call:", error);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      console.log("[AuthContext] onAuthStateChanged listener detached.");
      unsubscribe();
    };
  }, [fetchAppUser]);

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      console.log(`[AuthContext] refreshAppUser called for UID: ${currentUser.uid}`);
      setProfileLoading(true);
      try {
        const userDoc = await getUserDocument(currentUser.uid);
        console.log("[AuthContext] refreshAppUser: AppUser data from Firestore:", JSON.stringify(userDoc));
        if (userDoc) {
          setAppUser(userDoc);
          const profileIsComplete = !!(userDoc.displayName && userDoc.uprId && userDoc.activePeriod && userDoc.availablePeriods && userDoc.availablePeriods.length > 0);
          setIsProfileComplete(profileIsComplete);
          console.log("[AuthContext] refreshAppUser: Profile complete status:", profileIsComplete);
        } else {
           setAppUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || null,
            photoURL: currentUser.photoURL || null,
            role: 'userSatker',
            uprId: currentUser.displayName || null,
            activePeriod: null,
            availablePeriods: [],
            createdAt: new Date().toISOString(),
          });
          setIsProfileComplete(false);
          console.log("[AuthContext] refreshAppUser: No Firestore doc found after refresh, profile set to incomplete.");
        }
      } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("[AuthContext] refreshAppUser: Error fetching user document:", errorMessage);
        setAppUser(null);
        setIsProfileComplete(false);
      } finally {
        setProfileLoading(false);
      }
    } else {
      console.log("[AuthContext] refreshAppUser: No current user, skipping refresh.");
      setAppUser(null);
      setIsProfileComplete(false);
      setProfileLoading(false);
    }
  }, [currentUser]);

  const isLoadingOverall = authLoading || profileLoading;

  if (authLoading) { // Show loading screen if Firebase Auth is still loading
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          Memverifikasi sesi...
        </p>
      </div>
    );
  }
  
  // At this point, authLoading is false.
  // If profileLoading is true, AuthProvider's children (AppLayout) might still need to wait
  // or handle this profileLoading state. The value passed in context will reflect this.

  return (
    <AuthContext.Provider value={{ currentUser, appUser, loading: isLoadingOverall, profileLoading, isProfileComplete, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

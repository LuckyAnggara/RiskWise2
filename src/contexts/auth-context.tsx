
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
  authContextLoading: boolean;
  profileLoading: boolean;
  isProfileComplete: boolean;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authContextLoadingInternal, setAuthContextLoadingInternal] = useState(true);
  const [profileLoadingInternal, setProfileLoadingInternal] = useState(true);
  const [isProfileCompleteInternal, setIsProfileCompleteInternal] = useState(false);

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    console.log("[AuthContext] fetchAppUser: Called with Firebase user:", user ? user.uid : "null");
    if (user) {
      console.log("[AuthContext] fetchAppUser: Setting profileLoadingInternal to true for UID:", user.uid);
      setProfileLoadingInternal(true);
      try {
        const userDoc = await getUserDocument(user.uid);
        console.log("[AuthContext] fetchAppUser: Raw AppUser data from userService for UID", user.uid, ":", JSON.stringify(userDoc));
        if (userDoc) {
          setAppUser(userDoc);
          // Profile is complete if displayName, activePeriod, availablePeriods, AND uprId (actual UPR document ID) are present.
          const profileIsConsideredComplete = !!(
            userDoc.displayName &&
            userDoc.activePeriod &&
            userDoc.availablePeriods && userDoc.availablePeriods.length > 0 &&
            userDoc.uprId && typeof userDoc.uprId === 'string' && userDoc.uprId.trim() !== '' // uprId must be a non-empty string
          );
          setIsProfileCompleteInternal(profileIsConsideredComplete);
          console.log(`[AuthContext] fetchAppUser: Profile complete for UID ${user.uid}? ${profileIsConsideredComplete}. DisplayName: ${userDoc.displayName}, ActivePeriod: ${userDoc.activePeriod}, UPR ID from Firestore: ${userDoc.uprId}`);
        } else {
          setAppUser(null);
          setIsProfileCompleteInternal(false);
          console.log("[AuthContext] fetchAppUser: No Firestore doc (appUser is null), profile set to incomplete for UID:", user.uid);
        }
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[AuthContext] fetchAppUser: Failed to fetch AppUser for UID:", user.uid, "Error:", errorMessage);
        setAppUser(null);
        setIsProfileCompleteInternal(false);
      } finally {
        console.log("[AuthContext] fetchAppUser: Setting profileLoadingInternal to false for UID:", user ? user.uid : "null");
        setProfileLoadingInternal(false);
      }
    } else {
      console.log("[AuthContext] fetchAppUser: No Firebase user, setting appUser to null and profile states. Setting profileLoadingInternal to false.");
      setAppUser(null);
      setIsProfileCompleteInternal(false);
      setProfileLoadingInternal(false);
    }
  }, []);

  useEffect(() => {
    console.log("[AuthContext] onAuthStateChanged listener attaching.");
    setAuthContextLoadingInternal(true); // Ensure loading is true when listener attaches
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged: Firebase user state changed. New user:", user ? user.uid : "null");
      setCurrentUser(user);
      try {
        await fetchAppUser(user);
      } catch (error) {
        console.error("[AuthContext] onAuthStateChanged: Error from fetchAppUser during auth state change:", error);
      } finally {
        console.log("[AuthContext] onAuthStateChanged callback finished. Setting authLoadingInternal to false.");
        setAuthContextLoadingInternal(false);
      }
    });

    return () => {
      console.log("[AuthContext] onAuthStateChanged listener detaching.");
      unsubscribe();
    };
  }, [fetchAppUser]);

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      console.log(`[AuthContext] refreshAppUser called for UID: ${currentUser.uid}. Triggering fetchAppUser.`);
      await fetchAppUser(currentUser);
    } else {
      console.log("[AuthContext] refreshAppUser: No current Firebase user. Calling fetchAppUser(null).");
      await fetchAppUser(null); 
    }
  }, [currentUser, fetchAppUser]);

  return (
    <AuthContext.Provider value={{
        currentUser,
        appUser,
        authContextLoading: authContextLoadingInternal,
        profileLoading: profileLoadingInternal,
        isProfileComplete: isProfileCompleteInternal,
        refreshAppUser
    }}>
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

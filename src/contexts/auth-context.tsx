
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
  const [authContextLoading, setAuthContextLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true); // Start as true
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    console.log("[AuthContext] fetchAppUser: Called with user:", user ? user.uid : "null");
    if (user) {
      console.log("[AuthContext] fetchAppUser: Setting profileLoading to true for UID:", user.uid);
      setProfileLoading(true);
      try {
        const userDoc = await getUserDocument(user.uid);
        console.log("[AuthContext] fetchAppUser: AppUser data from Firestore for UID", user.uid, ":", JSON.stringify(userDoc));
        if (userDoc) {
          setAppUser(userDoc);
          // Profile is complete if displayName, activePeriod, availablePeriods, AND uprId are present.
          const profileIsConsideredComplete = !!(
            userDoc.displayName &&
            userDoc.activePeriod &&
            userDoc.availablePeriods && userDoc.availablePeriods.length > 0 &&
            userDoc.uprId // uprId must be present and not null/undefined
          );
          setIsProfileComplete(profileIsConsideredComplete);
          console.log(`[AuthContext] fetchAppUser: Profile complete for UID ${user.uid}? ${profileIsConsideredComplete}. DisplayName: ${userDoc.displayName}, ActivePeriod: ${userDoc.activePeriod}, UPR ID from Firestore: ${userDoc.uprId}`);
        } else {
          setAppUser(null);
          setIsProfileComplete(false);
          console.log("[AuthContext] fetchAppUser: No Firestore doc, profile set to incomplete for UID:", user.uid);
        }
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[AuthContext] fetchAppUser: Failed to fetch AppUser for UID:", user.uid, "Error:", errorMessage);
        setAppUser(null);
        setIsProfileComplete(false);
      } finally {
        console.log("[AuthContext] fetchAppUser: Setting profileLoading to false for UID:", user ? user.uid : "null");
        setProfileLoading(false);
      }
    } else {
      console.log("[AuthContext] fetchAppUser: No Firebase user, setting appUser to null and profile states. Setting profileLoading to false.");
      setAppUser(null);
      setIsProfileComplete(false);
      setProfileLoading(false); // Ensure profileLoading is false if no user
    }
  }, []);

  useEffect(() => {
    console.log("[AuthContext] onAuthStateChanged listener attaching.");
    setAuthContextLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged: Firebase user state changed. New user:", user ? user.uid : "null");
      setCurrentUser(user);
      try {
        await fetchAppUser(user);
      } catch (error) {
        console.error("[AuthContext] onAuthStateChanged: Error from fetchAppUser:", error);
      } finally {
        console.log("[AuthContext] onAuthStateChanged callback finished. Setting authContextLoading to false.");
        setAuthContextLoading(false);
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
      console.log("[AuthContext] refreshAppUser: No current user. Calling fetchAppUser(null).");
      await fetchAppUser(null); // This will clear appUser and set profile incomplete
    }
  }, [currentUser, fetchAppUser]);

  return (
    <AuthContext.Provider value={{
        currentUser,
        appUser,
        authContextLoading,
        profileLoading,
        isProfileComplete,
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

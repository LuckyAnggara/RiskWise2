
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
  authContextLoading: boolean; // Diganti dari 'loading'
  profileLoading: boolean; 
  isProfileComplete: boolean;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoadingInternal, setAuthLoadingInternal] = useState(true); // State internal untuk auth Firebase
  const [profileLoadingInternal, setProfileLoadingInternal] = useState(false); 
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    if (user) {
      console.log("[AuthContext] fetchAppUser: Called for UID:", user.uid);
      setProfileLoadingInternal(true);
      try {
        const userDoc = await getUserDocument(user.uid);
        console.log("[AuthContext] fetchAppUser: AppUser data from Firestore:", JSON.stringify(userDoc));
        if (userDoc) {
          setAppUser(userDoc);
          let profileIsConsideredComplete = !!(
            userDoc.displayName &&
            userDoc.activePeriod &&
            userDoc.availablePeriods &&
            userDoc.availablePeriods.length > 0 &&
            userDoc.uprId 
          );

          if (userDoc.role === 'userSatker') {
            profileIsConsideredComplete = profileIsConsideredComplete && !!userDoc.assignedUprId;
          }
          
          setIsProfileComplete(profileIsConsideredComplete);
          console.log("[AuthContext] fetchAppUser: Profile complete status for UID", user.uid, ":", profileIsConsideredComplete, "Role:", userDoc.role, "AssignedUPR:", userDoc.assignedUprId);
        } else {
          setAppUser(null); // Explicitly set appUser to null if Firestore doc not found
          setIsProfileComplete(false);
          console.log("[AuthContext] fetchAppUser: No Firestore doc, profile set to incomplete for UID:", user.uid);
        }
      } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("[AuthContext] fetchAppUser: Failed to fetch AppUser from Firestore for UID:", user.uid, "Error:", errorMessage);
        setAppUser(null);
        setIsProfileComplete(false);
      } finally {
        setProfileLoadingInternal(false);
      }
    } else {
      console.log("[AuthContext] fetchAppUser: No Firebase user, setting appUser to null.");
      setAppUser(null);
      setIsProfileComplete(false);
      setProfileLoadingInternal(false);
    }
  }, []);

  useEffect(() => {
    console.log("[AuthContext] onAuthStateChanged listener attached.");
    setAuthLoadingInternal(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged: Firebase user state changed. User:", user ? user.uid : "null");
      setCurrentUser(user); // Selalu update currentUser dari Firebase Auth
      try {
        await fetchAppUser(user); // Kemudian coba fetch/set appUser berdasarkan user Firebase
      } catch (error) {
        console.error("[AuthContext] onAuthStateChanged: Error during fetchAppUser call:", error);
      } finally {
        setAuthLoadingInternal(false); // Auth process (Firebase + Firestore attempt) is complete
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
      await fetchAppUser(currentUser); 
    } else {
      console.log("[AuthContext] refreshAppUser: No current user, skipping refresh.");
      // State appUser, isProfileComplete, profileLoadingInternal sudah dihandle oleh fetchAppUser(null)
    }
  }, [currentUser, fetchAppUser]);
  
  const isLoadingOverall = authLoadingInternal || profileLoadingInternal;
  
  return (
    <AuthContext.Provider value={{ currentUser, appUser, authContextLoading: isLoadingOverall, profileLoading: profileLoadingInternal, isProfileComplete, refreshAppUser }}>
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

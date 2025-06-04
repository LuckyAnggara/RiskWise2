
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
  loading: boolean; 
  profileLoading: boolean; 
  isProfileComplete: boolean;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_INITIAL_PERIOD = new Date().getFullYear().toString();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true); 
  const [profileLoading, setProfileLoading] = useState(false); 
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
          let profileIsConsideredComplete = !!(
            userDoc.displayName &&
            userDoc.activePeriod &&
            userDoc.availablePeriods &&
            userDoc.availablePeriods.length > 0 &&
            userDoc.uprId // UprId should be same as displayName for non-admin/auditor, or assigned for userSatker
          );

          if (userDoc.role === 'userSatker') {
            profileIsConsideredComplete = profileIsConsideredComplete && !!userDoc.assignedUprId;
          }
          // Admin and Auditor don't need assignedUprId to be considered complete for basic operations.
          // Specific UPR selection for admin/auditor is a separate UI concern.

          setIsProfileComplete(profileIsConsideredComplete);
          console.log("[AuthContext] fetchAppUser: Profile complete status for UID", user.uid, ":", profileIsConsideredComplete, "Role:", userDoc.role, "AssignedUPR:", userDoc.assignedUprId);
        } else {
          // New user or Firestore doc missing, profile is incomplete.
          setAppUser({ // Set a base AppUser structure
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            role: 'userSatker', // Default for new sign-ups
            uprId: null, // Will be set based on displayName or assignment
            assignedUprId: null,
            activePeriod: null,
            availablePeriods: [],
            createdAt: new Date().toISOString(),
          });
          setIsProfileComplete(false);
          console.log("[AuthContext] fetchAppUser: No Firestore doc, profile set to incomplete for UID:", user.uid);
        }
      } catch (error: any) {
        const errorMessage = error.message && typeof error.message === 'string' ? error.message : String(error);
        console.error("[AuthContext] fetchAppUser: Failed to fetch/create AppUser from Firestore for UID:", user.uid, "Error:", errorMessage);
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
      await fetchAppUser(currentUser); 
    } else {
      console.log("[AuthContext] refreshAppUser: No current user, skipping refresh.");
      setAppUser(null);
      setIsProfileComplete(false);
      setProfileLoading(false);
    }
  }, [currentUser, fetchAppUser]);

  const isLoadingOverall = authLoading || profileLoading;
  
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

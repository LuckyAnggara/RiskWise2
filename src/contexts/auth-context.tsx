
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
          let profileIsComplete = !!(userDoc.displayName && userDoc.activePeriod && userDoc.availablePeriods && userDoc.availablePeriods.length > 0);
          if (userDoc.role === 'userSatker' && !userDoc.assignedUprId) {
            profileIsComplete = false; // userSatker must have an assigned UPR
          }
          setIsProfileComplete(profileIsComplete);
          console.log("[AuthContext] fetchAppUser: Profile complete status:", profileIsComplete, "Role:", userDoc.role, "AssignedUPR:", userDoc.assignedUprId);
        } else {
          // User exists in Firebase Auth but not in Firestore users collection (new user, or error)
          // Set a default appUser structure and mark profile as incomplete
          setAppUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || null, // Firebase Auth displayName or null
            photoURL: user.photoURL || null,
            role: 'userSatker', // Default role for new users
            assignedUprId: null, // Will be set during profile setup or by admin
            activePeriod: null, // Will be set during profile setup
            availablePeriods: [], // Will be set during profile setup
            createdAt: new Date().toISOString(), // Or serverTimestamp if setting up a new doc
          });
          setIsProfileComplete(false);
          console.log("[AuthContext] fetchAppUser: No Firestore doc or initial setup needed, profile set to incomplete.");
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
      await fetchAppUser(currentUser); // Re-use fetchAppUser logic
    } else {
      console.log("[AuthContext] refreshAppUser: No current user, skipping refresh.");
      setAppUser(null);
      setIsProfileComplete(false);
      setProfileLoading(false);
    }
  }, [currentUser, fetchAppUser]);

  const isLoadingOverall = authLoading || profileLoading;

  if (authLoading) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          Memverifikasi sesi...
        </p>
      </div>
    );
  }
  
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

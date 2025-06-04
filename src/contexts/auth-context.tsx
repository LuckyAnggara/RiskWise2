
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { getUserDocument } from '@/services/userService';
import type { AppUser, UserRole } from '@/lib/types'; // UserRole diimpor

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  authContextLoading: boolean;
  profileLoading: boolean;
  isProfileComplete: boolean; // Basics: displayName, activePeriod, availablePeriods
  isUprAssigned: boolean;    // UPR ID is assigned
  isAdmin: boolean; // New: For admin role
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authContextLoadingInternal, setAuthContextLoadingInternal] = useState(true);
  const [profileLoadingInternal, setProfileLoadingInternal] = useState(true);
  const [isProfileCompleteInternal, setIsProfileCompleteInternal] = useState(false);
  const [isUprAssignedInternal, setIsUprAssignedInternal] = useState(false);
  const [isAdminInternal, setIsAdminInternal] = useState(false); // New admin state

  const fetchAppUser = useCallback(async (user: FirebaseUser | null) => {
    console.log("[AuthContext] fetchAppUser: Called with Firebase user:", user ? user.uid : "null");
    if (user) {
      setProfileLoadingInternal(true);
      try {
        const userDoc = await getUserDocument(user.uid);
        console.log("[AuthContext] fetchAppUser: Raw AppUser data from userService for UID", user.uid, ":", JSON.stringify(userDoc));
        
        if (userDoc) {
          setAppUser(userDoc);
          const profileBasicsComplete = !!(
            userDoc.displayName &&
            userDoc.activePeriod &&
            userDoc.availablePeriods && userDoc.availablePeriods.length > 0
          );
          setIsProfileCompleteInternal(profileBasicsComplete);
          
          const uprIsAssigned = !!(userDoc.uprId && typeof userDoc.uprId === 'string' && userDoc.uprId.trim() !== '');
          setIsUprAssignedInternal(uprIsAssigned);
          setIsAdminInternal(userDoc.role === 'admin'); // Set admin state

          console.log(`[AuthContext] fetchAppUser: UID ${user.uid}. BasicsComplete: ${profileBasicsComplete}, UprAssigned: ${uprIsAssigned}, IsAdmin: ${userDoc.role === 'admin'}. UPR ID (from Firestore): ${userDoc.uprId}`);
        } else {
          setAppUser(null);
          setIsProfileCompleteInternal(false);
          setIsUprAssignedInternal(false);
          setIsAdminInternal(false);
          console.log("[AuthContext] fetchAppUser: No Firestore doc, profile set to incomplete/unassigned/not-admin for UID:", user.uid);
        }
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[AuthContext] fetchAppUser: Failed to fetch AppUser for UID:", user.uid, "Error:", errorMessage);
        setAppUser(null);
        setIsProfileCompleteInternal(false);
        setIsUprAssignedInternal(false);
        setIsAdminInternal(false);
      } finally {
        setProfileLoadingInternal(false);
      }
    } else {
      setAppUser(null);
      setIsProfileCompleteInternal(false);
      setIsUprAssignedInternal(false);
      setIsAdminInternal(false);
      setProfileLoadingInternal(false);
    }
  }, []);

  useEffect(() => {
    setAuthContextLoadingInternal(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      try {
        await fetchAppUser(user);
      } catch (error) {
        console.error("[AuthContext] onAuthStateChanged: Error from fetchAppUser:", error);
      } finally {
        setAuthContextLoadingInternal(false);
      }
    });
    return () => unsubscribe();
  }, [fetchAppUser]);

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      await fetchAppUser(currentUser);
    } else {
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
        isUprAssigned: isUprAssignedInternal,
        isAdmin: isAdminInternal, // Provide admin state
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

    
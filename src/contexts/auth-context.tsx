
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { getUserDocument } from '@/services/userService';
import { getUprById } from '@/services/uprService'; // Import service UPR
import type { AppUser, UserRole, UPR } from '@/lib/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  assignedUpr: UPR | null; // New: To store details of the UPR assigned to the user
  authContextLoading: boolean;
  profileLoading: boolean;
  isProfileComplete: boolean; 
  isUprAssigned: boolean;    
  isAdmin: boolean; 
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [assignedUpr, setAssignedUpr] = useState<UPR | null>(null); // New state for assigned UPR details
  const [authContextLoadingInternal, setAuthContextLoadingInternal] = useState(true);
  const [profileLoadingInternal, setProfileLoadingInternal] = useState(true);
  const [isProfileCompleteInternal, setIsProfileCompleteInternal] = useState(false);
  const [isUprAssignedInternal, setIsUprAssignedInternal] = useState(false);
  const [isAdminInternal, setIsAdminInternal] = useState(false);

  const fetchAppUserAndUpr = useCallback(async (user: FirebaseUser | null) => {
    console.log("[AuthContext] fetchAppUserAndUpr: Called with Firebase user:", user ? user.uid : "null");
    if (user) {
      setProfileLoadingInternal(true);
      setAssignedUpr(null); // Reset assigned UPR details on new fetch
      try {
        const userDoc = await getUserDocument(user.uid);
        console.log("[AuthContext] fetchAppUserAndUpr: Raw AppUser data from userService for UID", user.uid, ":", JSON.stringify(userDoc));
        
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
          setIsAdminInternal(userDoc.role === 'admin');

          console.log(`[AuthContext] fetchAppUserAndUpr: UID ${user.uid}. BasicsComplete: ${profileBasicsComplete}, UprAssigned: ${uprIsAssigned}, IsAdmin: ${userDoc.role === 'admin'}. UPR ID (from AppUser doc): ${userDoc.uprId}`);

          // If UPR is assigned, fetch UPR details
          if (uprIsAssigned && userDoc.uprId) {
            console.log(`[AuthContext] fetchAppUserAndUpr: UPR is assigned (${userDoc.uprId}). Fetching UPR details...`);
            const uprDetails = await getUprById(userDoc.uprId);
            if (uprDetails) {
              setAssignedUpr(uprDetails);
              console.log(`[AuthContext] fetchAppUserAndUpr: Assigned UPR details fetched: ${uprDetails.name}, Risk Appetite: ${uprDetails.riskAppetite}`);
            } else {
              console.warn(`[AuthContext] fetchAppUserAndUpr: Could not fetch details for assigned UPR ID: ${userDoc.uprId}`);
            }
          } else {
             console.log(`[AuthContext] fetchAppUserAndUpr: UPR not assigned for UID ${user.uid}, or uprId is null/empty.`);
          }

        } else {
          setAppUser(null);
          setIsProfileCompleteInternal(false);
          setIsUprAssignedInternal(false);
          setIsAdminInternal(false);
          console.log("[AuthContext] fetchAppUserAndUpr: No Firestore doc, profile set to incomplete/unassigned/not-admin for UID:", user.uid);
        }
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error("[AuthContext] fetchAppUserAndUpr: Failed to fetch AppUser/UPR for UID:", user.uid, "Error:", errorMessage);
        setAppUser(null);
        setAssignedUpr(null);
        setIsProfileCompleteInternal(false);
        setIsUprAssignedInternal(false);
        setIsAdminInternal(false);
      } finally {
        setProfileLoadingInternal(false);
      }
    } else {
      setAppUser(null);
      setAssignedUpr(null);
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
        await fetchAppUserAndUpr(user);
      } catch (error) {
        console.error("[AuthContext] onAuthStateChanged: Error from fetchAppUserAndUpr:", error);
      } finally {
        setAuthContextLoadingInternal(false);
      }
    });
    return () => unsubscribe();
  }, [fetchAppUserAndUpr]);

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      await fetchAppUserAndUpr(currentUser);
    } else {
      await fetchAppUserAndUpr(null); 
    }
  }, [currentUser, fetchAppUserAndUpr]);

  return (
    <AuthContext.Provider value={{
        currentUser,
        appUser,
        assignedUpr, // Provide assigned UPR details
        authContextLoading: authContextLoadingInternal,
        profileLoading: profileLoadingInternal,
        isProfileComplete: isProfileCompleteInternal,
        isUprAssigned: isUprAssignedInternal,
        isAdmin: isAdminInternal, 
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

    

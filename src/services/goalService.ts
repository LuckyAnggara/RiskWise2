
"use server";

import { db } from '@/lib/firebase/config';
import type { Goal } from '@/lib/types';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { 
    GOALS_COLLECTION,
} from '@/services/collectionNames';
import { deletePotentialRiskAndSubCollections } from './potentialRiskService';

export interface GoalsResult {
  success: boolean;
  goals?: Goal[];
  message?: string;
  code?: string; // For specific error codes like NO_UPRID
}

export async function addGoal(
 goalData: Omit<Goal, 'id' | 'code' | 'createdAt' | 'period' | 'uprId'>,
  uprId: string, // Added uprId
  period: string,
): Promise<Goal> {
  if (!uprId || typeof uprId !== 'string' || uprId.trim() === '') {
    console.error("[goalService] addGoal: uprId is invalid.", {uprId});
    throw new Error("UPR ID tidak valid untuk menambahkan sasaran.");
  }
  if (!period || typeof period !== 'string' || period.trim() === "") {
    console.error("[goalService] addGoal: period is invalid.", {period});
    throw new Error("Periode tidak valid untuk menambahkan sasaran.");
  }

  try {
    const goalsCollectionRef = collection(db, GOALS_COLLECTION);
    
    const q = query(
        goalsCollectionRef,
        where("uprId", "==", uprId), // Query by uprId
        where("period", "==", period)
    );
    const querySnapshot = await getDocs(q);
    const existingGoalsForContext: Goal[] = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        existingGoalsForContext.push({ id: doc.id, code: data.code, ...data } as Goal);
    });

    const firstLetter = goalData.name.charAt(0).toUpperCase();
    const prefix = /^[A-Z]$/.test(firstLetter) ? firstLetter : 'S'; 
    let maxNum = 0;
    existingGoalsForContext.forEach(g => {
      if (g.code && typeof g.code === 'string' && g.code.startsWith(prefix)) {
        const numPart = parseInt(g.code.substring(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    const newNumericPart = maxNum + 1;
    const newGoalCode = `${prefix}${newNumericPart}`;

    const docData = {
      ...goalData,
      uprId, // Store uprId
      code: newGoalCode,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(goalsCollectionRef, docData);

    return {
        id: docRef.id,
        ...goalData,
        uprId,
        period,
        code: newGoalCode,
        createdAt: new Date().toISOString() 
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[goalService] Error adding goal to Firestore. Message:", errorMessage);
    throw new Error(`Gagal menambahkan sasaran ke database. Pesan: ${errorMessage}`);
  }
}

export async function getGoals(uprId: string | null | undefined, period: string | null | undefined): Promise<GoalsResult> {
  try {
    if (!uprId || !period) {
      console.warn("[goalService] getGoals: uprId or period is missing.", {uprId, period});
      return {
        success: false,
        message: "Konteks UPR (ID UPR atau Periode) tidak tersedia.",
        goals: []
      };
    }

    console.log("[goalService] getGoals: Querying with uprId:", uprId, "and period:", period);
    const q = query(
      collection(db, GOALS_COLLECTION),
      where("uprId", "==", uprId), // Filter by uprId
      where("period", "==", period),
      orderBy("code", "asc")
    );

    const querySnapshot = await getDocs(q);
    const goals: Goal[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAtTimestamp = data.createdAt as Timestamp | undefined;
      const createdAtISO = createdAtTimestamp
                             ? createdAtTimestamp.toDate().toISOString()
                             : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      
      goals.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        code: data.code || '', 
        createdAt: createdAtISO,
        uprId: data.uprId, // Ensure uprId is included
        period: data.period,
      } as Goal);
    });

    console.log("[goalService] getGoals: querySnapshot size:", querySnapshot.size, "Fetched goals:", goals.length);
    return { success: true, goals: goals };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[goalService] Error getting goals from Firestore. Message:", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar sasaran dari database.";
    if (error instanceof Error && error.message) {
      detailedErrorMessage += ` Pesan Asli: ${error.message}`;
    }
    if ((error as any).code === 'failed-precondition') {
        detailedErrorMessage += " Ini mungkin disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console (Firestore Database > Indexes).";
    }
    // Do not throw here, return error object
     return { success: false, message: detailedErrorMessage, goals: [] };
  }
}

export async function getGoalById(goalId: string, uprId: string, period: string): Promise<Goal | null> {
  try {
    if (!uprId || !period) {
      console.warn(`[goalService] getGoalById: uprId or period is missing for goalId ${goalId}`);
      return null;
    }
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    const docSnap = await getDoc(goalRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.uprId !== uprId || data.period !== period) {
        console.warn(`Goal ${goalId} found, but does not match current UPR/period context. Expected UPR: ${uprId}, Period: ${period}. Found: UPR: ${data.uprId}, Period: ${data.period}`);
        return null;
      }

      const createdAtTimestamp = data.createdAt as Timestamp | undefined;
      const createdAtISO = createdAtTimestamp
                             ? createdAtTimestamp.toDate().toISOString()
                             : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        code: data.code || '',
        createdAt: createdAtISO,
        uprId: data.uprId,
        period: data.period,
      } as Goal;
    } else {
      console.log(`Goal dengan ID ${goalId} tidak ditemukan.`);
      return null;
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error getting goal by ID ${goalId} from Firestore: `, errorMessage);
    throw new Error(`Gagal mengambil detail sasaran. Pesan: ${errorMessage}`);
  }
}

export async function updateGoal(goalId: string, updatedData: Partial<Omit<Goal, 'id' | 'uprId' | 'period' | 'code' | 'createdAt'>>): Promise<void> {
  // If uprId/period needs to change, it implies moving the goal, which is a more complex operation.
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    // We might want to fetch the document first to ensure it exists and matches context if stricter control is needed.
    await updateDoc(goalRef, {
      ...updatedData,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[goalService] Error updating goal in Firestore. Message:", errorMessage);
    throw new Error(`Gagal memperbarui sasaran di database. Pesan: ${errorMessage}`);
  }
}

export async function deleteGoal(goalId: string, uprId: string, period: string): Promise<void> {
  const batch = writeBatch(db);
  try {
    const goalRef = doc(db, GOALS_COLLECTION, goalId);
    
    const goalDoc = await getDoc(goalRef);
    if (goalDoc.exists()) {
        const goalData = goalDoc.data();
        if (goalData.uprId !== uprId || goalData.period !== period) {
            throw new Error("Sasaran tidak dapat dihapus: tidak cocok dengan konteks UPR/periode.");
        }
    } else {
        throw new Error("Sasaran tidak ditemukan untuk dihapus.");
    }
    batch.delete(goalRef);
    
    const q = query(
      collection(db, "potentialRisks"), 
      where("goalId", "==", goalId),
      where("uprId", "==", uprId), // Ensure PRs are also within the same UPR
      where("period", "==", period)
    );
    const potentialRisksSnapshot = await getDocs(q);
    
    for (const prDoc of potentialRisksSnapshot.docs) {
      // Pass uprId and period to the cascaded delete function
      await deletePotentialRiskAndSubCollections(prDoc.id, uprId, period, batch);
    }
    await batch.commit();
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[goalService] Error deleting goal and related data from Firestore. Message:", errorMessage);
    throw new Error(`Gagal menghapus sasaran dan data terkait. Pesan: ${errorMessage}`);
  }
}

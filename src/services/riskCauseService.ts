
"use server";

import { db } from '@/lib/firebase/config';
import type { RiskCause } from '@/lib/types';
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
  getDoc,
  writeBatch,
  type WriteBatch
} from 'firebase/firestore';
import { RISK_CAUSES_COLLECTION, CONTROL_MEASURES_COLLECTION } from './collectionNames';
import { deleteControlMeasure } from './controlMeasureService'; // Ensure this uses uprId and period if needed for context

export async function addRiskCause(
  data: Omit<RiskCause, 'id' | 'createdAt' | 'period' | 'userId' | 'uprId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' >,
  potentialRiskId: string,
  goalId: string,
  uprId: string, // Added uprId
  period: string, // Creator's Firebase UID - Removed userId parameter
  sequenceNumber: number
): Promise<RiskCause> {
  if (!uprId || !period || !potentialRiskId || !goalId) {
    console.error("[riskCauseService] addRiskCause: Missing one or more IDs.", {uprId, period, potentialRiskId, goalId});
    throw new Error("ID UPR, Periode, Potensi Risiko, atau Sasaran tidak valid.");
  }
  try {
    const docRef = await addDoc(collection(db, RISK_CAUSES_COLLECTION), {
      ...data,
      potentialRiskId,
      goalId,
      uprId,
      period, // No longer storing userId directly
      sequenceNumber,
      createdAt: serverTimestamp(),
      keyRiskIndicator: data.keyRiskIndicator || null,
      riskTolerance: data.riskTolerance || null,
      likelihood: data.likelihood || null,
      impact: data.impact || null,
    });
    return {
      id: docRef.id,
      ...data,
      potentialRiskId,
      goalId,
      uprId,
      period, // userId is not stored in the returned object anymore
      sequenceNumber,
      createdAt: new Date().toISOString(), 
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[riskCauseService] Error adding risk cause: ", errorMessage);
    throw new Error(`Gagal menambahkan penyebab risiko. Pesan: ${errorMessage}`);
  }
}

export async function getRiskCausesByPotentialRiskId(potentialRiskId: string, uprId: string, period: string): Promise<RiskCause[]> {
  if (!uprId || !period || !potentialRiskId) {
    console.warn(`[riskCauseService] getRiskCausesByPotentialRiskId: uprId, period, or potentialRiskId is missing.`);
    return [];
  }
  try {
    const q = query(
      collection(db, RISK_CAUSES_COLLECTION),
      where("potentialRiskId", "==", potentialRiskId),
      where("uprId", "==", uprId), // Filter by uprId
      where("period", "==", period),
      orderBy("sequenceNumber", "asc")
    );
    const querySnapshot = await getDocs(q);
    const riskCauses: RiskCause[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAtISO = data.createdAt instanceof Timestamp
                           ? data.createdAt.toDate().toISOString()
                           : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      const analysisUpdatedAtISO = data.analysisUpdatedAt instanceof Timestamp
                           ? data.analysisUpdatedAt.toDate().toISOString()
                           : (data.analysisUpdatedAt && typeof data.analysisUpdatedAt === 'string' ? new Date(data.analysisUpdatedAt).toISOString() : undefined);
      
      riskCauses.push({ 
        id: doc.id, 
        ...data,
        uprId: data.uprId,
        // userId is not needed here
        period: data.period,
        createdAt: createdAtISO, 
        analysisUpdatedAt: analysisUpdatedAtISO,
        keyRiskIndicator: data.keyRiskIndicator || null,
        riskTolerance: data.riskTolerance || null,
        likelihood: data.likelihood || null,
        impact: data.impact || null,
      } as RiskCause);
    });
    return riskCauses;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[riskCauseService] Error getting risk causes: ", errorMessage);
    let detailedErrorMessage = "Gagal mengambil daftar penyebab risiko.";
     if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Indeks komposit mungkin hilang. Periksa Firebase Console.";
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getRiskCauseById(id: string, uprId: string, period: string): Promise<RiskCause | null> {
  if (!uprId || !period || !id) {
    console.warn(`[riskCauseService] getRiskCauseById: uprId, period, or id is missing.`);
    return null;
  }
  try {
    const docRef = doc(db, RISK_CAUSES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.uprId !== uprId || data.period !== period) {
        console.warn(`RiskCause ${id} found, but does not match current UPR/period context.`);
        return null;
      }

       const createdAtISO = data.createdAt instanceof Timestamp
                           ? data.createdAt.toDate().toISOString()
                           : (data.createdAt && typeof data.createdAt === 'string' ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      const analysisUpdatedAtISO = data.analysisUpdatedAt instanceof Timestamp
                           ? data.analysisUpdatedAt.toDate().toISOString()
                           : (data.analysisUpdatedAt && typeof data.analysisUpdatedAt === 'string' ? new Date(data.analysisUpdatedAt).toISOString() : undefined);
      return { 
        id: docSnap.id, 
        ...data, 
        uprId: data.uprId,
        // userId is not needed here
        period: data.period,
        createdAt: createdAtISO, 
        analysisUpdatedAt: analysisUpdatedAtISO,
        keyRiskIndicator: data.keyRiskIndicator || null,
        riskTolerance: data.riskTolerance || null,
        likelihood: data.likelihood || null,
        impact: data.impact || null,
      } as RiskCause;
    }
    console.warn(`[riskCauseService] RiskCause with ID ${id} not found.`);
    return null;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[riskCauseService] Error getting risk cause by ID: ", errorMessage);
    throw new Error(`Gagal mengambil detail penyebab risiko. Pesan: ${errorMessage}`);
  }
}

export async function updateRiskCause(id: string, data: Partial<Omit<RiskCause, 'id' | 'uprId' | 'potentialRiskId' | 'goalId' | 'period' | 'createdAt' | 'sequenceNumber'>>): Promise<void> {
  // uprId, potentialRiskId, goalId, userId, period, createdAt, sequenceNumber are generally not updatable this way.
  try {
    const docRef = doc(db, RISK_CAUSES_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        keyRiskIndicator: data.keyRiskIndicator === undefined ? undefined : (data.keyRiskIndicator || null),
        riskTolerance: data.riskTolerance === undefined ? undefined : (data.riskTolerance || null),
        likelihood: data.likelihood === undefined ? undefined : (data.likelihood || null),
        impact: data.impact === undefined ? undefined : (data.impact || null),
        analysisUpdatedAt: serverTimestamp()
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[riskCauseService] Error updating risk cause: ", errorMessage);
    throw new Error(`Gagal memperbarui penyebab risiko. Pesan: ${errorMessage}`);
  }
}

export async function deleteRiskCauseAndSubCollections(riskCauseId: string, uprId: string, period: string, batch?: WriteBatch): Promise<void> {
  // userId (creator) is not strictly needed for deletion query if uprId/period is the main context.
  const localBatch = batch || writeBatch(db);
  console.log(`[riskCauseService] Attempting to delete RiskCause: ${riskCauseId} for UPR: ${uprId}, Period: ${period}`);
  try {
    const riskCauseRef = doc(db, RISK_CAUSES_COLLECTION, riskCauseId);
    const rcDoc = await getDoc(riskCauseRef);
    if (rcDoc.exists()) {
        const rcData = rcDoc.data();
        if (rcData.uprId !== uprId || rcData.period !== period) {
            console.error(`Attempt to delete RiskCause ${riskCauseId} denied: context mismatch.`);
            throw new Error("Operasi tidak diizinkan: penyebab risiko tidak cocok dengan konteks UPR/periode.");
        }
    } else {
        console.warn(`RiskCause with ID ${riskCauseId} not found. Skipping further sub-collection deletion for this cause.`);
        // If it doesn't exist, we can still proceed if part of a larger batch (e.g., deleting a PR)
        if(!batch) return; 
    }

    const controlsQuery = query(
      collection(db, CONTROL_MEASURES_COLLECTION),
      where("riskCauseId", "==", riskCauseId),
      where("uprId", "==", uprId), // Filter by uprId
      where("period", "==", period)
    );
    const controlsSnapshot = await getDocs(controlsQuery);
    controlsSnapshot.forEach(controlDoc => {
      // No sub-collections under ControlMeasure for now, just delete the document
      localBatch.delete(controlDoc.ref);
    });
    console.log(`Added ${controlsSnapshot.size} control measures for RiskCause ${riskCauseId} to delete batch.`);

    if (rcDoc.exists()) { // Only delete the risk cause doc if it was found
        localBatch.delete(riskCauseRef);
        console.log(`RiskCause ${riskCauseId} added to delete batch.`);
    }


    if (!batch) { 
      await localBatch.commit();
      console.log(`RiskCause ${riskCauseId} and related control measures committed for deletion.`);
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[riskCauseService] Error deleting risk cause: ", errorMessage);
    if (!(error.message && error.message.toLowerCase().includes("no document to update"))){
        throw new Error(`Gagal menghapus penyebab risiko dan data terkaitnya. Pesan: ${errorMessage}`);
    } else {
        console.warn("Skipped re-throwing error during cascading delete, likely already deleted:", errorMessage);
    }
  }
}

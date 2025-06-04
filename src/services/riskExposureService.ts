
"use server";

import { db } from '@/lib/firebase/config';
import type { RiskExposure } from '@/lib/types';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc, 
  getDoc,
  Timestamp,
  serverTimestamp,
  deleteDoc,
  type WriteBatch, // Added WriteBatch type
  writeBatch // Added writeBatch function if used directly
} from 'firebase/firestore';
import { RISK_EXPOSURES_COLLECTION } from './collectionNames';

const createExposureDocId = (monitoringSessionId: string, riskCauseId: string) => `${monitoringSessionId}_${riskCauseId}`;

export async function upsertRiskExposure(
  data: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period' | 'uprId'>,
  uprId: string, // Added uprId
  period: string, 
  userId: string // Creator's Firebase UID
): Promise<RiskExposure> {
  if (!uprId || !period || !userId) {
    throw new Error("UPR ID, Periode aplikasi, dan User ID wajib diisi.");
  }
  if (!data.monitoringSessionId || !data.riskCauseId) {
    throw new Error("ID Sesi Pemantauan dan ID Penyebab Risiko wajib diisi.");
  }

  const docId = createExposureDocId(data.monitoringSessionId, data.riskCauseId);
  const docRef = doc(db, RISK_EXPOSURES_COLLECTION, docId);

  try {
    const docDataToSave = {
      ...data,
      uprId, // Store uprId
      period, 
      userId, // Store creator's Firebase UID
    };

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      // Validate context if doc exists
      const existingData = docSnap.data();
      if (existingData.uprId !== uprId || existingData.period !== period) {
          console.error(`[riskExposureService] Upsert failed for ${docId}. Context mismatch. Expected UPR: ${uprId}, Period: ${period}. Found: ${existingData.uprId}, ${existingData.period}.`);
          throw new Error("Gagal menyimpan paparan risiko: Konteks data tidak cocok.");
      }
      await setDoc(docRef, { ...docDataToSave, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await setDoc(docRef, { ...docDataToSave, recordedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    
    const updatedDocSnap = await getDoc(docRef);
    if (!updatedDocSnap.exists()) {
        throw new Error("Gagal mengambil data paparan risiko setelah penyimpanan.");
    }
    const savedData = updatedDocSnap.data();
    const recordedAt = savedData.recordedAt instanceof Timestamp ? savedData.recordedAt.toDate().toISOString() : new Date().toISOString();
    const updatedAt = savedData.updatedAt instanceof Timestamp ? savedData.updatedAt.toDate().toISOString() : new Date().toISOString();

    return {
      id: updatedDocSnap.id,
      ...data,
      uprId,
      userId,
      period,
      recordedAt,
      updatedAt,
    } as RiskExposure;

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskExposureService] Error upserting risk exposure: ", errorMessage);
    throw new Error(`Gagal menyimpan data paparan risiko. Pesan: ${errorMessage}`);
  }
}

export async function getRiskExposuresBySession(
  monitoringSessionId: string, 
  uprId: string, // Added uprId
  period: string, 
  userIdForContextValidation?: string // User who created the session, for validation if needed
): Promise<RiskExposure[]> {
  if (!monitoringSessionId || !uprId || !period) {
    console.warn("[riskExposureService] getRiskExposuresBySession: One or more required parameters are missing.");
    return [];
  }
  try {
    const q = query(
      collection(db, RISK_EXPOSURES_COLLECTION),
      where("monitoringSessionId", "==", monitoringSessionId),
      where("uprId", "==", uprId), // Filter by uprId
      where("period", "==", period), 
      orderBy("riskCauseId", "asc") 
    );
    const querySnapshot = await getDocs(q);
    const exposures: RiskExposure[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const recordedAt = data.recordedAt instanceof Timestamp ? data.recordedAt.toDate().toISOString() : new Date().toISOString();
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined;
      
      exposures.push({ 
        id: docSnap.id,
        ...data,
        uprId: data.uprId,
        userId: data.userId, // User who recorded this specific exposure
        period: data.period,
        recordedAt,
        updatedAt,
      } as RiskExposure);
    });
    return exposures;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskExposureService] Error getting risk exposures: ", error.code, errorMessage);
    let detailedErrorMessage = "Gagal mengambil data paparan risiko.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Indeks komposit mungkin hilang. Periksa Firebase Console.";
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function deleteRiskExposuresByMonitoringSession(monitoringSessionId: string, uprId: string, period: string, batchInstance?: WriteBatch) {
  console.log(`[riskExposureService] Attempting to delete RiskExposures for session: ${monitoringSessionId}, UPR: ${uprId}, Period: ${period}`);
  const q = query(
    collection(db, RISK_EXPOSURES_COLLECTION),
    where("monitoringSessionId", "==", monitoringSessionId),
    where("uprId", "==", uprId), // Ensure context matches
    where("period", "==", period)  // Ensure context matches
  );
  const snapshot = await getDocs(q);
  const currentBatch = batchInstance || writeBatch(db); // Use provided batch or create new
  snapshot.docs.forEach(doc => {
    console.log(`[riskExposureService] Adding RiskExposure ${doc.id} to delete batch.`);
    currentBatch.delete(doc.ref);
  });
  if (!batchInstance) { // If this function created the batch, it should commit it
    await currentBatch.commit();
    console.log(`[riskExposureService] Committed batch delete for RiskExposures of session ${monitoringSessionId}.`);
  }
}

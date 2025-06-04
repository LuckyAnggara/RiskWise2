
"use server";

import { db } from '@/lib/firebase/config';
import type { MonitoredControlMeasureData } from '@/lib/types';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  getDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { MONITORED_CONTROL_MEASURES_DATA_COLLECTION } from './collectionNames';

// Helper function to create a consistent document ID
const createMCMDocId = (monitoringSessionId: string, riskCauseId: string, controlMeasureId: string) => 
  `${monitoringSessionId}_${riskCauseId}_${controlMeasureId}`;

export async function upsertMonitoredControlMeasure(
  data: Omit<MonitoredControlMeasureData, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period' | 'uprId'>,
  uprId: string,
  period: string,
  userId: string // User who is performing the upsert
): Promise<MonitoredControlMeasureData> {
  if (!uprId || !period || !userId) {
    throw new Error("UPR ID, Periode aplikasi, dan User ID wajib diisi.");
  }
  if (!data.monitoringSessionId || !data.riskCauseId || !data.controlMeasureId) {
    throw new Error("ID Sesi Pemantauan, ID Penyebab Risiko, dan ID Tindakan Pengendalian wajib diisi.");
  }

  const docId = createMCMDocId(data.monitoringSessionId, data.riskCauseId, data.controlMeasureId);
  const docRef = doc(db, MONITORED_CONTROL_MEASURES_DATA_COLLECTION, docId);

  try {
    const docDataToSave = {
      ...data,
      uprId,
      period,
      userId, // Store the user who performed this action
    };

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      // Validate context if doc exists
      const existingData = docSnap.data();
      if (existingData.uprId !== uprId || existingData.period !== period) {
          console.error(`[MCMService] Upsert failed for ${docId}. Context mismatch.`);
          throw new Error("Gagal menyimpan data pemantauan kontrol: Konteks data tidak cocok.");
      }
      await setDoc(docRef, { ...docDataToSave, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await setDoc(docRef, { ...docDataToSave, recordedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    
    const updatedDocSnap = await getDoc(docRef); // Re-fetch to get server-generated timestamps
    if (!updatedDocSnap.exists()) {
        throw new Error("Gagal mengambil data pemantauan kontrol setelah penyimpanan.");
    }
    const savedData = updatedDocSnap.data();
    const recordedAt = savedData.recordedAt instanceof Timestamp ? savedData.recordedAt.toDate().toISOString() : new Date().toISOString();
    const updatedAt = savedData.updatedAt instanceof Timestamp ? savedData.updatedAt.toDate().toISOString() : new Date().toISOString();

    return {
      id: updatedDocSnap.id,
      ...savedData, // spread savedData to ensure all fields are included
      uprId: savedData.uprId,
      userId: savedData.userId,
      period: savedData.period,
      monitoringSessionId: savedData.monitoringSessionId,
      riskCauseId: savedData.riskCauseId,
      controlMeasureId: savedData.controlMeasureId,
      realizationKCI: savedData.realizationKCI || null,
      isTargetNegative: savedData.isTargetNegative || null,
      controlPerformance: savedData.controlPerformance === undefined ? null : savedData.controlPerformance,
      controlActivityNarrative: savedData.controlActivityNarrative || null,
      supportingDocumentUrl: savedData.supportingDocumentUrl || null,
      recordedAt,
      updatedAt,
    } as MonitoredControlMeasureData;

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[MCMService] Error upserting monitored control measure data: ", errorMessage);
    throw new Error(`Gagal menyimpan data pemantauan kontrol. Pesan: ${errorMessage}`);
  }
}

export async function getMonitoredControlMeasuresBySession(
  monitoringSessionId: string,
  uprId: string,
  period: string,
  userIdForContextValidation?: string // User who created the session, for validation if needed
): Promise<MonitoredControlMeasureData[]> {
  if (!monitoringSessionId || !uprId || !period) {
    console.warn("[MCMService] getMonitoredControlMeasuresBySession: One or more required parameters are missing.");
    return [];
  }
  try {
    const q = query(
      collection(db, MONITORED_CONTROL_MEASURES_DATA_COLLECTION),
      where("monitoringSessionId", "==", monitoringSessionId),
      where("uprId", "==", uprId),
      where("period", "==", period),
      orderBy("controlMeasureId", "asc") // Or other relevant field for ordering
    );
    const querySnapshot = await getDocs(q);
    const mcms: MonitoredControlMeasureData[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const recordedAt = data.recordedAt instanceof Timestamp ? data.recordedAt.toDate().toISOString() : new Date().toISOString();
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined;
      
      mcms.push({ 
        id: docSnap.id,
        ...data,
        uprId: data.uprId,
        userId: data.userId,
        period: data.period,
        monitoringSessionId: data.monitoringSessionId,
        riskCauseId: data.riskCauseId,
        controlMeasureId: data.controlMeasureId,
        realizationKCI: data.realizationKCI || null,
        isTargetNegative: data.isTargetNegative || null,
        controlPerformance: data.controlPerformance === undefined ? null : data.controlPerformance,
        controlActivityNarrative: data.controlActivityNarrative || null,
        supportingDocumentUrl: data.supportingDocumentUrl || null,
        recordedAt,
        updatedAt,
      } as MonitoredControlMeasureData);
    });
    return mcms;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[MCMService] Error getting monitored control measure data: ", error.code, errorMessage);
    let detailedErrorMessage = "Gagal mengambil data pemantauan kontrol.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Indeks komposit mungkin hilang. Periksa Firebase Console.";
    }
    throw new Error(detailedErrorMessage);
  }
}

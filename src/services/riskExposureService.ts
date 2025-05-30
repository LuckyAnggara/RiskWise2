
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
  setDoc, // Menggunakan setDoc untuk upsert jika kita tahu ID uniknya (kombinasi sesi+penyebab)
  getDoc,
  Timestamp,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { RISK_EXPOSURES_COLLECTION } from './collectionNames';

// Fungsi untuk membuat ID dokumen gabungan
const createExposureDocId = (monitoringSessionId: string, riskCauseId: string) => `${monitoringSessionId}_${riskCauseId}`;

export async function upsertRiskExposure(
  data: Omit<RiskExposure, 'id' | 'recordedAt' | 'updatedAt' | 'userId' | 'period'>,
  userId: string,
  period: string // Periode aplikasi saat sesi dibuat
): Promise<RiskExposure> {
  if (!userId || !period) {
    throw new Error("User ID dan Periode aplikasi wajib diisi.");
  }
  if (!data.monitoringSessionId || !data.riskCauseId) {
    throw new Error("ID Sesi Pemantauan dan ID Penyebab Risiko wajib diisi.");
  }

  const docId = createExposureDocId(data.monitoringSessionId, data.riskCauseId);
  const docRef = doc(db, RISK_EXPOSURES_COLLECTION, docId);

  try {
    const docDataToSave = {
      ...data,
      userId,
      period, // Periode aplikasi
      // recordedAt akan di-set jika ini adalah entri baru, updatedAt akan selalu di-set
    };

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      // Update
      await setDoc(docRef, { ...docDataToSave, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      // Create
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
  userId: string, 
  period: string // Periode aplikasi saat sesi dibuat
): Promise<RiskExposure[]> {
  if (!monitoringSessionId || !userId || !period) {
    console.warn("[riskExposureService] getRiskExposuresBySession: One or more required parameters are missing.", { monitoringSessionId, userId, period });
    return [];
  }
  try {
    const q = query(
      collection(db, RISK_EXPOSURES_COLLECTION),
      where("monitoringSessionId", "==", monitoringSessionId),
      where("userId", "==", userId),
      where("period", "==", period), // Ini adalah periode sesi
      orderBy("riskCauseId", "asc") // Atau orderBy recordedAt jika lebih relevan
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
        recordedAt,
        updatedAt,
      } as RiskExposure);
    });
    return exposures;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[riskExposureService] Error getting risk exposures from Firestore: ", error.code, errorMessage);
    let detailedErrorMessage = "Gagal mengambil data paparan risiko.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Ini mungkin karena indeks komposit yang hilang. Periksa Firebase Console (Firestore Database > Indexes) dan buat indeks yang disarankan jika ada.";
    } else {
      detailedErrorMessage += ` Pesan: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function deleteRiskExposuresByMonitoringSession(monitoringSessionId: string, userId: string, period: string, batch?: WriteBatch) {
  console.log(`[riskExposureService] Attempting to delete RiskExposures for session: ${monitoringSessionId}, user: ${userId}, period: ${period}`);
  const q = query(
    collection(db, RISK_EXPOSURES_COLLECTION),
    where("monitoringSessionId", "==", monitoringSessionId),
    where("userId", "==", userId),
    where("period", "==", period)
  );
  const snapshot = await getDocs(q);
  const localBatch = batch || writeBatch(db);
  snapshot.docs.forEach(doc => {
    console.log(`[riskExposureService] Adding RiskExposure ${doc.id} to delete batch.`);
    localBatch.delete(doc.ref);
  });
  if (!batch) {
    await localBatch.commit();
    console.log(`[riskExposureService] Committed batch delete for RiskExposures of session ${monitoringSessionId}.`);
  }
}

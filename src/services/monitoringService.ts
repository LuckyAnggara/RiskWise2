
"use server";

import { db } from '@/lib/firebase/config';
import type { MonitoringSession, MonitoringSessionStatus } from '@/lib/types';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  getDoc,
  deleteDoc, 
  writeBatch, 
} from 'firebase/firestore';
import { MONITORING_SESSIONS_COLLECTION, RISK_EXPOSURES_COLLECTION, MONITORED_CONTROL_MEASURES_DATA_COLLECTION } from './collectionNames'; 
import { deleteRiskExposuresByMonitoringSession } from './riskExposureService'; 
// Import function to delete related MonitoredControlMeasures if it exists, or implement here.

export async function deleteMonitoredControlMeasuresBySession(monitoringSessionId: string, uprId: string, period: string, batch?: WriteBatch) {
    const q = query(
        collection(db, MONITORED_CONTROL_MEASURES_DATA_COLLECTION),
        where("monitoringSessionId", "==", monitoringSessionId),
        where("uprId", "==", uprId),
        where("period", "==", period)
    );
    const snapshot = await getDocs(q);
    const localBatch = batch || writeBatch(db);
    snapshot.docs.forEach(doc => {
        localBatch.delete(doc.ref);
    });
    if (!batch) {
        await localBatch.commit();
    }
    console.log(`[monitoringService] MonitoredControlMeasures for session ${monitoringSessionId} processed for deletion.`);
}


export async function addMonitoringSession(
  data: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'period' | 'uprId'>,
  uprId: string, // Added uprId
  period: string, 
  userId: string // Creator's Firebase UID
): Promise<MonitoringSession> {
  if (!uprId || !period || !userId) {
    console.error("Error in addMonitoringSession: uprId, period, or userId is missing.", { uprId, period, userId });
    throw new Error("UPR ID, Periode aplikasi, atau User ID tidak valid.");
  }
  if (!data.name || !data.startDate || !data.endDate) {
    console.error("Error in addMonitoringSession: name, startDate, or endDate is missing.", data);
    throw new Error("Nama sesi, tanggal mulai, dan tanggal selesai harus diisi.");
  }

  try {
    const docDataToSave = {
      ...data,
      uprId, // Store uprId
      period,
      status: data.status || 'Direncanakan', 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    console.log("[monitoringService] Data to add MonitoringSession:", JSON.stringify(docDataToSave, null, 2));
    const docRef = await addDoc(collection(db, MONITORING_SESSIONS_COLLECTION), docDataToSave);

    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
      throw new Error("Gagal mengambil dokumen sesi pemantauan yang baru dibuat.");
    }
    const newDocData = newDocSnap.data();
    const createdAtTimestamp = newDocData.createdAt instanceof Timestamp ? newDocData.createdAt.toDate() : new Date();
    const updatedAtTimestamp = newDocData.updatedAt instanceof Timestamp ? newDocData.updatedAt.toDate() : new Date();

    return {
      id: docRef.id,
      ...data,
      uprId,
      period,
      status: newDocData.status as MonitoringSession['status'],
      createdAt: createdAtTimestamp.toISOString(),
      updatedAt: updatedAtTimestamp.toISOString(),
    } as MonitoringSession;

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[monitoringService] Error adding monitoring session: ", errorMessage);
    throw new Error(`Gagal menambahkan sesi pemantauan. Pesan: ${errorMessage}`);
  }
}

export async function getMonitoringSessions(uprId: string, period: string, userIdForContextValidation?: string): Promise<MonitoringSession[]> {
  // userIdForContextValidation can be used if you want to further filter by who created them, but UPR context is primary
  if (!uprId || !period) {
    console.warn("[monitoringService] getMonitoringSessions: uprId or period is missing.");
    return [];
  }
  try {
    const q = query(
      collection(db, MONITORING_SESSIONS_COLLECTION),
      where("uprId", "==", uprId), // Filter by uprId
      where("period", "==", period), 
      orderBy("endDate", "desc") 
    );
    const querySnapshot = await getDocs(q);
    const sessions: MonitoringSession[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined;
      const startDate = data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString() : data.startDate;
      const endDate = data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString() : data.endDate;

      sessions.push({ 
        id: docSnap.id,
        uprId: data.uprId,
        period: data.period,
        name: data.name,
        startDate,
        endDate,
        riskCauseIdsToMonitor: data.riskCauseIdsToMonitor || [],
        status: data.status as MonitoringSessionStatus,
        createdAt,
        updatedAt,
      });
    });
    return sessions;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[monitoringService] Error getting monitoring sessions: ", error.code, errorMessage);
    let detailedErrorMessage = "Gagal mengambil daftar sesi pemantauan.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Indeks komposit mungkin hilang. Periksa Firebase Console.";
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getMonitoringSessionById(sessionId: string, uprId: string, period: string): Promise<MonitoringSession | null> {
  if (!sessionId || !uprId || !period) {
    console.error("[monitoringService] getMonitoringSessionById: One or more required IDs are missing.");
    throw new Error(`ID Sesi, UPR ID, dan Periode wajib diisi.`);
  }
  try {
    const docRef = doc(db, MONITORING_SESSIONS_COLLECTION, sessionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.uprId !== uprId || data.period !== period) {
        console.warn(`[monitoringService] MonitoringSession ${sessionId} found, but context mismatch.`);
        return null;
      }
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined;
      const startDate = data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString() : data.startDate;
      const endDate = data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString() : data.endDate;
      
      return {
        id: docSnap.id,
        ...data,
        uprId: data.uprId,
        startDate,
        endDate,
        createdAt,
        updatedAt,
      } as MonitoringSession;
    } else {
      console.warn(`[monitoringService] MonitoringSession with ID ${sessionId} not found.`);
      return null;
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[monitoringService] Error getting monitoring session by ID ${sessionId}: `, errorMessage);
    throw new Error(`Gagal mengambil detail sesi pemantauan. Pesan: ${errorMessage}`);
  }
}


export async function updateMonitoringSessionStatus(sessionId: string, status: MonitoringSessionStatus): Promise<void> {
  // uprId and period context for update validation can be added if needed by fetching doc first
  if (!sessionId) {
    throw new Error("ID Sesi wajib diisi untuk memperbarui status.");
  }
  try {
    const docRef = doc(db, MONITORING_SESSIONS_COLLECTION, sessionId);
    await updateDoc(docRef, {
      status: status,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[monitoringService] Error updating status for session ID ${sessionId}: `, errorMessage);
    throw new Error(`Gagal memperbarui status sesi pemantauan. Pesan: ${errorMessage}`);
  }
}

export async function deleteMonitoringSession(sessionId: string, uprId: string, period: string): Promise<void> {
  // userId (creator) is not strictly needed for deletion if uprId/period is the main context.
  if (!sessionId || !uprId || !period) {
    throw new Error("ID Sesi, UPR ID, dan Periode aplikasi wajib diisi.");
  }
  console.log(`[monitoringService] Attempting to delete MonitoringSession: ${sessionId} for UPR: ${uprId}, Period: ${period}`);
  const sessionDocRef = doc(db, MONITORING_SESSIONS_COLLECTION, sessionId);
  const batch = writeBatch(db);

  try {
    const sessionDocSnap = await getDoc(sessionDocRef);
    if (!sessionDocSnap.exists()) {
      console.warn(`[monitoringService] MonitoringSession ${sessionId} not found for deletion.`);
      return; 
    }
    const sessionData = sessionDocSnap.data();
    if (sessionData.uprId !== uprId || sessionData.period !== period) {
      console.error(`[monitoringService] Deletion denied for session ${sessionId}: context mismatch.`);
      throw new Error("Operasi tidak diizinkan: sesi tidak cocok dengan konteks UPR/periode.");
    }

    await deleteRiskExposuresByMonitoringSession(sessionId, uprId, period, batch);
    console.log(`[monitoringService] Related RiskExposures for session ${sessionId} added to batch.`);
    
    await deleteMonitoredControlMeasuresBySession(sessionId, uprId, period, batch);
    console.log(`[monitoringService] Related MonitoredControlMeasuresData for session ${sessionId} added to batch.`);

    batch.delete(sessionDocRef);
    console.log(`[monitoringService] MonitoringSession ${sessionId} added to batch.`);

    await batch.commit();
    console.log(`[monitoringService] Successfully deleted MonitoringSession ${sessionId} and related data.`);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[monitoringService] Error deleting monitoring session ${sessionId}: `, errorMessage);
    throw new Error(`Gagal menghapus sesi pemantauan dan data terkaitnya. Pesan: ${errorMessage}`);
  }
}

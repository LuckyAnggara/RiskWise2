
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
} from 'firebase/firestore';
import { MONITORING_SESSIONS_COLLECTION } from './collectionNames';

export async function addMonitoringSession(
  data: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'status'>,
  userId: string,
  period: string
): Promise<MonitoringSession> {
  if (!userId || !period) {
    throw new Error("User ID dan Periode aplikasi wajib diisi untuk membuat sesi pemantauan.");
  }
  if (!data.name || !data.startDate || !data.endDate) {
    throw new Error("Nama sesi, tanggal mulai, dan tanggal selesai wajib diisi.");
  }
  if (new Date(data.startDate) >= new Date(data.endDate)) {
    throw new Error("Tanggal mulai harus sebelum tanggal selesai.");
  }

  try {
    const docDataToSave = {
      ...data,
      userId,
      period, // Periode aplikasi saat sesi dibuat
      status: 'Direncanakan' as MonitoringSessionStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    console.log("[monitoringService] Data to add MonitoringSession:", JSON.stringify(docDataToSave, null, 2));
    const docRef = await addDoc(collection(db, MONITORING_SESSIONS_COLLECTION), docDataToSave);
    
    // Fetch the just-created document to get server-generated timestamps
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
      throw new Error("Gagal mengambil sesi pemantauan yang baru saja dibuat.");
    }
    const newDocData = newDocSnap.data();
    const createdAt = newDocData.createdAt instanceof Timestamp ? newDocData.createdAt.toDate().toISOString() : new Date().toISOString();
    const updatedAt = newDocData.updatedAt instanceof Timestamp ? newDocData.updatedAt.toDate().toISOString() : new Date().toISOString();

    return {
      id: docRef.id,
      ...data,
      userId,
      period,
      status: 'Direncanakan',
      createdAt,
      updatedAt,
    };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[monitoringService] Error adding monitoring session to Firestore: ", errorMessage);
    throw new Error(`Gagal menambahkan sesi pemantauan. Pesan: ${errorMessage}`);
  }
}

export async function getMonitoringSessions(userId: string, period: string): Promise<MonitoringSession[]> {
  if (!userId || !period) {
    console.warn("[monitoringService] getMonitoringSessions: userId or period is missing.", { userId, period });
    return [];
  }
  try {
    const q = query(
      collection(db, MONITORING_SESSIONS_COLLECTION),
      where("userId", "==", userId),
      where("period", "==", period), // Menyaring berdasarkan periode aplikasi
      orderBy("endDate", "desc") // Menampilkan yang terbaru di atas
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
        userId: data.userId,
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
    console.error("[monitoringService] Error getting monitoring sessions from Firestore: ", error.code, errorMessage);
    let detailedErrorMessage = "Gagal mengambil daftar sesi pemantauan.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Ini mungkin karena indeks komposit yang hilang. Periksa Firebase Console (Firestore Database > Indexes) dan buat indeks yang disarankan jika ada.";
    } else {
      detailedErrorMessage += ` Pesan: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getMonitoringSessionById(sessionId: string, userId: string, period: string): Promise<MonitoringSession | null> {
  if (!sessionId || !userId || !period) {
    console.error("[monitoringService] getMonitoringSessionById: One or more required IDs are missing.", { sessionId, userId, period });
    throw new Error("ID Sesi, User ID, dan Periode wajib diisi.");
  }
  try {
    const docRef = doc(db, MONITORING_SESSIONS_COLLECTION, sessionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.userId !== userId || data.period !== period) {
        console.warn(`[monitoringService] MonitoringSession ${sessionId} found, but context mismatch. Expected User: ${userId}, Period: ${period}. Found: User: ${data.userId}, Period: ${data.period}`);
        return null;
      }
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined;
      const startDate = data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString() : data.startDate;
      const endDate = data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString() : data.endDate;
      
      return {
        id: docSnap.id,
        ...data,
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
    console.error(`[monitoringService] Error updating monitoring session status for ID ${sessionId}: `, errorMessage);
    throw new Error(`Gagal memperbarui status sesi pemantauan. Pesan: ${errorMessage}`);
  }
}

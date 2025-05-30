
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
  data: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period'>,
  userId: string,
  period: string // Periode aplikasi saat sesi ini dibuat
): Promise<MonitoringSession> {
  if (!userId || !period) {
    console.error("Error in addMonitoringSession: userId or period is missing.", { userId, period });
    throw new Error("User ID atau Periode aplikasi tidak valid untuk memulai sesi pemantauan.");
  }
  if (!data.name || !data.startDate || !data.endDate) {
    console.error("Error in addMonitoringSession: name, startDate, or endDate is missing.", data);
    throw new Error("Nama periode pemantauan, tanggal mulai, dan tanggal selesai harus diisi.");
  }

  try {
    const docDataToSave = {
      ...data,
      userId,
      period,
      status: data.status || 'Aktif', // Default status
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
      userId,
      period,
      status: newDocData.status as MonitoringSession['status'],
      createdAt: createdAtTimestamp.toISOString(),
      updatedAt: updatedAtTimestamp.toISOString(),
    } as MonitoringSession;

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("Error adding monitoring session to Firestore: ", errorMessage);
    throw new Error(`Gagal menambahkan sesi pemantauan ke database. Pesan: ${errorMessage}`);
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
    throw new Error(`ID Sesi ${sessionId}, User ID${userId}, dan Periode ${period} wajib diisi.`);
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

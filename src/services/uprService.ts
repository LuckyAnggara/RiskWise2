
"use server";

import { db } from '@/lib/firebase/config';
import type { UPR } from '@/lib/types';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { UPRS_COLLECTION, GOALS_COLLECTION, POTENTIAL_RISKS_COLLECTION, RISK_CAUSES_COLLECTION, CONTROL_MEASURES_COLLECTION, MONITORING_SESSIONS_COLLECTION, RISK_EXPOSURES_COLLECTION, MONITORED_CONTROL_MEASURES_DATA_COLLECTION } from './collectionNames';
import { deleteGoal } from './goalService'; // Untuk cascade delete

// Fungsi untuk mendapatkan UPR berdasarkan ID
export async function getUprById(uprId: string): Promise<UPR | null> {
  if (!uprId) {
    console.warn("[uprService] getUprById: uprId is missing.");
    return null;
  }
  try {
    const uprRef = doc(db, UPRS_COLLECTION, uprId);
    const docSnap = await getDoc(uprRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined;
      return { 
        id: docSnap.id,
        name: data.name,
        code: data.code,
        description: data.description || null,
        createdAt,
        updatedAt
      } as UPR;
    }
    return null;
  } catch (error: any) {
    console.error(`[uprService] Error getting UPR by ID ${uprId}: `, error.message || String(error));
    throw new Error(`Gagal mengambil data UPR. Pesan: ${error.message || String(error)}`);
  }
}


export async function addUpr(
  data: Omit<UPR, 'id' | 'createdAt' | 'updatedAt'>
): Promise<UPR> {
  if (!data.name || !data.code) {
    throw new Error("Nama dan Kode UPR wajib diisi.");
  }
  try {
    const docDataToSave = {
      ...data,
      description: data.description || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, UPRS_COLLECTION), docDataToSave);
    const newDocSnap = await getDoc(docRef); // Get the actual document to retrieve server-generated timestamps
    if (!newDocSnap.exists()) {
        throw new Error("Gagal mengambil dokumen UPR yang baru dibuat.");
    }
    const newDocData = newDocSnap.data();
    const createdAtTimestamp = newDocData.createdAt instanceof Timestamp ? newDocData.createdAt.toDate() : new Date();
    const updatedAtTimestamp = newDocData.updatedAt instanceof Timestamp ? newDocData.updatedAt.toDate() : new Date();

    return {
      id: docRef.id,
      ...data,
      description: data.description || null,
      createdAt: createdAtTimestamp.toISOString(),
      updatedAt: updatedAtTimestamp.toISOString(),
    };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[uprService] Error adding UPR: ", errorMessage);
    throw new Error(`Gagal menambahkan UPR. Pesan: ${errorMessage}`);
  }
}

export async function getAllUprs(): Promise<UPR[]> {
  try {
    const q = query(collection(db, UPRS_COLLECTION), orderBy("code", "asc"));
    const querySnapshot = await getDocs(q);
    const uprs: UPR[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined;
      uprs.push({
        id: docSnap.id,
        name: data.name,
        code: data.code,
        description: data.description || null,
        createdAt,
        updatedAt
      } as UPR);
    });
    return uprs;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[uprService] Error getting all UPRs: ", error.message || String(error));
    throw new Error(`Gagal mengambil daftar UPR. Pesan: ${errorMessage}`);
  }
}

export async function updateUpr(
  uprId: string,
  data: Partial<Omit<UPR, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!uprId) {
    throw new Error("ID UPR wajib diisi untuk pembaruan.");
  }
  try {
    const docRef = doc(db, UPRS_COLLECTION, uprId);
    await updateDoc(docRef, {
      ...data,
      description: data.description === undefined ? undefined : (data.description || null),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[uprService] Error updating UPR ${uprId}: `, errorMessage);
    throw new Error(`Gagal memperbarui UPR. Pesan: ${errorMessage}`);
  }
}

export async function deleteUpr(uprId: string): Promise<void> {
  if (!uprId) {
    throw new Error("ID UPR wajib diisi untuk penghapusan.");
  }
  const batch = writeBatch(db);
  try {
    // Delete UPR document
    const uprRef = doc(db, UPRS_COLLECTION, uprId);
    batch.delete(uprRef);

    // Delete related data (Goals, PotentialRisks, RiskCauses, ControlMeasures, MonitoringSessions, RiskExposures, MonitoredControlMeasuresData)
    // This requires querying each collection for documents with the matching uprId and adding their deletion to the batch.
    // For brevity, only Goal deletion is shown here. Similar logic would apply to others.
    const goalsQuery = query(collection(db, GOALS_COLLECTION), where("uprId", "==", uprId));
    const goalsSnapshot = await getDocs(goalsQuery);
    for (const goalDoc of goalsSnapshot.docs) {
      // Assuming deleteGoal handles its own sub-collections like PotentialRisks
      // If deleteGoal directly uses batch, pass it. Otherwise, call deleteGoal which commits its own batch.
      // For a single, large atomic operation, all sub-deletes should ideally accept a batch.
      // For now, we'll call deleteGoal which will perform its own cascade. This is less atomic but simpler to implement here.
      // To make it fully atomic, deleteGoal and sub-deletes must accept a batch.
      await deleteGoal(goalDoc.id, uprId, goalDoc.data().period); // Period needs to be known
    }
    
    // TODO: Add similar logic for deleting PRs, RCs, CMs, Monitoring Sessions, etc., or ensure their respective deleteByParentID functions accept a batch.
    // Example for PotentialRisks (conceptual, needs service implementation)
    // const prQuery = query(collection(db, POTENTIAL_RISKS_COLLECTION), where("uprId", "==", uprId));
    // const prSnapshot = await getDocs(prQuery);
    // for (const prDoc of prSnapshot.docs) {
    //   await deletePotentialRiskAndSubCollections(prDoc.id, uprId, prDoc.data().period, batch);
    // }
    // And so on for other collections...

    await batch.commit();
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[uprService] Error deleting UPR ${uprId} and related data: `, errorMessage);
    throw new Error(`Gagal menghapus UPR dan data terkait. Pesan: ${errorMessage}`);
  }
}

    

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
import { deleteGoal } from './goalService'; 

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
        riskAppetite: data.riskAppetite === undefined ? null : data.riskAppetite,
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
      riskAppetite: data.riskAppetite === undefined ? null : data.riskAppetite,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, UPRS_COLLECTION), docDataToSave);
    const newDocSnap = await getDoc(docRef); 
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
      riskAppetite: data.riskAppetite === undefined ? null : data.riskAppetite,
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
        riskAppetite: data.riskAppetite === undefined ? null : data.riskAppetite,
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
    const updateData: any = { ...data, updatedAt: serverTimestamp() };
    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }
    if (data.riskAppetite !== undefined) {
      updateData.riskAppetite = data.riskAppetite === null ? null : Number(data.riskAppetite);
    }

    await updateDoc(docRef, updateData);
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
    const uprRef = doc(db, UPRS_COLLECTION, uprId);
    batch.delete(uprRef);

    const goalsQuery = query(collection(db, GOALS_COLLECTION), where("uprId", "==", uprId));
    const goalsSnapshot = await getDocs(goalsQuery);
    for (const goalDoc of goalsSnapshot.docs) {
      await deleteGoal(goalDoc.id, uprId, goalDoc.data().period); 
    }
    
    await batch.commit();
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[uprService] Error deleting UPR ${uprId} and related data: `, errorMessage);
    throw new Error(`Gagal menghapus UPR dan data terkait. Pesan: ${errorMessage}`);
  }
}

    

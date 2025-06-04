
"use server";

import { db } from '@/lib/firebase/config';
import type { PotentialRisk } from '@/lib/types';
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
  getDoc,
  type WriteBatch
} from 'firebase/firestore';
import { 
    POTENTIAL_RISKS_COLLECTION,
} from './collectionNames';
import { deleteRiskCauseAndSubCollections } from './riskCauseService';

export async function addPotentialRisk(
  data: Omit<PotentialRisk, 'id' | 'identifiedAt' | 'period' | 'userId' | 'uprId' | 'sequenceNumber' | 'goalId'>,
  goalId: string,
  uprId: string | null, // ID UPR tempat data ini akan berada
  period: string,
  creatorUserId: string, // UID pengguna yang membuat record ini
  sequenceNumber: number
): Promise<PotentialRisk> {
  if (!uprId || typeof uprId !== 'string' || uprId.trim() === "") {
    console.error("[potentialRiskService] addPotentialRisk: uprId (konteks UPR) is invalid.", {uprId});
    throw new Error("UPR ID (konteks) tidak valid untuk menambahkan potensi risiko.");
  }
  if (!period || typeof period !== 'string' || period.trim() === "") {
    console.error("[potentialRiskService] addPotentialRisk: period is invalid.", {period});
    throw new Error("Periode tidak valid untuk menambahkan potensi risiko.");
  }
  if (!creatorUserId || typeof creatorUserId !== 'string' || creatorUserId.trim() === "") {
    console.error("[potentialRiskService] addPotentialRisk: creatorUserId (pembuat record) is invalid.", {creatorUserId});
    throw new Error("Creator User ID (pembuat record) tidak valid untuk menambahkan potensi risiko.");
  }
  if (!goalId || typeof goalId !== 'string' || goalId.trim() === "") {
    console.error("[potentialRiskService] addPotentialRisk: goalId is invalid.", {goalId});
    throw new Error("Goal ID tidak valid untuk menambahkan potensi risiko.");
  }

  try {
    const docDataToSave = {
      ...data,
      goalId,
      uprId: uprId,       // UPR tempat data ini berada
      userId: creatorUserId, // Pengguna yang membuat/memiliki record ini
      period,
      sequenceNumber,
      category: data.category || null,
      owner: data.owner || null,
      identifiedAt: serverTimestamp(),
    };
    console.log("[potentialRiskService] Data to save for new PotentialRisk:", JSON.stringify(docDataToSave, null, 2));
    const docRef = await addDoc(collection(db, POTENTIAL_RISKS_COLLECTION), docDataToSave);
    
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
        throw new Error("Gagal mengambil dokumen PotentialRisk yang baru dibuat dari Firestore.");
    }
    const savedData = newDocSnap.data();
    const identifiedAtTimestamp = savedData.identifiedAt instanceof Timestamp ? savedData.identifiedAt.toDate() : new Date();

    return {
      id: docRef.id,
      goalId,
      uprId: savedData.uprId,
      userId: savedData.userId,
      period,
      description: data.description,
      category: data.category || null,
      owner: data.owner || null,
      identifiedAt: identifiedAtTimestamp.toISOString(),
      sequenceNumber,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[potentialRiskService] Error adding potential risk: ", errorMessage);
    throw new Error(`Gagal menambahkan potensi risiko. Pesan: ${errorMessage}`);
  }
}

export async function getPotentialRisksByGoalId(goalId: string, uprId: string, period: string): Promise<PotentialRisk[]> {
  if (!uprId || !period) {
    console.warn(`[potentialRiskService] getPotentialRisksByGoalId: uprId or period is missing for goalId ${goalId}`);
    return [];
  }
  try {
    const q = query(
      collection(db, POTENTIAL_RISKS_COLLECTION),
      where("goalId", "==", goalId),
      where("uprId", "==", uprId), 
      where("period", "==", period),
      orderBy("sequenceNumber", "asc")
    );
    const querySnapshot = await getDocs(q);
    const potentialRisks: PotentialRisk[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      const identifiedAtTimestamp = data.identifiedAt instanceof Timestamp ? data.identifiedAt : (data.identifiedAt?.toDate ? data.identifiedAt.toDate() : null);
      const identifiedAtISO = identifiedAtTimestamp instanceof Date ? identifiedAtTimestamp.toISOString() : (data.identifiedAt && typeof data.identifiedAt === 'string' ? data.identifiedAt : new Date().toISOString());
      
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt : (data.updatedAt?.toDate ? data.updatedAt.toDate() : null);
      const updatedAtISO = updatedAtTimestamp instanceof Date ? updatedAtTimestamp.toISOString() : (data.updatedAt && typeof data.updatedAt === 'string' ? data.updatedAt : undefined);

      potentialRisks.push({ 
        id: doc.id, 
        ...data, 
        uprId: data.uprId,
        userId: data.userId, 
        period: data.period,
        goalId: data.goalId,
        identifiedAt: identifiedAtISO,
        updatedAt: updatedAtISO,
        category: data.category || null,
        owner: data.owner || null,
        sequenceNumber: data.sequenceNumber,
      } as PotentialRisk);
    });
    return potentialRisks;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[potentialRiskService] Error getting potential risks: ", errorMessage);
    let detailedErrorMessage = "Gagal mengambil daftar potensi risiko.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Indeks komposit mungkin hilang. Periksa Firebase Console.";
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getPotentialRiskById(id: string, uprId: string, period: string): Promise<PotentialRisk | null> {
  if (!uprId || !period) {
    console.warn(`[potentialRiskService] getPotentialRiskById: uprId or period is missing for id ${id}`);
    return null;
  }
  try {
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.uprId !== uprId || data.period !== period) {
        console.warn(`PotentialRisk ${id} found, but its uprId (${data.uprId}) or period (${data.period}) does not match requested context (UPR: ${uprId}, Period: ${period}).`);
        return null; 
      }

      const identifiedAtTimestamp = data.identifiedAt instanceof Timestamp ? data.identifiedAt : (data.identifiedAt?.toDate ? data.identifiedAt.toDate() : null);
      const identifiedAtISO = identifiedAtTimestamp instanceof Date ? identifiedAtTimestamp.toISOString() : (data.identifiedAt && typeof data.identifiedAt === 'string' ? data.identifiedAt : new Date().toISOString());
      
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt : (data.updatedAt?.toDate ? data.updatedAt.toDate() : null);
      const updatedAtISO = updatedAtTimestamp instanceof Date ? updatedAtTimestamp.toISOString() : (data.updatedAt && typeof data.updatedAt === 'string' ? data.updatedAt : undefined);
      
      return { 
        id: docSnap.id, 
        ...data, 
        uprId: data.uprId,
        userId: data.userId,
        period: data.period,
        goalId: data.goalId,
        identifiedAt: identifiedAtISO,
        updatedAt: updatedAtISO,
        category: data.category || null,
        owner: data.owner || null,
        sequenceNumber: data.sequenceNumber,
      } as PotentialRisk;
    }
    console.warn(`[potentialRiskService] PotentialRisk with ID ${id} not found.`);
    return null;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[potentialRiskService] Error getting potential risk by ID: ", errorMessage);
    throw new Error(`Gagal mengambil detail potensi risiko. Pesan: ${errorMessage}`);
  }
}

export async function updatePotentialRisk(id: string, data: Partial<Omit<PotentialRisk, 'id' | 'uprId' | 'userId' | 'period' | 'goalId' | 'identifiedAt' | 'sequenceNumber'>>): Promise<void> {
  try {
    const docRef = doc(db, POTENTIAL_RISKS_COLLECTION, id);
    const updateData = {
        ...data,
        category: data.category === undefined ? undefined : (data.category || null),
        owner: data.owner === undefined ? undefined : (data.owner || null),
        updatedAt: serverTimestamp() 
    };
    console.log("[potentialRiskService] Data to update for PotentialRisk:", id, JSON.stringify(updateData, null, 2));
    await updateDoc(docRef, updateData);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[potentialRiskService] Error updating potential risk: ", errorMessage);
    throw new Error(`Gagal memperbarui potensi risiko. Pesan: ${errorMessage}`);
  }
}

export async function deletePotentialRiskAndSubCollections(potentialRiskId: string, uprId: string, period: string, batch?: WriteBatch): Promise<void> {
  const localBatch = batch || writeBatch(db);
  console.log(`[potentialRiskService] Attempting to delete PotentialRisk: ${potentialRiskId} for UPR: ${uprId}, Period: ${period}`);
  try {
    const potentialRiskRef = doc(db, POTENTIAL_RISKS_COLLECTION, potentialRiskId);
    const prDoc = await getDoc(potentialRiskRef);
    
    if (!prDoc.exists()) {
      console.warn(`PotentialRisk with ID ${potentialRiskId} not found. Skipping deletion.`);
      if (!batch) await localBatch.commit(); // Commit if this is the top-level call and doc didn't exist
      return;
    }

    const prData = prDoc.data();
    if (prData.uprId !== uprId || prData.period !== period) {
        console.error(`Attempt to delete PotentialRisk ${potentialRiskId} denied: context mismatch.`);
        throw new Error("Operasi tidak diizinkan: potensi risiko tidak cocok dengan konteks UPR/periode.");
    }

    const riskCauses = await getRiskCausesByPotentialRiskId(potentialRiskId, uprId, period); 
    console.log(`Found ${riskCauses.length} risk causes for PotentialRisk ${potentialRiskId}`);

    for (const riskCause of riskCauses) {
      await deleteRiskCauseAndSubCollections(riskCause.id, uprId, period, localBatch); 
    }

    localBatch.delete(potentialRiskRef);
    console.log(`PotentialRisk ${potentialRiskId} and its sub-collections added to batch for deletion.`);

    if (!batch) { 
      await localBatch.commit();
      console.log(`PotentialRisk ${potentialRiskId} and related data committed for deletion.`);
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[potentialRiskService] Error deleting potential risk: ", errorMessage);
    if (!(error.message && error.message.toLowerCase().includes("no document to update"))){
        throw new Error(`Gagal menghapus potensi risiko dan data terkaitnya. Pesan: ${errorMessage}`);
    } else {
        console.warn("Skipped re-throwing error during cascading delete, likely already deleted:", errorMessage);
    }
  }
}

    

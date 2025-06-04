
"use server";

import { db } from '@/lib/firebase/config';
import type { ControlMeasure, ControlMeasureTypeKey } from '@/lib/types';
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
  type WriteBatch
} from 'firebase/firestore';
import { CONTROL_MEASURES_COLLECTION } from './collectionNames';

export async function addControlMeasure(
  data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'uprId' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'controlType'>,
  riskCauseId: string,
  potentialRiskId: string,
  goalId: string,
  uprId: string, // Added uprId
  period: string,
  userId: string, // Creator's Firebase UID
  controlType: ControlMeasureTypeKey
): Promise<ControlMeasure> {
  if (!uprId || !period || !userId || !riskCauseId || !potentialRiskId || !goalId || !controlType) {
    console.error("[controlMeasureService] addControlMeasure: Missing one or more IDs or controlType.", {uprId, period, userId, riskCauseId, potentialRiskId, goalId, controlType});
    throw new Error("ID UPR, Periode, User, Induk, Tipe Pengendalian tidak valid.");
  }

  try {
    const allControlMeasuresForCause = await getControlMeasuresByRiskCauseId(riskCauseId, uprId, period, userId); // Pass uprId and period
    const existingControlsOfType = allControlMeasuresForCause.filter(cm => cm.controlType === controlType);
    const calculatedSequenceNumber = existingControlsOfType.length + 1;

    console.log(`[controlMeasureService] Calculated sequence for new ${controlType} control: ${calculatedSequenceNumber} for RC ${riskCauseId} in UPR ${uprId}`);

    const docDataToSave = {
      ...data,
      riskCauseId,
      potentialRiskId,
      goalId,
      uprId, // Store uprId
      period,
      userId, // Store creator's Firebase UID
      controlType, 
      sequenceNumber: calculatedSequenceNumber,
      keyControlIndicator: data.keyControlIndicator || null,
      target: data.target || null,
      responsiblePerson: data.responsiblePerson || null,
      deadline: data.deadline || null,
      budget: data.budget || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    console.log("[controlMeasureService] Data to add ControlMeasure:", JSON.stringify(docDataToSave, null, 2));
    const docRef = await addDoc(collection(db, CONTROL_MEASURES_COLLECTION), docDataToSave);
    
    const nowISO = new Date().toISOString();
    return {
      id: docRef.id,
      ...data,
      riskCauseId,
      potentialRiskId,
      goalId,
      uprId,
      period,
      userId,
      controlType,
      sequenceNumber: calculatedSequenceNumber,
      createdAt: nowISO, 
      updatedAt: nowISO, 
    };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[controlMeasureService] Error adding control measure: ", errorMessage);
    throw new Error(`Gagal menambahkan tindakan pengendalian. Pesan: ${errorMessage}`);
  }
}

export async function getControlMeasuresByRiskCauseId(riskCauseId: string, uprId: string, period: string, userIdForContextValidation?: string): Promise<ControlMeasure[]> {
  if (!uprId || !period || !riskCauseId) {
    console.warn("[controlMeasureService] getControlMeasuresByRiskCauseId: uprId, period, or riskCauseId is missing.");
    return [];
  }
  try {
    const q = query(
      collection(db, CONTROL_MEASURES_COLLECTION),
      where("riskCauseId", "==", riskCauseId),
      where("uprId", "==", uprId), // Filter by uprId
      where("period", "==", period),
      orderBy("controlType", "asc"), 
      orderBy("sequenceNumber", "asc")
    );
    const querySnapshot = await getDocs(q);
    const controlMeasures: ControlMeasure[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAtTimestamp = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      const deadlineTimestamp = data.deadline instanceof Timestamp ? data.deadline.toDate() : (data.deadline ? new Date(data.deadline) : null);

      controlMeasures.push({ 
        id: docSnap.id, 
        ...data,
        uprId: data.uprId,
        riskCauseId: data.riskCauseId,
        potentialRiskId: data.potentialRiskId,
        goalId: data.goalId,
        userId: data.userId,
        period: data.period,
        controlType: data.controlType,
        sequenceNumber: data.sequenceNumber,
        description: data.description,
        keyControlIndicator: data.keyControlIndicator || null,
        target: data.target || null,
        responsiblePerson: data.responsiblePerson || null,
        deadline: deadlineTimestamp ? deadlineTimestamp.toISOString() : null,
        budget: data.budget || null,
        createdAt: createdAtTimestamp.toISOString(), 
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
      } as ControlMeasure);
    });
    return controlMeasures;
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[controlMeasureService] Error getting control measures: ", errorMessage);
    let detailedErrorMessage = "Gagal mengambil daftar tindakan pengendalian.";
    if (error.code === 'failed-precondition') {
        detailedErrorMessage += " Indeks komposit mungkin hilang. Periksa Firebase Console.";
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getControlMeasureById(id: string, uprId: string, period: string): Promise<ControlMeasure | null> {
  if (!id || !uprId || !period) {
    console.error("[controlMeasureService] getControlMeasureById: id, uprId, or period is invalid.");
    throw new Error("ID Tindakan Pengendalian, UPR ID, atau Periode tidak valid.");
  }

  try {
    const docRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.uprId !== uprId || data.period !== period) {
        console.warn(`ControlMeasure ${id} found, but does not match current UPR/period context.`);
        return null;
      }

      const createdAtTimestamp = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      const deadlineTimestamp = data.deadline instanceof Timestamp ? data.deadline.toDate() : (data.deadline ? new Date(data.deadline) : null);

      return {
        id: docSnap.id,
        ...data,
        uprId: data.uprId,
        createdAt: createdAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
        deadline: deadlineTimestamp ? deadlineTimestamp.toISOString() : null,
      } as ControlMeasure;
    } else {
      console.warn(`[controlMeasureService] ControlMeasure with ID ${id} not found.`);
      return null;
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[controlMeasureService] Error getting control measure by ID ${id}: `, errorMessage);
    throw new Error(`Gagal mengambil detail tindakan pengendalian. Pesan: ${errorMessage}`);
  }
}


export async function updateControlMeasure(id: string, data: Partial<Omit<ControlMeasure, 'id' | 'uprId' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber' | 'updatedAt'>>): Promise<void> {
  // uprId, riskCauseId, etc., are not updated here. Context should be validated by the caller or in a higher-level function.
  if (!id || typeof id !== 'string' || id.trim() === "") {
    console.error("[controlMeasureService] updateControlMeasure: id is invalid.", {id});
    throw new Error("ID Tindakan Pengendalian tidak valid untuk pembaruan.");
  }
  try {
    const docRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
    const updateData = {
        ...data,
        deadline: data.deadline === undefined ? undefined : (data.deadline || null),
        budget: data.budget === undefined ? undefined : (data.budget === null ? null : Number(data.budget)),
        keyControlIndicator: data.keyControlIndicator === undefined ? undefined : (data.keyControlIndicator || null),
        target: data.target === undefined ? undefined : (data.target || null),
        responsiblePerson: data.responsiblePerson === undefined ? undefined : (data.responsiblePerson || null),
        updatedAt: serverTimestamp()
    };
    console.log("[controlMeasureService] Data to update ControlMeasure:", id, JSON.stringify(updateData, null, 2));
    await updateDoc(docRef, updateData);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[controlMeasureService] Error updating control measure: ", errorMessage);
    throw new Error(`Gagal memperbarui tindakan pengendalian. Pesan: ${errorMessage}`);
  }
}

export async function deleteControlMeasure(id: string, batch?: WriteBatch): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim() === "") {
    console.error("[controlMeasureService] deleteControlMeasure: id is invalid.", {id});
    throw new Error("ID Tindakan Pengendalian tidak valid untuk penghapusan.");
  }
  const controlMeasureRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
  console.log(`[controlMeasureService] Attempting to delete ControlMeasure with ID: ${id}`);
  if (batch) {
    batch.delete(controlMeasureRef);
  } else {
    try {
      await deleteDoc(controlMeasureRef);
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error("[controlMeasureService] Error deleting control measure: ", errorMessage);
      throw new Error(`Gagal menghapus tindakan pengendalian. Pesan: ${errorMessage}`);
    }
  }
}

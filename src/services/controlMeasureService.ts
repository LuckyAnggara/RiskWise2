
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
  data: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'period' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'sequenceNumber' | 'controlType'>,
  riskCauseId: string,
  potentialRiskId: string,
  goalId: string,
  userId: string,
  period: string,
  controlType: ControlMeasureTypeKey
): Promise<ControlMeasure> {
  if (!userId || typeof userId !== 'string' || userId.trim() === "") {
    console.error("[controlMeasureService] addControlMeasure: userId is invalid.", {userId});
    throw new Error("User ID tidak valid untuk menambahkan tindakan pengendalian.");
  }
  if (!period || typeof period !== 'string' || period.trim() === "") {
    console.error("[controlMeasureService] addControlMeasure: period is invalid.", {period});
    throw new Error("Periode tidak valid untuk menambahkan tindakan pengendalian.");
  }
  if (!riskCauseId || !potentialRiskId || !goalId) {
    console.error("[controlMeasureService] addControlMeasure: parent IDs are invalid.", {riskCauseId, potentialRiskId, goalId});
    throw new Error("ID Induk (Penyebab/Potensi/Sasaran) tidak valid.");
  }
  if (!controlType || typeof controlType !== 'string' || controlType.trim() === "") {
    console.error("[controlMeasureService] addControlMeasure: controlType is invalid.", {controlType});
    throw new Error("Tipe Pengendalian tidak valid.");
  }

  try {
    // Calculate the next sequence number for this control type within this risk cause
    const allControlMeasuresForCause = await getControlMeasuresByRiskCauseId(riskCauseId, userId, period);
    const existingControlsOfType = allControlMeasuresForCause.filter(cm => cm.controlType === controlType);
    const calculatedSequenceNumber = existingControlsOfType.length + 1;

    console.log(`[controlMeasureService] Calculated sequenceNumber for new ${controlType} control: ${calculatedSequenceNumber} for riskCauseId: ${riskCauseId}`);

    const docDataToSave = {
      ...data,
      riskCauseId,
      potentialRiskId,
      goalId,
      userId,
      period,
      controlType, // Use the passed controlType
      sequenceNumber: calculatedSequenceNumber, // Ensure this uses the calculated value
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
      userId,
      period,
      controlType,
      sequenceNumber: calculatedSequenceNumber,
      createdAt: nowISO, // Placeholder, actual value is server timestamp
      updatedAt: nowISO, // Placeholder
    };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[controlMeasureService] Error adding control measure to Firestore: ", errorMessage, error.code, error.details);
    throw new Error(`Gagal menambahkan tindakan pengendalian ke database. Pesan: ${errorMessage}`);
  }
}

export async function getControlMeasuresByRiskCauseId(riskCauseId: string, userId: string, period: string): Promise<ControlMeasure[]> {
  if (!userId || !period || !riskCauseId) {
    console.warn("[controlMeasureService] getControlMeasuresByRiskCauseId: userId, period, or riskCauseId is missing.", { userId, period, riskCauseId });
    return [];
  }
  try {
    const q = query(
      collection(db, CONTROL_MEASURES_COLLECTION),
      where("riskCauseId", "==", riskCauseId),
      where("userId", "==", userId),
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
    console.error("[controlMeasureService] Error getting control measures from Firestore: ", errorMessage, error.code, error);
    let detailedErrorMessage = "Gagal mengambil daftar tindakan pengendalian dari database.";
    if (error.code === 'failed-precondition' || (errorMessage.toLowerCase().includes("index"))) {
        detailedErrorMessage += " Ini seringkali disebabkan oleh indeks komposit yang hilang di Firestore. Silakan periksa Firebase Console Anda (Firestore Database > Indexes) untuk membuat indeks yang diperlukan.";
    } else {
        detailedErrorMessage += ` Pesan Asli: ${errorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

export async function getControlMeasureById(id: string, userId: string, period: string): Promise<ControlMeasure | null> {
  if (!id || typeof id !== 'string' || id.trim() === "") {
    console.error("[controlMeasureService] getControlMeasureById: id is invalid.", {id});
    throw new Error("ID Tindakan Pengendalian tidak valid.");
  }
  if (!userId || typeof userId !== 'string' || userId.trim() === "") {
    console.error("[controlMeasureService] getControlMeasureById: userId is invalid.", {userId});
    throw new Error("User ID tidak valid untuk mengambil tindakan pengendalian.");
  }
  if (!period || typeof period !== 'string' || period.trim() === "") {
    console.error("[controlMeasureService] getControlMeasureById: period is invalid.", {period});
    throw new Error("Periode tidak valid untuk mengambil tindakan pengendalian.");
  }

  try {
    const docRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Validasi konteks
      if (data.userId !== userId || data.period !== period) {
        console.warn(`ControlMeasure ${id} found, but does not match current user/period context. Expected User: ${userId}, Period: ${period}. Found: User: ${data.userId}, Period: ${data.period}`);
        return null;
      }

      const createdAtTimestamp = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
      const updatedAtTimestamp = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      const deadlineTimestamp = data.deadline instanceof Timestamp ? data.deadline.toDate() : (data.deadline ? new Date(data.deadline) : null);

      return {
        id: docSnap.id,
        ...data,
        createdAt: createdAtTimestamp.toISOString(),
        updatedAt: updatedAtTimestamp ? updatedAtTimestamp.toISOString() : undefined,
        deadline: deadlineTimestamp ? deadlineTimestamp.toISOString() : null,
      } as ControlMeasure;
    } else {
      console.warn(`ControlMeasure with ID ${id} not found.`);
      return null;
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`[controlMeasureService] Error getting control measure by ID ${id} from Firestore: `, errorMessage);
    throw new Error(`Gagal mengambil detail tindakan pengendalian. Pesan: ${errorMessage}`);
  }
}


export async function updateControlMeasure(id: string, data: Partial<Omit<ControlMeasure, 'id' | 'riskCauseId' | 'potentialRiskId' | 'goalId' | 'userId' | 'period' | 'createdAt' | 'sequenceNumber' | 'updatedAt'>>): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim() === "") {
    console.error("[controlMeasureService] Error in updateControlMeasure: id is invalid.", {id});
    throw new Error("ID Tindakan Pengendalian tidak valid untuk pembaruan.");
  }
  try {
    const docRef = doc(db, CONTROL_MEASURES_COLLECTION, id);
    const updateData = {
        ...data,
        deadline: data.deadline === undefined ? undefined : (data.deadline || null),
        budget: data.budget === undefined ? undefined : (data.budget || null),
        keyControlIndicator: data.keyControlIndicator === undefined ? undefined : (data.keyControlIndicator || null),
        target: data.target === undefined ? undefined : (data.target || null),
        responsiblePerson: data.responsiblePerson === undefined ? undefined : (data.responsiblePerson || null),
        updatedAt: serverTimestamp()
    };
    console.log("[controlMeasureService] Data to update ControlMeasure:", id, JSON.stringify(updateData, null, 2));
    await updateDoc(docRef, updateData);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error("[controlMeasureService] Error updating control measure in Firestore: ", errorMessage, error.code, error.details);
    throw new Error(`Gagal memperbarui tindakan pengendalian di database. Pesan: ${errorMessage}`);
  }
}

export async function deleteControlMeasure(id: string, batch?: WriteBatch): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim() === "") {
    console.error("[controlMeasureService] Error in deleteControlMeasure: id is invalid.", {id});
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
      console.error("[controlMeasureService] Error deleting control measure from Firestore: ", errorMessage, error.code, error.details);
      throw new Error(`Gagal menghapus tindakan pengendalian dari database. Pesan: ${errorMessage}`);
    }
  }
}

    
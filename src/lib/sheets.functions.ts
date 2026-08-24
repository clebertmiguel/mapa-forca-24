import { createServerFn } from "@tanstack/react-start";
import {
  appendRecord,
  deleteRecordById,
  fetchAllRecords,
  fetchLookups,
  findRecordById,
  updateRecordById,
  type RecordRow,
} from "./sheets.server";
import { deleteInput, nowBR, recordInput, updateInput } from "./sheets-operations.server";
import { requireRecordPermission } from "./record-permissions.server";

export const getRecords = createServerFn({ method: "GET" }).handler(
  async () => {
    return await fetchAllRecords();
  },
);

export const getLookups = createServerFn({ method: "GET" }).handler(
  async () => {
    return await fetchLookups();
  },
);

export const createRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => recordInput.parse(data))
  .handler(async ({ data }) => {
    // VTR não precisa mais ser chave única
    /*
    const vtrNorm = data.vtr.trim().toLowerCase();
    const existing = await fetchAllRecords();
    const dup = existing.find(
      (r) =>
        (r.data ?? "").trim() === data.data.trim() &&
        (r.vtr ?? "").trim().toLowerCase() === vtrNorm,
    );
    if (dup) {
      throw new Error(
        `Já existe um registro cadastrado para a VTR ${data.vtr} na data ${data.data}. Verifique os dados e informe uma VTR diferente ou edite o registro existente.`,
      );
    }
    */
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = nowBR();
    const row: RecordRow = {
      id,
      cia: data.cia,
      cidade: data.cidade,
      data: data.data,
      horaInicio: data.horaInicio,
      horaTermino: data.horaTermino,
      vtr: data.vtr,
      modalidade: data.modalidade,
      gradEnc: data.gradEnc ?? "",
      nomeEncarregado: data.nomeEncarregado ?? "",
      gradMot: data.gradMot,
      nomeMotorista: data.nomeMotorista,
      auxiliares: data.auxiliares ?? "",
      criadoEM: now,
      tpd: data.tpd,
      createdByDevice: data.deviceId,
      updatedAt: now,
      createdByEmail: data.createdByEmail ?? "",
    };
    await appendRecord(row);
    return { ok: true as const, id };
  });

export const deleteRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteInput.parse(data))
  .handler(async ({ data }) => {
    const rec = await findRecordById(data.id);
    if (!rec) throw new Error("Registro não encontrado.");
    await requireRecordPermission(rec);
    const deleted = await deleteRecordById(data.id);
    if (!deleted) throw new Error("Não foi possível localizar o registro na planilha.");
    return { ok: true as const };
  });

export const updateRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateInput.parse(data))
  .handler(async ({ data }) => {
    const rec = await findRecordById(data.id);
    if (!rec) throw new Error("Registro não encontrado.");
    await requireRecordPermission(rec);
    // VTR não precisa mais ser chave única
    /*
    const vtrNorm = data.vtr.trim().toLowerCase();
    const all = await fetchAllRecords();
    const dup = all.find(
      (r) =>
        r.id !== data.id &&
        (r.data ?? "").trim() === data.data.trim() &&
        (r.vtr ?? "").trim().toLowerCase() === vtrNorm,
    );
    if (dup) {
      throw new Error(
        `Já existe um registro cadastrado para a VTR ${data.vtr} na data ${data.data}.`,
      );
    }
    */
    const updated: RecordRow = {
      ...rec,
      cia: data.cia,
      cidade: data.cidade,
      data: data.data,
      horaInicio: data.horaInicio,
      horaTermino: data.horaTermino,
      vtr: data.vtr,
      modalidade: data.modalidade,
      gradEnc: data.gradEnc ?? "",
      nomeEncarregado: data.nomeEncarregado ?? "",
      gradMot: data.gradMot,
      nomeMotorista: data.nomeMotorista,
      auxiliares: data.auxiliares ?? "",
      tpd: data.tpd,
      updatedAt: nowBR(),
      createdByEmail: rec.createdByEmail || data.createdByEmail || "",
    };
    await updateRecordById(data.id, updated);
    return { ok: true as const };
  });


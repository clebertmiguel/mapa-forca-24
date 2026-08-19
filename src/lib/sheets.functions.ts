import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  appendRecord,
  deleteRecordById,
  fetchAllRecords,
  fetchLookups,
  findRecordById,
  updateRecordById,
  HEADERS,
  type RecordRow,
} from "./sheets.server";

function nowBR(): string {
  // Formato dd/MM/yyyy HH:mm:ss no fuso de São Paulo
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour")}:${g("minute")}:${g("second")}`;
}

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

const recordInput = z.object({
  cia: z.string().min(1),
  cidade: z.string().min(1),
  data: z.string().min(1),
  horaInicio: z.string().min(1),
  horaTermino: z.string().min(1),
  vtr: z.string().min(1),
  modalidade: z.string().min(1),
  gradEnc: z.string().optional().default(""),
  nomeEncarregado: z.string().optional().default(""),
  gradMot: z.string().min(1),
  nomeMotorista: z.string().min(1),
  auxiliares: z.string().optional().default(""),
  tpd: z.enum(["SIM", "NAO"]),
  deviceId: z.string().min(1, "Identificador do dispositivo ausente"),
  createdByEmail: z.string().optional(),
});

export const createRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => recordInput.parse(data))
  .handler(async ({ data }) => {
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

const deleteInput = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
});

export const deleteRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteInput.parse(data))
  .handler(async ({ data }) => {
    const rec = await findRecordById(data.id);
    if (!rec) throw new Error("Registro não encontrado.");
    if ((rec.createdByDevice ?? "") !== data.deviceId) {
      throw new Error(
        "Este registro foi cadastrado por outro dispositivo e não pode ser editado nesta instalação da aplicação.",
      );
    }
    await deleteRecordById(data.id);
    return { ok: true as const };
  });

const updateInput = recordInput.extend({ id: z.string().min(1) });

export const updateRecord = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateInput.parse(data))
  .handler(async ({ data }) => {
    const rec = await findRecordById(data.id);
    if (!rec) throw new Error("Registro não encontrado.");
    if ((rec.createdByDevice ?? "") !== data.deviceId) {
      throw new Error(
        "Este registro foi cadastrado por outro dispositivo e não pode ser editado nesta instalação da aplicação.",
      );
    }
    // valida duplicidade (ignorando o próprio)
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
    };
    await updateRecordById(data.id, updated);
    return { ok: true as const };
  });

export const FIELD_LABELS: Record<(typeof HEADERS)[number], string> = {
  id: "ID",
  cia: "CIA",
  cidade: "Cidade",
  data: "Data",
  horaInicio: "Início",
  horaTermino: "Término",
  vtr: "VTR",
  modalidade: "Modalidade",
  gradEnc: "Grad Encarregado",
  nomeEncarregado: "Encarregado",
  gradMot: "Grad Motorista",
  nomeMotorista: "Motorista",
  auxiliares: "Auxiliares",
  criadoEM: "Criado em",
  tpd: "TPD",
  createdByDevice: "Dispositivo",
  updatedAt: "Atualizado em",
};


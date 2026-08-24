import { z } from "zod";

export const recordInput = z.object({
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

export const deleteInput = z.object({ id: z.string().min(1) });
export const updateInput = recordInput.extend({ id: z.string().min(1) });

export function nowBR(): string {
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
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${getPart("day")}/${getPart("month")}/${getPart("year")} ${getPart("hour")}:${getPart("minute")}:${getPart("second")}`;
}
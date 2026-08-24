import { HEADERS } from "./sheets.server";

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
  createdByEmail: "Cadastrado por",
};
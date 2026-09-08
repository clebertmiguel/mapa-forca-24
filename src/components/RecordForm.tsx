import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createRecord, updateRecord, getLookups, getRecords } from "@/lib/sheets.functions";
import type { RecordRow } from "@/lib/sheets.server";
import { getDeviceId } from "@/lib/device";
import { getSession } from "@/lib/auth.functions";
import { useQuery } from "@tanstack/react-query";

import { toast } from "sonner";

const schema = z.object({
  data: z.string().min(1, "Obrigatório"),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM"),
  horaTermino: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM"),
  cia: z.string().min(1, "Obrigatório"),
  cidade: z.string().min(1, "Obrigatório"),
  vtr: z.string().min(1, "Obrigatório"),
  modalidade: z.string().min(1, "Obrigatório"),
  gradEnc: z.string().optional(),
  nomeEncarregado: z.string().optional(),
  gradMot: z.string().min(1, "Obrigatório"),
  nomeMotorista: z.string().min(1, "Obrigatório"),
  auxiliares: z.string(),
  tpd: z.enum(["SIM", "NAO"], { message: "Obrigatório" }),
});

type FormValues = z.infer<typeof schema>;

const lookupsQuery = { queryKey: ["lookups"], queryFn: () => getLookups() };

interface Props {
  defaultDate: string;
  onSuccess: (vtr: string) => void;
  initial?: RecordRow;
}

export function RecordForm({ defaultDate, onSuccess, initial }: Props) {
  const isEdit = !!initial;
  const { data: lookups } = useSuspenseQuery(lookupsQuery);
  const { data: existing } = useSuspenseQuery({
    queryKey: ["records"],
    queryFn: () => getRecords(),
  });
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });
  const [dupDialog, setDupDialog] = useState<{ vtr: string; data: string } | null>(null);
  const create = useServerFn(createRecord);
  const update = useServerFn(updateRecord);
  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      isEdit
        ? update({ data: { ...v, deviceId: getDeviceId(), id: initial!.id, createdByEmail: initial?.createdByEmail || session?.email } })
        : create({ data: { ...v, deviceId: getDeviceId(), createdByEmail: session?.email } }),

    onSuccess: (_res, vars) => onSuccess(vars.vtr),
    onError: (e: Error, vars) => {
      if (/já existe um registro/i.test(e.message)) {
        setDupDialog({ vtr: vars.vtr, data: vars.data });
        form.setError("vtr", { type: "manual", message: "Registro idêntico já cadastrado" });
        form.setFocus("vtr");
        return;
      }
      toast.error(e.message || "Falha ao gravar");
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data: initial?.data || defaultDate,
      horaInicio: initial?.horaInicio || "",
      horaTermino: initial?.horaTermino || "",
      cia: initial?.cia || "",
      cidade: initial?.cidade || "",
      vtr: initial?.vtr || "",
      modalidade: initial?.modalidade || "",
      gradEnc: initial?.gradEnc || "",
      nomeEncarregado: initial?.nomeEncarregado || "",
      gradMot: initial?.gradMot || "",
      nomeMotorista: initial?.nomeMotorista || "",
      auxiliares: initial?.auxiliares || "",
      tpd: (initial?.tpd as "SIM" | "NAO") || (undefined as unknown as "SIM"),
    },
  });

  const cidadeEntries = lookups.cidadeEntries?.length
    ? lookups.cidadeEntries
    : lookups.cidades.map((c) => ({ cidade: c, cia: lookups.cidadeToCia?.[c] ?? "" }));
  const cidadeOptionValues = cidadeEntries.map((e) => `${e.cidade}|${e.cia}`);
  const cidadeLabelMap = new Map(
    cidadeEntries.map((e) => [`${e.cidade}|${e.cia}`, e.cia ? `${e.cidade} — ${e.cia}` : e.cidade]),
  );
  const currentCidade = form.watch("cidade");
  const currentCia = form.watch("cia");
  const cidadeSelectValue = currentCidade
    ? cidadeOptionValues.find((v) => v === `${currentCidade}|${currentCia}`) ??
      cidadeOptionValues.find((v) => v.startsWith(`${currentCidade}|`)) ??
      ""
    : "";


  function selectField(
    name: keyof FormValues,
    label: string,
    options: string[],
    onChange?: (val: string) => void,
    triggerClassName?: string,
    renderOption?: (val: string) => string,
  ) {
    const v = form.watch(name);
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Select
          value={v || ""}
          onValueChange={(val) => {
            form.setValue(name, val, { shouldValidate: true });
            onChange?.(val);
          }}
        >
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {renderOption ? renderOption(o) : o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors[name] && (
          <p className="text-xs text-destructive">
            {form.formState.errors[name]?.message as string}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
    <form
      onSubmit={form.handleSubmit((v) => {
        mutation.mutate(v);
      })}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"
    >
      <div className="space-y-1.5">
        <Label>Data</Label>
        <Input type="date" className="w-full sm:w-[20ch]" {...form.register("data")} />
      </div>
      <div className="space-y-1.5">
        <Label>CIA PM</Label>
        <Input
          readOnly
          tabIndex={-1}
          placeholder="Preenchido pela cidade"
          value={form.watch("cia")}
          className="bg-muted cursor-not-allowed w-full sm:w-[14ch]"
        />
        {form.formState.errors.cia && (
          <p className="text-xs text-destructive">
            {form.formState.errors.cia.message as string}
          </p>
        )}
      </div>
      {(["horaInicio", "horaTermino"] as const).map((name) => (
        <div key={name} className="space-y-1.5">
          <Label>{name === "horaInicio" ? "Hora Início" : "Hora Término"}</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="HH:MM"
            maxLength={5}
            className="w-full sm:w-[12ch]"
            value={form.watch(name) ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
              const masked =
                digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
              form.setValue(name, masked, { shouldValidate: true });
            }}
          />
          {form.formState.errors[name] && (
            <p className="text-xs text-destructive">
              {form.formState.errors[name]?.message as string}
            </p>
          )}
        </div>
      ))}
      <div className="space-y-1.5">
        <Label>Cidade</Label>
        <Select
          value={cidadeSelectValue}
          onValueChange={(val) => {
            const [cidade, cia] = val.split("|");
            form.setValue("cidade", cidade, { shouldValidate: true });
            if (cia) form.setValue("cia", cia, { shouldValidate: true });
          }}
        >
          <SelectTrigger className="w-full sm:w-[22ch]">
            <SelectValue placeholder="Selecione cidade" />
          </SelectTrigger>
          <SelectContent>
            {cidadeOptionValues.map((v) => (
              <SelectItem key={v} value={v}>
                {cidadeLabelMap.get(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.cidade && (
          <p className="text-xs text-destructive">
            {form.formState.errors.cidade.message as string}
          </p>
        )}
      </div>

      {selectField("vtr", "Viatura", lookups.viaturas, undefined, "w-full sm:w-[14ch]")}
      {selectField("modalidade", "Modalidade", lookups.modalidades, undefined, "w-full sm:w-[16ch]")}

      <div className="space-y-1.5">
        <Label>TPD</Label>
        <RadioGroup
          className="flex gap-6 h-9 items-center"
          value={form.watch("tpd") ?? ""}
          onValueChange={(val) =>
            form.setValue("tpd", val as "SIM" | "NAO", {
              shouldValidate: true,
            })
          }
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem id="tpd-sim" value="SIM" />
            <Label htmlFor="tpd-sim" className="font-normal cursor-pointer">
              SIM
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="tpd-nao" value="NAO" />
            <Label htmlFor="tpd-nao" className="font-normal cursor-pointer">
              NÃO
            </Label>
          </div>
        </RadioGroup>
        {form.formState.errors.tpd && (
          <p className="text-xs text-destructive">
            {form.formState.errors.tpd.message as string}
          </p>
        )}
      </div>
      <div className="sm:col-span-2 md:col-span-4 grid grid-cols-1 gap-3 sm:grid-cols-[14ch_1fr] md:grid-cols-[14ch_minmax(0,1fr)_14ch_minmax(0,1fr)] items-start">
        {selectField("gradMot", "Grad Motorista", lookups.graduacoes, undefined, "w-full")}
        <div className="space-y-1.5 min-w-0">
          <Label>Nome Motorista</Label>
          <Input
            className="w-full"
            autoCapitalize="characters"
            {...form.register("nomeMotorista")}
            onInput={(e) => {
              const el = e.currentTarget;
              const up = el.value.toLocaleUpperCase("pt-BR");
              if (el.value !== up) el.value = up;
              form.setValue("nomeMotorista", up, { shouldValidate: true });
            }}
            style={{ textTransform: "uppercase" }}
          />
        </div>
        {selectField("gradEnc", "Grad Encarregado", lookups.graduacoes, undefined, "w-full")}
        <div className="space-y-1.5 min-w-0">
          <Label>Nome Encarregado</Label>
          <Input
            className="w-full"
            autoCapitalize="characters"
            {...form.register("nomeEncarregado")}
            onInput={(e) => {
              const el = e.currentTarget;
              const up = el.value.toLocaleUpperCase("pt-BR");
              if (el.value !== up) el.value = up;
              form.setValue("nomeEncarregado", up, { shouldValidate: true });
            }}
            style={{ textTransform: "uppercase" }}
          />
        </div>

      </div>

      <div className="space-y-1.5 sm:col-span-2 md:col-span-4 min-w-0">
        <Label>Auxiliares (separe por vírgula)</Label>
        <Input
          maxLength={120}
          className="w-full"
          {...form.register("auxiliares")}
        />
      </div>

      <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-pm-navy text-primary-foreground hover:bg-pm-navy-strong"
        >
          {mutation.isPending ? "Salvando..." : isEdit ? "Atualizar" : "SALVAR"}
        </Button>
      </div>
    </form>
    <AlertDialog
      open={!!dupDialog}
      onOpenChange={(o) => {
        if (!o) {
          setDupDialog(null);
          setTimeout(() => form.setFocus("vtr"), 0);
        }
      }}
    >
      <AlertDialogContent className="z-[100]">
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Registro já cadastrado</AlertDialogTitle>
          <AlertDialogDescription>
            Já existe um registro igual para a viatura <strong>{dupDialog?.vtr}</strong> na data{" "}
            <strong>{dupDialog?.data}</strong> (mesma modalidade, cidade e horários).
            <br />
            Os dados do formulário foram mantidos: ajuste as informações ou edite o registro existente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

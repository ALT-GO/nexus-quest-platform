import { useState, useCallback } from "react";

export type FieldType = "texto" | "número" | "data" | "seleção";

export type AssetCategory = "notebooks" | "celulares" | "linhas" | "licencas";

export interface CustomField {
  id: string;
  nome: string;
  tipo: FieldType;
  categoria: AssetCategory;
  opcoes?: string[]; // for "seleção" type
  createdAt: string;
}

export interface CustomFieldValue {
  ativoId: string;
  campoId: string;
  valor: string;
}

export interface FieldChangeLog {
  id: string;
  action: "field_created" | "field_updated" | "field_deleted" | "value_changed";
  fieldId?: string;
  fieldName: string;
  assetId?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  user: string;
}

const defaultFields: CustomField[] = [
  {
    id: "cf_1",
    nome: "Data de Compra",
    tipo: "data",
    categoria: "notebooks",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cf_2",
    nome: "Garantia até",
    tipo: "data",
    categoria: "notebooks",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cf_3",
    nome: "Valor de Aquisição",
    tipo: "número",
    categoria: "notebooks",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cf_4",
    nome: "Condição",
    tipo: "seleção",
    categoria: "notebooks",
    opcoes: ["Novo", "Bom", "Regular", "Ruim"],
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const defaultValues: CustomFieldValue[] = [
  { ativoId: "HW-001", campoId: "cf_1", valor: "2024-01-10" },
  { ativoId: "HW-001", campoId: "cf_3", valor: "5200" },
  { ativoId: "HW-001", campoId: "cf_4", valor: "Bom" },
  { ativoId: "HW-002", campoId: "cf_1", valor: "2024-02-05" },
  { ativoId: "HW-002", campoId: "cf_3", valor: "7800" },
  { ativoId: "HW-002", campoId: "cf_4", valor: "Novo" },
  { ativoId: "HW-004", campoId: "cf_1", valor: "2024-10-15" },
  { ativoId: "HW-004", campoId: "cf_3", valor: "5500" },
  { ativoId: "HW-004", campoId: "cf_4", valor: "Novo" },
];

export function useCustomFields() {
  const [fields, setFields] = useState<CustomField[]>(defaultFields);
  const [values, setValues] = useState<CustomFieldValue[]>(defaultValues);
  const [changelog, setChangelog] = useState<FieldChangeLog[]>([]);

  const log = useCallback((entry: Omit<FieldChangeLog, "id" | "timestamp" | "user">) => {
    const full: FieldChangeLog = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: "Admin",
    };
    setChangelog((prev) => [full, ...prev]);
    console.log(
      `[CAMPO PERSONALIZADO] ${full.timestamp} | ${full.action} | Campo: "${full.fieldName}"${full.assetId ? ` | Ativo: ${full.assetId}` : ""}${full.oldValue !== undefined ? ` | "${full.oldValue}" → "${full.newValue}"` : ""}`
    );
  }, []);

  const getFieldsByCategory = useCallback(
    (cat: AssetCategory) => fields.filter((f) => f.categoria === cat),
    [fields]
  );

  const getValuesForAsset = useCallback(
    (assetId: string) => values.filter((v) => v.ativoId === assetId),
    [values]
  );

  const getValue = useCallback(
    (assetId: string, fieldId: string) =>
      values.find((v) => v.ativoId === assetId && v.campoId === fieldId)?.valor ?? "",
    [values]
  );

  const addField = useCallback(
    (nome: string, tipo: FieldType, categoria: AssetCategory, opcoes?: string[]) => {
      const field: CustomField = {
        id: `cf_${Date.now()}`,
        nome,
        tipo,
        categoria,
        opcoes: tipo === "seleção" ? opcoes : undefined,
        createdAt: new Date().toISOString(),
      };
      setFields((prev) => [...prev, field]);
      log({ action: "field_created", fieldId: field.id, fieldName: nome });
      return field;
    },
    [log]
  );

  const updateField = useCallback(
    (id: string, updates: Partial<Pick<CustomField, "nome" | "tipo" | "opcoes">>) => {
      setFields((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          const updated = { ...f, ...updates };
          if (updates.nome && updates.nome !== f.nome) {
            log({ action: "field_updated", fieldId: id, fieldName: f.nome, oldValue: f.nome, newValue: updates.nome });
          }
          return updated;
        })
      );
    },
    [log]
  );

  const deleteField = useCallback(
    (id: string) => {
      const field = fields.find((f) => f.id === id);
      if (!field) return;
      setFields((prev) => prev.filter((f) => f.id !== id));
      setValues((prev) => prev.filter((v) => v.campoId !== id));
      log({ action: "field_deleted", fieldId: id, fieldName: field.nome });
    },
    [fields, log]
  );

  const setValue = useCallback(
    (assetId: string, fieldId: string, newValue: string) => {
      const field = fields.find((f) => f.id === fieldId);
      const oldValue = values.find((v) => v.ativoId === assetId && v.campoId === fieldId)?.valor ?? "";

      if (oldValue === newValue) return;

      setValues((prev) => {
        const existing = prev.findIndex((v) => v.ativoId === assetId && v.campoId === fieldId);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = { ativoId: assetId, campoId: fieldId, valor: newValue };
          return copy;
        }
        return [...prev, { ativoId: assetId, campoId: fieldId, valor: newValue }];
      });

      log({
        action: "value_changed",
        fieldId,
        fieldName: field?.nome ?? fieldId,
        assetId,
        oldValue,
        newValue,
      });
    },
    [fields, values, log]
  );

  return {
    fields,
    values,
    changelog,
    getFieldsByCategory,
    getValuesForAsset,
    getValue,
    addField,
    updateField,
    deleteField,
    setValue,
  };
}

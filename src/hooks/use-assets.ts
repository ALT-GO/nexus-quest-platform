import { useState, useCallback } from "react";

export type HardwareStatus = "Disponível" | "Em uso" | "Reservado" | "Manutenção";

export interface HardwareAsset {
  id: string;
  collaborator: string;
  costCenter: string;
  sector: string;
  model: string;
  type: "Notebook" | "Tablet" | "Monitor" | "Teclado" | "Mouse" | "Celular" | "Outros";
  serviceTag: string;
  notes: string;
  status: HardwareStatus;
  reservedByTicketId?: string;
  deliveredAt?: string;
  history: AssetHistoryEntry[];
}

export interface AssetHistoryEntry {
  id: string;
  action: string;
  ticketId?: string;
  timestamp: string;
  user: string;
  details: string;
}

// Map ticket categories to asset types
const categoryToAssetType: Record<string, HardwareAsset["type"]> = {
  "Solicitação de novo Computador/Notebook": "Notebook",
  "Solicitação de novo Celular": "Celular",
  "Solicitação de Tablet": "Tablet",
};

export const assetRequestCategories = Object.keys(categoryToAssetType);

export function getAssetTypeForCategory(category: string): HardwareAsset["type"] | null {
  return categoryToAssetType[category] ?? null;
}

const initialAssets: HardwareAsset[] = [
  {
    id: "HW-001",
    collaborator: "Maria Silva",
    costCenter: "Comercial",
    sector: "Vendas",
    model: "Dell Latitude 5520",
    type: "Notebook",
    serviceTag: "ABC123XYZ",
    notes: "Entregue em 01/2024",
    status: "Em uso",
    history: [
      {
        id: "h1",
        action: "Atribuído",
        timestamp: "2024-01-15T10:00:00Z",
        user: "Admin",
        details: "Atribuído para Maria Silva",
      },
    ],
  },
  {
    id: "HW-002",
    collaborator: "João Pedro",
    costCenter: "TI",
    sector: "Desenvolvimento",
    model: "Dell Latitude 7420",
    type: "Notebook",
    serviceTag: "DEF456UVW",
    notes: "",
    status: "Em uso",
    history: [],
  },
  {
    id: "HW-003",
    collaborator: "Ana Costa",
    costCenter: "Marketing",
    sector: "Criação",
    model: "iPad Pro 12.9",
    type: "Tablet",
    serviceTag: "GHI789RST",
    notes: "Para apresentações",
    status: "Em uso",
    history: [],
  },
  {
    id: "HW-004",
    collaborator: "",
    costCenter: "",
    sector: "",
    model: "Dell Latitude 5540",
    type: "Notebook",
    serviceTag: "JKL012MNO",
    notes: "Novo, sem uso",
    status: "Disponível",
    history: [],
  },
  {
    id: "HW-005",
    collaborator: "",
    costCenter: "",
    sector: "",
    model: "iPad Air 5ª Geração",
    type: "Tablet",
    serviceTag: "PQR345STU",
    notes: "Estoque",
    status: "Disponível",
    history: [],
  },
  {
    id: "HW-006",
    collaborator: "",
    costCenter: "",
    sector: "",
    model: "Samsung Galaxy S24",
    type: "Celular",
    serviceTag: "VWX678YZA",
    notes: "Estoque",
    status: "Disponível",
    history: [],
  },
  {
    id: "HW-007",
    collaborator: "",
    costCenter: "",
    sector: "",
    model: "Dell Latitude 3540",
    type: "Notebook",
    serviceTag: "BCD901EFG",
    notes: "Recondicionado",
    status: "Disponível",
    history: [],
  },
];

export function useAssets() {
  const [assets, setAssets] = useState<HardwareAsset[]>(initialAssets);

  const getAvailableByType = useCallback(
    (type: HardwareAsset["type"]) =>
      assets.filter((a) => a.type === type && a.status === "Disponível"),
    [assets]
  );

  const getAvailableForCategory = useCallback(
    (category: string) => {
      const assetType = getAssetTypeForCategory(category);
      if (!assetType) return [];
      return getAvailableByType(assetType);
    },
    [getAvailableByType]
  );

  const reserveAsset = useCallback(
    (assetId: string, ticketId: string) => {
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== assetId) return a;

          const entry: AssetHistoryEntry = {
            id: `hist_${Date.now()}`,
            action: "Reservado",
            ticketId,
            timestamp: new Date().toISOString(),
            user: "Admin",
            details: `Reservado pelo chamado ${ticketId}`,
          };

          console.log(
            `[ATIVO RESERVADO] ${entry.timestamp} | Ativo ${assetId} (${a.model}) reservado pelo chamado ${ticketId}`
          );

          return {
            ...a,
            status: "Reservado" as HardwareStatus,
            reservedByTicketId: ticketId,
            history: [entry, ...a.history],
          };
        })
      );
    },
    []
  );

  const deliverAsset = useCallback(
    (assetId: string, ticketId: string, collaborator: string) => {
      const now = new Date().toISOString();
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== assetId) return a;

          const entry: AssetHistoryEntry = {
            id: `hist_${Date.now()}`,
            action: "Entregue",
            ticketId,
            timestamp: now,
            user: "Admin",
            details: `Entregue para ${collaborator} via chamado ${ticketId}`,
          };

          console.log(
            `[ATIVO ENTREGUE] ${now} | Ativo ${assetId} (${a.model}) → Status: Em uso | Colaborador: ${collaborator} | Chamado: ${ticketId}`
          );

          return {
            ...a,
            status: "Em uso" as HardwareStatus,
            collaborator,
            deliveredAt: now,
            history: [entry, ...a.history],
          };
        })
      );
    },
    []
  );

  const getAsset = useCallback(
    (id: string) => assets.find((a) => a.id === id),
    [assets]
  );

  return {
    assets,
    setAssets,
    getAvailableByType,
    getAvailableForCategory,
    reserveAsset,
    deliverAsset,
    getAsset,
  };
}

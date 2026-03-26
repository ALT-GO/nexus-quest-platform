import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CollaboratorAsset } from "@/hooks/use-collaborators";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const categoryLabels: Record<string, string> = {
  notebooks: "Notebooks",
  celulares: "Celulares",
  tablets: "Tablets",
  perifericos: "Periféricos",
  linhas: "Linhas",
  licencas: "Licenças",
  hardware: "Hardware",
  telecom: "Telecom",
  licenses: "Licenças",
};

const columnsByCategory: Record<string, { key: string; label: string }[]> = {
  notebooks: [
    { key: "asset_code", label: "Id" },
    { key: "service_tag", label: "Service tag" },
    { key: "marca", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "asset_type", label: "Tipo" },
    { key: "contrato", label: "Contrato" },
  ],
  celulares: [
    { key: "asset_code", label: "Id" },
    { key: "service_tag", label: "Service tag" },
    { key: "marca", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "imei1", label: "Imei 1" },
    { key: "imei2", label: "Imei 2" },
  ],
  tablets: [
    { key: "asset_code", label: "Id" },
    { key: "service_tag", label: "Service tag" },
    { key: "marca", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "imei1", label: "IMEI / S/N" },
    { key: "contrato", label: "Contrato" },
  ],
  perifericos: [
    { key: "asset_code", label: "Id" },
    { key: "service_tag", label: "Service tag / P/N" },
    { key: "marca", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "asset_type", label: "Tipo" },
    { key: "contrato", label: "Contrato" },
  ],
  linhas: [
    { key: "asset_code", label: "Id" },
    { key: "numero", label: "Número" },
    { key: "operadora", label: "Operadora" },
    { key: "asset_type", label: "Tipo" },
    { key: "contrato", label: "Contrato" },
  ],
  licencas: [
    { key: "asset_code", label: "Id" },
    { key: "licenca", label: "Licença" },
    { key: "email_address", label: "E-mail" },
    { key: "status", label: "Status" },
    { key: "contrato", label: "Contrato" },
  ],
};

export function generateResponsibilityPDF(
  collaboratorName: string,
  assets: CollaboratorAsset[],
  _customFields?: any[]
) {
  const doc = new jsPDF();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Termo de Responsabilidade", 105, 20, { align: "center" });
  doc.text("Equipamentos e Recursos de TI", 105, 28, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Data de emissão: ${today}`, 14, 40);
  doc.text(`Colaborador: ${collaboratorName}`, 14, 47);

  doc.setLineWidth(0.5);
  doc.line(14, 52, 196, 52);

  let y = 58;

  const categories = [...new Set(assets.map((a) => a.category))];

  for (const cat of categories) {
    const catAssets = assets.filter((a) => a.category === cat);
    const label = categoryLabels[cat] || cat;
    const cols = columnsByCategory[cat] || [
      { key: "asset_code", label: "Id" },
      { key: "model", label: "Modelo" },
      { key: "status", label: "Status" },
    ];

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    y += 4;

    const head = [cols.map((c) => c.label)];
    const body = catAssets.map((a) =>
      cols.map((c) => (a as any)[c.key] || "—")
    );

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "grid",
      headStyles: { fillColor: [41, 65, 122], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (y > 240) {
    doc.addPage();
    y = 30;
  }

  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Declaro ter recebido os equipamentos e recursos listados acima, comprometendo-me a zelar pela sua integridade e devolvê-los em bom estado ao término do vínculo.",
    14,
    y,
    { maxWidth: 182 }
  );

  y += 25;
  doc.line(14, y, 100, y);
  doc.text(collaboratorName, 14, y + 6);

  doc.line(110, y, 196, y);
  doc.text("Responsável TI", 110, y + 6);

  y += 14;
  doc.text(`Local e data: _________________, ${today}`, 14, y);

  doc.save(`Termo_Responsabilidade_${collaboratorName.replace(/\s+/g, "_")}.pdf`);
}

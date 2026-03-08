import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CollaboratorAsset, CollaboratorCustomField } from "@/hooks/use-collaborators";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const categoryLabels: Record<string, string> = {
  hardware: "Hardware",
  telecom: "Telecom",
  licenses: "Licenças",
};

export function generateResponsibilityPDF(
  collaboratorName: string,
  assets: CollaboratorAsset[],
  customFields: CollaboratorCustomField[]
) {
  const doc = new jsPDF();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Header
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

  // Group by category
  const categories = [...new Set(assets.map((a) => a.category))];

  for (const cat of categories) {
    const catAssets = assets.filter((a) => a.category === cat);
    const label = categoryLabels[cat] || cat;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    y += 4;

    const head = [["Código", "Modelo", "Status"]];
    if (cat === "hardware") {
      head[0].push("Tipo", "Service Tag");
    }

    // Add custom field columns
    const assetIds = new Set(catAssets.map((a) => a.id));
    const relevantFields = customFields.filter((cf) => assetIds.has(cf.asset_id));
    const fieldNames = [...new Set(relevantFields.map((f) => f.field_name))];
    head[0].push(...fieldNames);

    const body = catAssets.map((a) => {
      const row = [a.asset_code, a.model || "—", a.status];
      if (cat === "hardware") {
        row.push(a.asset_type || "—", a.service_tag || "—");
      }
      for (const fn of fieldNames) {
        const val = relevantFields.find((cf) => cf.asset_id === a.id && cf.field_name === fn);
        row.push(val?.value || "—");
      }
      return row;
    });

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

  // Signature area
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

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import type { CollaboratorAsset } from "@/hooks/use-collaborators";
import { HeaderTimbrado } from "./HeaderTimbrado";
import { FooterTimbrado } from "./FooterTimbrado";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorName: string;
  assets: CollaboratorAsset[];
  type: "responsabilidade" | "devolucao";
}

const categoryLabels: Record<string, string> = {
  notebooks: "Notebooks",
  celulares: "Celulares",
  linhas: "Linhas Telefônicas",
  licencas: "Licenças",
  hardware: "Hardware",
  telecom: "Telecom",
  licenses: "Licenças",
};

export function PrintableTermDialog({ open, onOpenChange, collaboratorName, assets, type }: Props) {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const cargo = assets.find((a: any) => a.cargo)?.cargo || "___________________________";
  const categories = [...new Set(assets.map((a) => a.category))];
  const isDevolucao = type === "devolucao";
  
  const headerTitle = isDevolucao ? "TERMO DE DEVOLUÇÃO" : "TERMO DE RESPONSABILIDADE";
  const dialogTitle = isDevolucao ? "Termo de Devolução de Equipamentos" : "Termo de Responsabilidade de Equipamentos";
  const docCode = isDevolucao ? "FF.165" : "FF.164";

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-background print-term-dialog">
        {/* Toolbar - hidden on print */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background border-b shadow-sm print:hidden">
          <DialogTitle className="text-lg font-bold">{dialogTitle}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir / Salvar PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* A4 printable page */}
        <div className="print-page p-10 mx-auto w-full max-w-[210mm] min-h-[297mm] font-sans text-sm flex flex-col" style={{ color: "#333" }}>
          
          <HeaderTimbrado title={headerTitle} docCode={docCode} />

          {/* Collaborator Info */}
          <div className="mb-6 text-xs">
            <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-2">
              <span className="font-bold text-[#555]">Colaborador:</span>
              <span className="border-b border-[#ccc]">{collaboratorName}</span>
              <span className="font-bold text-[#555]">Data:</span>
              <span className="border-b border-[#ccc]">{today}</span>
              <span className="font-bold text-[#555]">Cargo:</span>
              <span className="border-b border-[#ccc]">{cargo}</span>
              <span className="font-bold text-[#555]">CPF:</span>
              <span className="border-b border-[#ccc]">___________________________</span>
            </div>
          </div>

          {/* Asset Tables */}
          <div className="mb-6 flex-1">
            {assets.length === 0 ? (
              <p className="text-[#999] italic py-4 text-center text-xs">Nenhum ativo vinculado.</p>
            ) : (
              <div className="space-y-4">
                {categories.map((cat) => {
                  const catAssets = assets.filter((a) => a.category === cat);
                  const label = categoryLabels[cat] || cat;
                  return (
                    <div key={cat}>
                      <p className="font-bold text-xs mb-1 text-[#444] uppercase">{label}</p>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr style={{ backgroundColor: "#f0f0f0" }}>
                            <th className="p-1.5 border border-[#ccc] font-semibold w-20">ID</th>
                            <th className="p-1.5 border border-[#ccc] font-semibold">Marca / Modelo</th>
                            <th className="p-1.5 border border-[#ccc] font-semibold w-40">Identificador</th>
                            <th className="p-1.5 border border-[#ccc] font-semibold w-24">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catAssets.map((asset: any) => {
                            let detalhes = asset.model || asset.asset_type || asset.licenca || "—";
                            if (asset.marca) detalhes = `${asset.marca} ${detalhes}`;
                            const identificador = asset.service_tag || asset.numero || asset.imei1 || asset.email_address || "—";
                            return (
                              <tr key={asset.id}>
                                <td className="p-1.5 border border-[#ccc] font-mono">{asset.asset_code}</td>
                                <td className="p-1.5 border border-[#ccc]">{detalhes}</td>
                                <td className="p-1.5 border border-[#ccc] font-mono">{identificador}</td>
                                <td className="p-1.5 border border-[#ccc]">{asset.status || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Declaration */}
          <div className="mb-8 text-xs text-justify leading-relaxed space-y-3">
            {isDevolucao ? (
              <p>
                Declaro para os devidos fins que estou devolvendo os equipamentos e/ou acessos acima listados,
                de propriedade da Orion, nas mesmas condições em que os recebi, ressalvado o desgaste natural pelo uso.
                Estou ciente de que a entrega destes itens encerra a minha responsabilidade sobre a guarda e zelo dos mesmos.
              </p>
            ) : (
              <>
                <p>
                  Declaro para os devidos fins que recebi os equipamentos e/ou acessos acima listados,
                  de propriedade da Orion, em perfeitas condições de uso e funcionamento.
                </p>
                <p>
                  Comprometo-me a zelar pela integridade, conservação e uso estritamente profissional dos recursos disponibilizados,
                  bem como devolvê-los imediatamente em caso de desligamento ou quando solicitado pela empresa.
                </p>
              </>
            )}
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-16 text-center text-xs mb-6 break-inside-avoid">
            <div className="pt-12">
              <div className="border-t border-[#666] mx-4 mb-1"></div>
              <p className="font-semibold">{collaboratorName}</p>
              <p className="text-[#888]">Colaborador(a)</p>
            </div>
            <div className="pt-12">
              <div className="border-t border-[#666] mx-4 mb-1"></div>
              <p className="font-semibold">Responsável de TI</p>
              <p className="text-[#888]">Orion</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-[#888] mb-4">
            Local e data: _____________________________________, {today}
          </div>

          <FooterTimbrado />
        </div>
      </DialogContent>
    </Dialog>
  );
}
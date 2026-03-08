import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import type { CollaboratorAsset } from "@/hooks/use-collaborators";

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
  
  // Extrair o cargo do primeiro ativo que tenha cargo, se houver
  const cargo = assets.find((a: any) => a.cargo)?.cargo || "___________________________";
  
  // Agrupar ativos por categoria
  const categories = [...new Set(assets.map((a) => a.category))];

  const handlePrint = () => {
    window.print();
  };

  const isDevolucao = type === "devolucao";
  const title = isDevolucao ? "Termo de Devolução de Equipamentos" : "Termo de Responsabilidade de Equipamentos";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 print:max-w-none print:max-h-none print:overflow-visible print:p-0 print:border-none print:shadow-none bg-background">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background border-b print:hidden shadow-sm">
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
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

        {/* Print Area - A4 Format */}
        <div className="p-8 mx-auto bg-background text-foreground print:p-0 print:m-0 w-full max-w-[210mm] min-h-[297mm] font-sans text-sm print:text-xs">
          
          {/* Header / Logo Orion */}
          <div className="flex items-center justify-between border-b-2 border-primary/20 pb-6 mb-8 print:pb-4 print:mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary print:text-xl uppercase tracking-wider">ORION</h1>
              <p className="text-muted-foreground mt-1">Gestão de Tecnologia da Informação</p>
            </div>
            <div className="text-right text-muted-foreground">
              <p>{title}</p>
              <p>Data: {today}</p>
            </div>
          </div>

          {/* Collaborator Info */}
          <div className="mb-8 p-4 bg-muted/30 rounded-lg print:bg-transparent print:border print:border-border print:p-4 print:rounded-none">
            <h3 className="font-bold text-base mb-3 uppercase tracking-wide border-b border-border pb-2">Dados do Colaborador</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-muted-foreground">Nome:</span> {collaboratorName}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">CPF:</span> ___________________________
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Cargo:</span> {cargo}
              </div>
            </div>
          </div>

          {/* Asset List */}
          <div className="mb-8">
            <h3 className="font-bold text-base mb-3 uppercase tracking-wide border-b border-border pb-2">Equipamentos e Recursos Vinculados</h3>
            
            {assets.length === 0 ? (
              <p className="text-muted-foreground italic py-4">Nenhum ativo vinculado a este colaborador no momento.</p>
            ) : (
              <div className="space-y-6">
                {categories.map((cat) => {
                  const catAssets = assets.filter((a) => a.category === cat);
                  const label = categoryLabels[cat] || cat;
                  
                  return (
                    <div key={cat}>
                      <h4 className="font-semibold text-primary/80 mb-2">{label}</h4>
                      <table className="w-full text-left border-collapse border border-border">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="p-2 border border-border w-24">ID</th>
                            <th className="p-2 border border-border">Detalhes do Ativo</th>
                            <th className="p-2 border border-border w-32">Identificador</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catAssets.map((asset: any) => {
                            let detalhes = asset.model || asset.asset_type || asset.licenca || "-";
                            if (asset.marca) detalhes = `${asset.marca} ${detalhes}`;
                            
                            let identificador = asset.service_tag || asset.numero || asset.imei1 || asset.email_address || "-";

                            return (
                              <tr key={asset.id} className="text-foreground">
                                <td className="p-2 border border-border font-mono text-xs">{asset.asset_code}</td>
                                <td className="p-2 border border-border">{detalhes}</td>
                                <td className="p-2 border border-border font-mono text-xs">{identificador}</td>
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

          {/* Term Text (Placeholder para o usuário fornecer) */}
          <div className="mb-16 text-justify leading-relaxed text-foreground space-y-4">
            <h3 className="font-bold text-base mb-3 uppercase tracking-wide border-b border-border pb-2">Declaração</h3>
            {isDevolucao ? (
              <p>
                [TEXTO PADRÃO AQUI: P. ex: Declaro para os devidos fins que estou devolvendo os equipamentos e/ou acessos acima listados, 
                de propriedade da Orion, nas mesmas condições em que os recebi, ressalvado o desgaste natural pelo uso. 
                Estou ciente de que a entrega destes itens encerra a minha responsabilidade sobre a guarda e zelo dos mesmos.]
              </p>
            ) : (
              <>
                <p>
                  [TEXTO PADRÃO AQUI: P. ex: Declaro para os devidos fins que recebi os equipamentos e/ou acessos acima listados, 
                  de propriedade da Orion, em perfeitas condições de uso e funcionamento.]
                </p>
                <p>
                  [Comprometo-me a zelar pela integridade, conservação e uso estritamente profissional dos recursos disponibilizados, 
                  bem como devolvê-los imediatamente em caso de desligamento ou quando solicitado pela empresa.]
                </p>
              </>
            )}
          </div>

          {/* Signatures */}
          <div className="mt-20 pt-8 grid grid-cols-2 gap-12 text-center break-inside-avoid">
            <div>
              <div className="border-t border-border w-full mb-2 mx-auto"></div>
              <p className="font-semibold">{collaboratorName}</p>
              <p className="text-muted-foreground text-sm">Colaborador(a)</p>
            </div>
            <div>
              <div className="border-t border-border w-full mb-2 mx-auto"></div>
              <p className="font-semibold">Responsável de TI</p>
              <p className="text-muted-foreground text-sm">Orion</p>
            </div>
          </div>
          
          <div className="mt-12 text-center text-muted-foreground text-xs break-inside-avoid">
            Local e data: _____________________________________, {today}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
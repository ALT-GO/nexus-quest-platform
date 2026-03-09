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

function getAssetDescription(asset: any): string {
  const parts: string[] = [];
  if (asset.marca) parts.push(asset.marca);
  if (asset.model) parts.push(asset.model);
  if (!parts.length && asset.licenca) parts.push(asset.licenca);
  if (!parts.length && asset.asset_type) parts.push(asset.asset_type);
  const catLabel = categoryLabels[asset.category] || asset.category;
  return parts.length ? `${catLabel} – ${parts.join(" ")}` : catLabel;
}

function getAssetIdentifier(asset: any): string {
  if (asset.service_tag) return `Service Tag: ${asset.service_tag}`;
  if (asset.imei1) return `IMEI: ${asset.imei1}`;
  if (asset.numero) return `Número: ${asset.numero}`;
  if (asset.email_address) return `E-mail: ${asset.email_address}`;
  return "—";
}

export function PrintableTermDialog({ open, onOpenChange, collaboratorName, assets, type }: Props) {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const todayShort = format(new Date(), "'São Paulo, 'dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const cargo = assets.find((a: any) => a.cargo)?.cargo || "______________________";
  const isDevolucao = type === "devolucao";

  const headerTitle = isDevolucao ? "DEVOLUÇÃO DE MATERIAIS TECNOLÓGICOS" : "TERMO DE RESPONSABILIDADE";
  const dialogTitle = isDevolucao ? "Termo de Devolução" : "Termo de Responsabilidade";
  const docCode = isDevolucao ? "FF.117" : "FF.164";
  const headerPrefix = isDevolucao ? "TERMO DE RESPONSABILIDADE DE" : "";

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-background print-term-dialog">
        {/* Toolbar */}
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

        {/* ===== PAGE 1 ===== */}
        <div className="print-page p-10 mx-auto w-full max-w-[210mm] min-h-[297mm] font-sans flex flex-col" style={{ color: "#333", fontSize: "11px", lineHeight: "1.6" }}>
          <HeaderTimbrado title={headerTitle} docCode={docCode} revision={isDevolucao ? "rev 01" : "Rev. 02"} prefix={headerPrefix} />

          <p className="mb-4 text-right" style={{ fontSize: "11px" }}>{todayShort}</p>

          {isDevolucao ? (
            <DevolucaoContent name={collaboratorName} cargo={cargo} />
          ) : (
            <ResponsabilidadeContent name={collaboratorName} cargo={cargo} />
          )}

          <div className="mt-auto">
            <FooterTimbrado />
          </div>
        </div>

        {/* ===== PAGE 2 ===== */}
        <div className="print-page p-10 mx-auto w-full max-w-[210mm] min-h-[297mm] font-sans flex flex-col break-before-page" style={{ color: "#333", fontSize: "11px", lineHeight: "1.6" }}>
          <HeaderTimbrado title={headerTitle} docCode={docCode} revision={isDevolucao ? "rev 01" : "Rev. 02"} pageInfo="Página 2 de 2" prefix={headerPrefix} />

          {isDevolucao && (
            <p className="font-bold text-xs mb-3 uppercase" style={{ color: "#444" }}>DADOS DO ITENS</p>
          )}

          {/* Asset Table */}
          <table className="w-full border-collapse mb-8" style={{ fontSize: "10px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th className="p-2 border border-[#bbb] text-left font-bold">ITEM(S)</th>
                {isDevolucao && <th className="p-2 border border-[#bbb] text-left font-bold">DETALHE</th>}
                <th className="p-2 border border-[#bbb] text-left font-bold">VALOR PAGO</th>
                <th className="p-2 border border-[#bbb] text-left font-bold">VALOR CONTÁBIL ATUAL</th>
                <th className="p-2 border border-[#bbb] text-left font-bold">ID</th>
                <th className="p-2 border border-[#bbb] text-left font-bold">{isDevolucao ? "ACESSÓRIOS" : "ESTADO"}</th>
                {!isDevolucao && <th className="p-2 border border-[#bbb] text-left font-bold">OBSERVAÇÃO</th>}
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={isDevolucao ? 6 : 6} className="p-3 border border-[#bbb] text-center" style={{ color: "#999" }}>
                    Nenhum ativo vinculado
                  </td>
                </tr>
              ) : (
                assets.map((asset: any) => (
                  <tr key={asset.id}>
                    <td className="p-1.5 border border-[#bbb]">{getAssetDescription(asset)}</td>
                    {isDevolucao && <td className="p-1.5 border border-[#bbb]">{asset.notes || ""}</td>}
                    <td className="p-1.5 border border-[#bbb]"></td>
                    <td className="p-1.5 border border-[#bbb]"></td>
                    <td className="p-1.5 border border-[#bbb] font-mono">{getAssetIdentifier(asset)}</td>
                    <td className="p-1.5 border border-[#bbb]">{isDevolucao ? "" : (asset.status || "—")}</td>
                    {!isDevolucao && <td className="p-1.5 border border-[#bbb]">{asset.notes || ""}</td>}
                  </tr>
                ))
              )}
              <tr>
                <td colSpan={isDevolucao ? 6 : 6} className="p-1.5 border border-[#bbb] font-bold" style={{ color: "#666" }}>
                  OBS:
                </td>
              </tr>
            </tbody>
          </table>

          {/* Date + Signatures */}
          <p className="mb-8" style={{ fontSize: "11px" }}>{todayShort}.</p>

          {/* Signatures */}
          <div className="mt-auto space-y-12 mb-8">
            <div>
              <p className="mb-1 font-bold" style={{ fontSize: "11px" }}>Assinatura do Empregado:</p>
              <div className="border-b border-[#666] w-64 mt-8"></div>
            </div>
            <div>
              <p className="mb-1 font-bold" style={{ fontSize: "11px" }}>Assinatura da Testemunha:</p>
              <div className="border-b border-[#666] w-80 mt-8"></div>
            </div>
          </div>

          <FooterTimbrado />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Responsibility term body text (page 1) ── */
function ResponsabilidadeContent({ name, cargo }: { name: string; cargo: string }) {
  return (
    <div className="text-justify space-y-3 flex-1" style={{ fontSize: "11px" }}>
      <p>
        Eu, <strong>{name}</strong>, portador(a) do CPF nº ______________________ e RG nº ______________________,
        declaro que recebi da empresa <strong>ORION Engenharia e Tecnologia S/A</strong>, sob o CNPJ nº 01.011.976/0004-75,
        o(s) equipamento(s) descrito(s) na página seguinte.
      </p>
      <p>
        Assumo total responsabilidade pela sua manutenção, conservação e devolução, comprometendo-me a cuidar para que
        o(s) equipamento(s) seja(m) devolvido(s) em perfeito estado de funcionamento, exceto por desgaste decorrente do
        uso normal ou desuso devido à obsolescência tecnológica.
      </p>
      <p>
        Caso o equipamento não seja devolvido em perfeito estado por culpa ou dolo, comprometo-me a ressarcir a empresa
        pelos danos causados, limitados ao valor de mercado do equipamento. Em caso de perda, serei responsável pelo
        ressarcimento à empresa do valor de compra de um novo equipamento equivalente.
      </p>
      <p>
        Declaro ter ciência de que o equipamento é de uso exclusivo para atividades profissionais e que seu uso é
        obrigatório durante o horário de trabalho. É estritamente proibido o uso de máquinas pessoais para realização de
        atividades profissionais, assim como o uso do equipamento para fins pessoais, salvo autorização expressa da empresa.
      </p>
      <p>
        Estou ciente de que é proibido o empréstimo, aluguel ou cessão do equipamento a terceiros sem autorização expressa
        do empregador.
      </p>
      <p>
        No contexto de home office ou modelo híbrido, o uso do equipamento é obrigatório para a realização das atividades
        profissionais. É minha responsabilidade garantir que o equipamento seja utilizado adequadamente, em um ambiente
        seguro e propício ao trabalho.
      </p>
      <p>
        Estou ciente de que a violação das cláusulas deste termo, incluindo o uso indevido do equipamento, poderá resultar
        em medidas disciplinares, que podem incluir advertência, suspensão ou até rescisão por justa causa, conforme as
        diretrizes da empresa e a legislação vigente.
      </p>
      <p>
        No caso de desligamento, comprometo-me a devolver o equipamento no momento da assinatura do aviso prévio. Caso não
        o faça, autorizo o desconto do valor do equipamento na minha rescisão contratual. O valor do equipamento será
        depreciado anualmente, visando estabelecer o Valor Contábil Atual para fins de devolução, indenização ou
        ressarcimento. A depreciação será calculada conforme as seguintes regras:
      </p>
      <ol className="list-decimal pl-6 space-y-1">
        <li><strong>Vida Útil e Método de Depreciação:</strong> A depreciação será calculada pelo método linear ao longo de cinco (5) anos (Vida Útil Padrão para TI).</li>
        <li><strong>Valor Mínimo (Piso):</strong> A depreciação cessará assim que o Valor Contábil Atual atingir o valor residual mínimo estabelecido pela Empresa, sendo este 50% do valor pago tanto para Notebooks, celulares ou tablets.</li>
        <li><strong>Cálculo da Depreciação Anual:</strong> O valor a ser depreciado a cada ano completo de uso será calculado com base no Valor de Aquisição (coluna "valor pago" da tabela) subtraído do Valor Mínimo (piso descrito no tópico 2 acima), dividido pela vida útil de 5 anos.</li>
        <li><strong>Depreciação Anual fixa</strong> = (valor de aquisição - valor mínimo) / 5 anos</li>
        <li>O valor de depreciação anual fixa será multiplicado pela quantia de cada ano completo desde a data de assinatura do termo de responsabilidade.</li>
      </ol>
    </div>
  );
}

/* ── Return term body text (page 1) ── */
function DevolucaoContent({ name, cargo }: { name: string; cargo: string }) {
  return (
    <div className="text-justify space-y-3 flex-1" style={{ fontSize: "11px" }}>
      <p>
        Eu, <strong>{name}</strong>, portador(a) do CPF nº ______________________ e RG nº ______________________,
        declaro que estou devolvendo à empresa <strong>ORION Engenharia e Tecnologia S/A</strong>, sob o CNPJ nº 01.011.976/0004-75,
        o(s) equipamento(s) descrito(s) na página seguinte.
      </p>
      <p>
        Declaro que os equipamentos estão sendo devolvidos nas condições descritas na tabela da página 2,
        ressalvado o desgaste natural decorrente do uso normal durante o período em que estiveram sob minha responsabilidade.
      </p>
      <p>
        Estou ciente de que, a partir desta data, encerra-se a minha responsabilidade sobre a guarda, zelo e conservação
        dos equipamentos acima mencionados, desde que a devolução seja aceita pela área de Tecnologia da Informação da empresa.
      </p>
      <p>
        Caso sejam identificados danos além do desgaste natural no momento da conferência, comprometo-me a ressarcir a
        empresa conforme os termos estabelecidos no Termo de Responsabilidade original assinado no ato do recebimento.
      </p>
    </div>
  );
}
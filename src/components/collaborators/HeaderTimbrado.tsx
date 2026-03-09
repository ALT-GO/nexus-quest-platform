import orionLogo from "@/assets/logo_orion.png";

interface Props {
  title: string;
  docCode?: string;
  revision?: string;
  pageInfo?: string;
  prefix?: string;
}

export function HeaderTimbrado({ title, docCode = "FF.164", revision = "Rev. 02", pageInfo, prefix }: Props) {
  return (
    <table className="w-full border-collapse border border-[#999] mb-3 print:mb-2" style={{ borderColor: "#999" }}>
      <tbody>
        <tr>
          <td
            className="border border-[#999] p-3 align-middle"
            style={{ width: "35%", borderColor: "#999" }}
            rowSpan={2}
          >
            <img src={orionLogo} alt="Orion" className="h-8 object-contain max-h-[25mm]" />
          </td>
          <td
            className="border border-[#999] p-2 text-center align-middle"
            style={{ width: "45%", borderColor: "#999" }}
            rowSpan={2}
          >
            {prefix && <p className="text-[10px] uppercase tracking-wide text-[#666]">{prefix}</p>}
            <p className="font-bold text-sm uppercase tracking-wide text-[#444]">{title}</p>
          </td>
          <td
            className="border border-[#999] p-2 text-center align-middle text-xs text-[#666]"
            style={{ width: "20%", borderColor: "#999" }}
          >
            {docCode}<br />{revision}
          </td>
        </tr>
        <tr>
          <td
            className="border border-[#999] p-2 text-center align-middle text-xs text-[#666]"
            style={{ borderColor: "#999" }}
          >
            {pageInfo || "Página 1 de 1"}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
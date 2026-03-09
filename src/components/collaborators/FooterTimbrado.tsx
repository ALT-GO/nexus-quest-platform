import footerWave from "@/assets/orion-footer-wave.png";

export function FooterTimbrado() {
  return (
    <div className="mt-auto pt-6 break-inside-avoid print-footer">
      <img src={footerWave} alt="" className="w-full h-8 object-cover opacity-60 mb-2" />
      <div className="text-center leading-relaxed space-y-0.5" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "9pt", color: "#888" }}>
        <p className="font-semibold" style={{ color: "#666" }}>Orion Serviços e Manutenção Industrial Ltda.</p>
        <p>Rua Exemplo, 123 – Bairro – Cidade/UF – CEP 00000-000</p>
        <p>Tel: (00) 0000-0000 | contato@orion.com.br | www.orion.com.br</p>
      </div>
    </div>
  );
}
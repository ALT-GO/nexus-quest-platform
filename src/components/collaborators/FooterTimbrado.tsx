import footerWave from "@/assets/orion-footer-wave.png";

export function FooterTimbrado() {
  return (
    <div className="mt-auto pt-6 break-inside-avoid">
      <img src={footerWave} alt="" className="w-full h-8 object-cover opacity-60 mb-2" />
      <div className="text-center text-[10px] text-[#888] leading-relaxed space-y-0.5">
        <p className="font-semibold text-[#666]">Orion Serviços e Manutenção Industrial Ltda.</p>
        <p>Rua Exemplo, 123 – Bairro – Cidade/UF – CEP 00000-000</p>
        <p>Tel: (00) 0000-0000 | contato@orion.com.br | www.orion.com.br</p>
      </div>
    </div>
  );
}
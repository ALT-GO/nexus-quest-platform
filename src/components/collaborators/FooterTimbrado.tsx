import footerWave from "@/assets/orion_rodape.png";

export function FooterTimbrado() {
  return (
    <div className="mt-auto break-inside-avoid print-footer">
      <img src={footerWave} alt="" className="w-full h-auto object-contain" />
    </div>
  );
}

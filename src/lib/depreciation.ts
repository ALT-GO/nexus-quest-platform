/**
 * Linear depreciation calculator for IT assets (Notebooks & Celulares).
 *
 * Rules:
 * - Useful life: 5 years
 * - Residual value (floor): 50% of acquisition value
 * - Annual depreciation = (acquisition - residual) / 5
 * - Book value = acquisition - (annual_dep × complete_years)
 * - Book value never drops below the residual (50%)
 */

const USEFUL_LIFE_YEARS = 5;
const RESIDUAL_RATE = 0.5; // 50%

export interface DepreciationResult {
  /** Original acquisition value */
  valorAquisicao: number;
  /** Residual / floor value (50%) */
  valorResidual: number;
  /** Fixed annual depreciation amount */
  depreciacaoAnual: number;
  /** Complete years elapsed since signing date */
  anosCompletos: number;
  /** Total depreciation accumulated */
  depreciacaoAcumulada: number;
  /** Current book value (never below residual) */
  valorContabil: number;
}

/**
 * Calculate linear depreciation.
 * @param valorPago - Acquisition value (from "Valor Pago")
 * @param deliveredAt - Signing date of the responsibility term (delivered_at)
 * @param referenceDate - Date to calculate against (defaults to now)
 */
export function calcDepreciation(
  valorPago: number | null | undefined,
  deliveredAt: string | null | undefined,
  referenceDate: Date = new Date()
): DepreciationResult | null {
  if (!valorPago || valorPago <= 0 || !deliveredAt) return null;

  const startDate = new Date(deliveredAt);
  if (isNaN(startDate.getTime())) return null;

  const valorResidual = valorPago * RESIDUAL_RATE;
  const depreciacaoAnual = (valorPago - valorResidual) / USEFUL_LIFE_YEARS;

  // Complete years elapsed
  const diffMs = referenceDate.getTime() - startDate.getTime();
  if (diffMs < 0) {
    // Asset not yet delivered
    return {
      valorAquisicao: valorPago,
      valorResidual,
      depreciacaoAnual,
      anosCompletos: 0,
      depreciacaoAcumulada: 0,
      valorContabil: valorPago,
    };
  }

  const anosCompletos = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  const depreciacaoAcumulada = depreciacaoAnual * Math.min(anosCompletos, USEFUL_LIFE_YEARS);
  const valorContabil = Math.max(valorPago - depreciacaoAcumulada, valorResidual);

  return {
    valorAquisicao: valorPago,
    valorResidual,
    depreciacaoAnual,
    anosCompletos,
    depreciacaoAcumulada,
    valorContabil,
  };
}

/** Format number as BRL currency */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

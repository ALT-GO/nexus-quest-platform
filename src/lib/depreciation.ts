/**
 * Linear depreciation calculator for IT assets (Notebooks & Celulares).
 *
 * Rules:
 * - Useful life: 5 years
 * - Residual value (floor): 50% of acquisition value
 * - Annual depreciation = (Valor Pago - Valor Residual) / 5
 * - Book value = Valor Pago - (Depreciação Anual × Anos de Uso)
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
  /** Years elapsed since acquisition (with decimal precision for months) */
  anosDeUso: number;
  /** Total depreciation accumulated */
  depreciacaoAcumulada: number;
  /** Current book value (never below residual) */
  valorContabil: number;
}

/**
 * Calculate linear depreciation.
 * @param valorPago - Acquisition value (from "Valor Pago")
 * @param dataAquisicao - Acquisition date (from "Data de Aquisição")
 * @param referenceDate - Date to calculate against (defaults to now)
 */
export function calcDepreciation(
  valorPago: number | null | undefined,
  dataAquisicao: string | null | undefined,
  referenceDate: Date = new Date()
): DepreciationResult | null {
  if (!valorPago || valorPago <= 0 || !dataAquisicao) return null;

  const startDate = new Date(dataAquisicao);
  if (isNaN(startDate.getTime())) return null;

  // Formula: Valor Residual = 50% do Valor Pago
  const valorResidual = valorPago * RESIDUAL_RATE;
  
  // Formula: Depreciação Anual = (Valor Pago - Valor Residual) / 5
  const depreciacaoAnual = (valorPago - valorResidual) / USEFUL_LIFE_YEARS;

  // Calculate years of use with decimal precision (monthly)
  const diffMs = referenceDate.getTime() - startDate.getTime();
  if (diffMs < 0) {
    // Future acquisition date - no depreciation yet
    return {
      valorAquisicao: valorPago,
      valorResidual,
      depreciacaoAnual,
      anosDeUso: 0,
      depreciacaoAcumulada: 0,
      valorContabil: valorPago,
    };
  }

  // Years with decimal precision (e.g., 2.5 years = 2 years and 6 months)
  const anosDeUso = diffMs / (365.25 * 24 * 60 * 60 * 1000);
  
  // Cap at useful life for depreciation calculation
  const anosParaCalculo = Math.min(anosDeUso, USEFUL_LIFE_YEARS);
  
  // Formula: Depreciação Acumulada = Depreciação Anual × Anos de Uso
  const depreciacaoAcumulada = depreciacaoAnual * anosParaCalculo;
  
  // Formula: Valor Contábil = Valor Pago - Depreciação Acumulada
  // Floor rule: Never below 50% (Valor Residual)
  const valorContabil = Math.max(valorPago - depreciacaoAcumulada, valorResidual);

  return {
    valorAquisicao: valorPago,
    valorResidual,
    depreciacaoAnual,
    anosDeUso: Math.round(anosDeUso * 100) / 100, // Round to 2 decimal places
    depreciacaoAcumulada,
    valorContabil,
  };
}

/** Format number as BRL currency */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

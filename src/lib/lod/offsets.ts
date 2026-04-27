/**
 * Offset & projected-net-monthly calculator.
 *
 * IMPORTANT: Actual LOD benefit amounts and offset rules are governed by the
 * Plan document and CBA Article 60. The values below are configurable
 * defaults for the calculator UI; final dollar amounts must be confirmed
 * against the current Plan document. The calculator is intentionally
 * transparent — every input is shown to the player.
 */

export type LodMonthlyAssumptions = {
  // Default monthly LOD benefit amount (gross) - configurable; placeholder.
  baseMonthly: number;
  // SSDI offset toggle - defaults follow the Plan's offset rule.
  applySSDIOffset: boolean;
  // Workers' comp offset toggle.
  applyWCOffset: boolean;
};

export const DEFAULT_LOD_ASSUMPTIONS: LodMonthlyAssumptions = {
  baseMonthly: 4000,
  applySSDIOffset: true,
  applyWCOffset: true,
};

export type OffsetInput = {
  source: "SSDI" | "WC" | "other";
  monthlyAmount: number;
};

export function projectedNetMonthly(args: {
  baseMonthly: number;
  offsets: OffsetInput[];
  assumptions?: LodMonthlyAssumptions;
}): {
  gross: number;
  applied: { source: string; amount: number; applied: boolean }[];
  offsetTotal: number;
  net: number;
} {
  const a = args.assumptions ?? DEFAULT_LOD_ASSUMPTIONS;
  const applied = args.offsets.map((o) => {
    let isApplied = false;
    if (o.source === "SSDI") isApplied = a.applySSDIOffset;
    else if (o.source === "WC") isApplied = a.applyWCOffset;
    return {
      source: o.source,
      amount: o.monthlyAmount,
      applied: isApplied,
    };
  });
  const offsetTotal = applied
    .filter((x) => x.applied)
    .reduce((s, x) => s + x.amount, 0);
  const net = Math.max(0, args.baseMonthly - offsetTotal);
  return { gross: args.baseMonthly, applied, offsetTotal, net };
}

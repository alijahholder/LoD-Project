/**
 * Trivial slot filler for stored Templates.
 * Replaces {{slotName}} with provided values. Missing slots are left intact
 * so the player can fill them in by hand if needed.
 */
export function fillTemplate(body: string, slots: Record<string, string | number | undefined | null>) {
  return body.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, k) => {
    const v = slots[k];
    if (v === undefined || v === null || v === "") return m;
    return String(v);
  });
}

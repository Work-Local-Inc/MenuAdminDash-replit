const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(s: string): boolean {
  return UUID_RE.test(s);
}

export function resolveIdParam(param: string): {
  column: "uuid" | "id";
  value: string | number;
} {
  if (UUID_RE.test(param)) return { column: "uuid", value: param };
  const n = parseInt(param, 10);
  if (isNaN(n)) throw new Error("Invalid identifier");
  return { column: "id", value: n };
}

export function resolveFkParam(
  param: string,
  intFkCol: string,
  uuidFkCol: string,
): { column: string; value: string | number } {
  if (UUID_RE.test(param)) return { column: uuidFkCol, value: param };
  const n = parseInt(param, 10);
  if (isNaN(n)) throw new Error("Invalid identifier");
  return { column: intFkCol, value: n };
}

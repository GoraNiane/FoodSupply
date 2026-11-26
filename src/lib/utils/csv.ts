/**
 * Construit un fichier CSV compatible Microsoft Excel France (BOM UTF-8 + séparateur ';')
 * avec protection contre l'injection de formules CSV (=, +, -, @).
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value).replace(/\r\n|\r|\n/g, " ");
  // Défense contre CSV Formula Injection dans Excel
  if (/^[=+\-@\t]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(";") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildFrenchExcelCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): string {
  const lines = [
    headers.map(escapeCsvCell).join(";"),
    ...rows.map((row) => row.map(escapeCsvCell).join(";")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

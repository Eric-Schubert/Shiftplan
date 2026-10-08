export function cellRef(rowNumber: number, colNumber: number): string {
  return `${columnName(colNumber)}${rowNumber}`;
}

function columnName(colNumber: number): string {
  let name = "";
  let value = colNumber;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

export function columnNumberFromCellRef(ref: string): number {
  const letters = ref.match(/[A-Z]+/i)?.[0].toUpperCase() || "A";
  let number = 0;

  for (const letter of letters) {
    number = number * 26 + (letter.charCodeAt(0) - 64);
  }

  return number;
}

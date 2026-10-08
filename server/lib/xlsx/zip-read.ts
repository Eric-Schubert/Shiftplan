import { Buffer } from "node:buffer";
import { MAX_ZIP_ENTRY_COUNT } from "./limits";
import { readLocalEntry, validateZipEntry, type ParsedZipEntry } from "./zip-entry";

export function readZip(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  let totalUncompressedSize = 0;

  if (entryCount > MAX_ZIP_ENTRY_COUNT) {
    throw new Error("Die Excel-Datei enthält zu viele ZIP-Einträge");
  }

  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error("Ungültige Excel-Datei: ZIP-Zentralverzeichnis defekt");
    }

    const entry = readCentralEntry(buffer, centralOffset);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString("utf-8");
    totalUncompressedSize = validateZipEntry(name, entry, totalUncompressedSize);

    entries.set(name.replace(/\\/g, "/"), readLocalEntry(buffer, entry));
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readCentralEntry(buffer: Buffer, offset: number): ParsedZipEntry {
  const flags = buffer.readUInt16LE(offset + 8);

  if (flags % 2 === 1) {
    throw new Error("Passwortgeschützte Excel-Dateien können nicht importiert werden");
  }

  const compressedSize = buffer.readUInt32LE(offset + 20);
  const uncompressedSize = buffer.readUInt32LE(offset + 24);

  if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
    throw new Error("ZIP64 Excel-Dateien werden nicht unterstützt");
  }

  return {
    method: buffer.readUInt16LE(offset + 10),
    compressedSize,
    uncompressedSize,
    localHeaderOffset: buffer.readUInt32LE(offset + 42),
  };
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const min = Math.max(0, buffer.length - 65557);

  for (let offset = buffer.length - 22; offset >= min; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Keine gültige Excel-Datei: ZIP-Ende nicht gefunden");
}

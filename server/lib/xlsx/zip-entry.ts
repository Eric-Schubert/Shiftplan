import { Buffer } from "node:buffer";
import { inflateRawSync } from "node:zlib";
import {
  MAX_ZIP_ENTRY_UNCOMPRESSED_SIZE,
  MAX_ZIP_EXPANSION_RATIO,
  MAX_ZIP_TOTAL_UNCOMPRESSED_SIZE,
} from "./limits";

export type ParsedZipEntry = {
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

export function validateZipEntry(
  name: string,
  entry: ParsedZipEntry,
  totalUncompressedSize: number
): number {
  if (entry.uncompressedSize > MAX_ZIP_ENTRY_UNCOMPRESSED_SIZE) {
    throw new Error(`ZIP-Eintrag '${name}' ist zu groß für den Excel-Import`);
  }

  const nextTotalSize = totalUncompressedSize + entry.uncompressedSize;
  if (nextTotalSize > MAX_ZIP_TOTAL_UNCOMPRESSED_SIZE) {
    throw new Error("Die entpackte Excel-Datei ist zu groß für den Import");
  }

  if (entry.method === 8) {
    if (entry.compressedSize === 0 && entry.uncompressedSize > 0) {
      throw new Error(`ZIP-Eintrag '${name}' ist ungültig`);
    }

    if (
      entry.compressedSize > 0 &&
      entry.uncompressedSize / entry.compressedSize > MAX_ZIP_EXPANSION_RATIO
    ) {
      throw new Error(`ZIP-Eintrag '${name}' expandiert zu stark für den Excel-Import`);
    }
  }

  return nextTotalSize;
}

export function readLocalEntry(buffer: Buffer, entry: ParsedZipEntry): Buffer {
  const offset = entry.localHeaderOffset;

  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error("Ungültige Excel-Datei: lokaler ZIP-Header defekt");
  }

  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataOffset = offset + 30 + nameLength + extraLength;
  if (dataOffset + entry.compressedSize > buffer.length) {
    throw new Error("Ungültige Excel-Datei: ZIP-Daten abgeschnitten");
  }
  const data = buffer.subarray(dataOffset, dataOffset + entry.compressedSize);

  if (entry.method === 0) {
    if (data.length !== entry.uncompressedSize) {
      throw new Error("Ungültige Excel-Datei: ZIP-Größe passt nicht zum Inhalt");
    }
    return data;
  }

  if (entry.method === 8) {
    let inflated: Buffer;
    try {
      inflated = inflateRawSync(data, {
        maxOutputLength: Math.max(1, entry.uncompressedSize),
      });
    } catch (error) {
      throw new Error("Die Excel-Datei enthält ungültige oder zu große ZIP-Daten");
    }

    if (inflated.length !== entry.uncompressedSize) {
      throw new Error("Ungültige Excel-Datei: ZIP-Größe passt nicht zum Inhalt");
    }
    return inflated;
  }

  throw new Error(`ZIP-Kompressionsmethode ${entry.method} wird nicht unterstützt`);
}

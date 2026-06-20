// Encoding-sicheres Lesen von Upload-Dateien (CSV).
//
// Hintergrund: CSV-Exporte aus Excel/Windows sind häufig NICHT UTF-8, sondern
// Windows-1252 (Latin-1). `File.text()` / `FileReader.readAsText()` nehmen aber
// immer UTF-8 an. Trifft der UTF-8-Decoder dann auf ein Latin-1-Byte (z. B. 0xDF
// für „ß", 0xF6 für „ö"), ersetzt er es durch das Ersatzzeichen U+FFFD ("�") —
// und das Originalzeichen ist verloren. Genau so entstehen „Stra�e", „M�nchen".
//
// Lösung: Bytes lesen, strikt als UTF-8 versuchen; schlägt das fehl (= kein
// gültiges UTF-8), als Windows-1252 dekodieren. Das deckt deutsche Umlaute und
// die allermeisten Excel-Exporte korrekt ab. Kein papaparse-Import hier, damit
// das Modul auch im Client-Bundle schlank bleibt.

export const decodeBytes = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  // UTF-8-BOM → eindeutig UTF-8.
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return new TextDecoder("utf-8").decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
};

// Datei encoding-sicher als Text lesen. IMMER statt file.text() verwenden,
// sonst gehen Umlaute aus Windows-1252-Dateien verloren.
export const decodeCsvFile = async (file: File): Promise<string> =>
  decodeBytes(await file.arrayBuffer());

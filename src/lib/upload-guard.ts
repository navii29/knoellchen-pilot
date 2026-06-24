// Zentrale Upload-Validierung für Portal-Datei-Uploads. Verhindert Stored-XSS:
// Der Client kann file.name (Endung) UND file.type (Content-Type) frei wählen.
// Lädt jemand z. B. .html/.svg hoch und der Betreiber öffnet die Datei inline,
// wird sie im Browser ausgeführt. Daher: strenge Allow-list + der KANONISCHE,
// gemappte Content-Type wird für den Upload verwendet — NIE der vom Client
// gelieferte file.type. Die Endung wird ebenfalls aus dem gemappten Wert
// abgeleitet, nicht aus file.name.
//
// Allow-list spiegelt customers/[id]/document/route.ts wider.

// Content-Type -> kanonische Storage-Endung.
const ALLOWED_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

// Endung -> kanonischer Content-Type. Erlaubt es, auch dann zu validieren, wenn
// der Client einen generischen/falschen file.type schickt (z. B.
// application/octet-stream), die Endung aber eindeutig ist.
const TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export type UploadGuardErrorCode = "missing" | "empty" | "too_large" | "disallowed";

export class UploadGuardError extends Error {
  readonly code: UploadGuardErrorCode;
  constructor(code: UploadGuardErrorCode, message: string) {
    super(message);
    this.name = "UploadGuardError";
    this.code = code;
  }
}

export type UploadGuardResult = {
  file: File;
  // Kanonische Storage-Endung aus der Allow-list (NICHT aus file.name).
  ext: string;
  // Kanonischer Content-Type aus der Allow-list (NICHT der vom Client gelieferte
  // file.type). Mit diesem Wert MUSS der Storage-Upload erfolgen.
  contentType: string;
};

// Validiert eine (vermutete) File gegen die Allow-list. Wirft UploadGuardError
// bei fehlender/leerer/zu großer/nicht erlaubter Datei. Bei Erfolg wird der
// kanonische Content-Type + die kanonische Endung zurückgegeben.
//
// Akzeptiert wird, wenn ENTWEDER der gemeldete file.type in der Allow-list steht
// ODER die Endung aus file.name eindeutig einem erlaubten Typ entspricht. In
// beiden Fällen ist der zurückgegebene contentType der gemappte, kanonische Wert.
export const validateUpload = (file: unknown): UploadGuardResult => {
  if (!(file instanceof File)) {
    throw new UploadGuardError("missing", "Datei fehlt");
  }
  if (file.size === 0) {
    throw new UploadGuardError("empty", "Datei ist leer");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadGuardError("too_large", "Datei zu groß (max 12 MB)");
  }

  const reportedType = (file.type || "").toLowerCase().trim();
  const nameExt = (file.name.split(".").pop() || "").toLowerCase().trim();

  // 1) Vom Client gemeldeter Content-Type ist erlaubt -> kanonisch mappen.
  let ext = ALLOWED_BY_TYPE[reportedType];
  // 2) Sonst über die Datei-Endung auflösen (falls Typ generisch/leer/falsch).
  if (!ext && nameExt && TYPE_BY_EXT[nameExt]) {
    ext = ALLOWED_BY_TYPE[TYPE_BY_EXT[nameExt]];
  }
  if (!ext) {
    throw new UploadGuardError(
      "disallowed",
      "Ungültiger Dateityp (erlaubt: PDF, JPG, PNG, WebP, HEIC, HEIF)"
    );
  }

  const contentType = TYPE_BY_EXT[ext];
  return { file, ext, contentType };
};

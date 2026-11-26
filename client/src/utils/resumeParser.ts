import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TEXT_LENGTH = 50000; // 50,000 characters limit

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item: unknown) => (item as { str?: string })?.str || "")
      .join(" ");

    text += pageText + "\n";
  }

  return text.trim();
}

export async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({
    arrayBuffer,
  });

  return result.value.trim();
}

export interface ParseResumeResult {
  text: string;
  fileName: string;
  characterCount: number;
}

export async function parseResumeFile(file: File): Promise<ParseResumeResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File exceeds 5 MB limit. Please upload a smaller file.");
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isDocx =
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx");

  if (!isPdf && !isDocx) {
    throw new Error("Only .pdf and .docx files are accepted.");
  }

  let extracted = "";
  try {
    if (isPdf) {
      extracted = await extractPdfText(file);
    } else {
      extracted = await extractDocxText(file);
    }
  } catch (err) {
    console.error("Resume file extraction failed:", err);
    throw new Error("Failed to parse this document. The file may be corrupt or encrypted.");
  }

  if (!extracted || !extracted.trim()) {
    throw new Error(
      "No readable text found. Scanned PDFs without an OCR text layer cannot be read."
    );
  }

  if (extracted.length > MAX_TEXT_LENGTH) {
    extracted = extracted.slice(0, MAX_TEXT_LENGTH);
  }

  return {
    text: extracted,
    fileName: file.name,
    characterCount: extracted.length,
  };
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function ResumePage() {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const extractPdfText = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");

      text += pageText + "\n";
    }

    return text.trim();
  };

  const extractDocxText = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
      arrayBuffer,
    });

    return result.value.trim();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setResumeText("");
    setError("");
    setLoading(true);

    try {
      let extractedText = "";

      if (selectedFile.type === "application/pdf") {
        extractedText = await extractPdfText(selectedFile);
      } else if (
        selectedFile.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        selectedFile.name.toLowerCase().endsWith(".docx")
      ) {
        extractedText = await extractDocxText(selectedFile);
      } else {
        throw new Error("Please upload a PDF or DOCX file.");
      }

      if (!extractedText) {
        throw new Error(
          "Could not extract text from this resume. Try another file.",
        );
      }

      setResumeText(extractedText);

      localStorage.setItem("resumeText", extractedText);
    } catch (error: any) {
      console.error("RESUME EXTRACTION ERROR:", error);

      setError(
        error.message || "Failed to extract text from the resume.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!resumeText) {
      setError("Please upload a valid resume first.");
      return;
    }

    navigate("/interview/setup");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-10">
        <h1 className="text-4xl font-bold text-center">
          Upload Resume
        </h1>

        <p className="text-gray-500 text-center mt-2">
          Upload your resume and we'll use it to personalize your AI interview.
        </p>

        <div className="mt-8">
          <label className="block font-semibold mb-2">
            Resume File
          </label>

          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="w-full border rounded-lg p-3"
          />

          {file && (
            <p className="text-green-600 mt-4">
              ✅ {file.name}
            </p>
          )}

          {loading && (
            <p className="text-blue-600 mt-4">
              Extracting resume text...
            </p>
          )}

          {error && (
            <p className="text-red-600 mt-4">
              ❌ {error}
            </p>
          )}

          {resumeText && !loading && (
            <div className="mt-6">
              <label className="block font-semibold mb-2">
                Extracted Resume Text
              </label>

              <textarea
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  localStorage.setItem("resumeText", e.target.value);
                }}
                rows={12}
                className="w-full border rounded-lg p-3 resize-none"
              />

              <p className="text-sm text-gray-500 mt-2">
                You can edit the extracted text if anything was parsed incorrectly.
              </p>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!resumeText || loading}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400"
          >
            Continue to Interview Setup
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResumePage;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle2, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>

            <span className="text-xl font-bold text-gray-900">
              InterviewAI
            </span>
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm font-medium text-gray-500 hover:text-blue-600 transition"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          {/* Heading */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText size={23} className="text-blue-600" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Upload Your Resume
            </h1>

            <p className="mt-3 text-gray-500 max-w-2xl mx-auto">
              Upload your resume so InterviewAI can personalize your interview
              questions and make your practice more relevant.
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
            {/* Upload Area */}
            <div>
              <label
                htmlFor="resume-upload"
                className="group block cursor-pointer"
              >
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 md:p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
                    <Upload size={26} className="text-blue-600" />
                  </div>

                  <h2 className="mt-5 text-lg font-bold text-gray-900">
                    Upload your resume
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Drag and drop your file here or click to browse
                  </p>

                  <p className="mt-3 text-xs text-gray-400">
                    Supported formats: PDF and DOCX
                  </p>
                </div>
              </label>

              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Selected File */}
            {file && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-green-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {file.name}
                  </p>

                  <p className="text-xs text-green-600 mt-0.5">
                    Resume uploaded successfully
                  </p>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm font-medium text-blue-700">
                  Extracting resume text...
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">
                  {error}
                </p>
              </div>
            )}

            {/* Extracted Text */}
            {resumeText && !loading && (
              <div className="mt-7">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="resume-text"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Extracted Resume Text
                  </label>

                  <span className="text-xs text-gray-400">
                    Editable
                  </span>
                </div>

                <textarea
                  id="resume-text"
                  value={resumeText}
                  onChange={(e) => {
                    setResumeText(e.target.value);
                    localStorage.setItem("resumeText", e.target.value);
                  }}
                  rows={12}
                  className="w-full border border-gray-300 rounded-xl p-4 text-sm text-gray-900 leading-relaxed resize-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />

                <p className="text-sm text-gray-500 mt-2">
                  Review the extracted text and edit anything that was parsed
                  incorrectly.
                </p>
              </div>
            )}

            {/* Continue */}
            <button
              type="button"
              onClick={handleContinue}
              disabled={!resumeText || loading}
              className="w-full mt-8 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue to Interview Setup
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Bottom Note */}
          <p className="text-center text-xs text-gray-400 mt-5">
            Your resume text is used to personalize your interview experience.
          </p>
        </div>
      </main>
    </div>
  );
}

export default ResumePage;
import { useState } from "react";

function ResumePage() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-[420px]">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Upload Resume
        </h1>

        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) =>
            setFile(e.target.files ? e.target.files[0] : null)
          }
          className="mb-4"
        />

        {file ? (
          <p className="text-green-600 mb-4">
            ✅ {file.name}
          </p>
        ) : (
          <p className="text-gray-500 mb-4">
            No file selected
          </p>
        )}

        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
        >
          Upload Resume
        </button>
      </div>
    </div>
  );
}

export default ResumePage;
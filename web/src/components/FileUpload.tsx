import React, { useCallback, useRef } from "react";

interface Props {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function FileUpload({ files, onFilesChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const incoming = Array.from(e.dataTransfer.files);
    addFiles(incoming);
  }, [files]);

  const addFiles = (incoming: File[]) => {
    const next = [...files, ...incoming];
    if (next.length > 10) {
      alert("Maximum 10 files allowed.");
      return;
    }
    const tooLarge = next.find((f) => f.size > 20 * 1024 * 1024);
    if (tooLarge) {
      alert(`${tooLarge.name} exceeds 20MB.`);
      return;
    }
    onFilesChange(next);
  };

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    onFilesChange(next);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="upload-section">
      <div
        className="drop-zone"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
        onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="drop-zone-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <p className="drop-zone-title">Drag & drop files here</p>
        <p className="drop-zone-subtitle">or click to browse</p>
        <div className="file-types">
          <span className="file-badge">PDF</span>
          <span className="file-badge">DOCX</span>
          <span className="file-badge">PPTX</span>
          <span className="file-badge">TXT</span>
          <span className="file-badge">MD</span>
          <span className="file-badge">Img</span>
          <span className="file-badge">.py, .c++, etc</span>
          
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(Array.from(e.target.files || []))}
        />
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div key={i} className="file-item">
              <div className="file-info">
                <span className="file-icon">📄</span>
                <div>
                  <p className="file-name">{f.name}</p>
                  <p className="file-size">{formatSize(f.size)}</p>
                </div>
              </div>
              <button className="file-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                ✕
              </button>
            </div>
          ))}
          <button className="btn-text" onClick={() => onFilesChange([])}>
            Clear all files
          </button>
        </div>
      )}
    </div>
  );
}

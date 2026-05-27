import { useRef, useState } from 'react';

import { ACCEPTED_EXTENSIONS } from '../utils/quizConstants';

const getExtension = (fileName = '') => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
};

const FileDropzone = ({ files, onAddFiles, onRemoveFile, disabled }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (incomingFiles) => {
    if (disabled) return;
    const nextFiles = Array.from(incomingFiles || []);
    const validFiles = nextFiles.filter((file) => ACCEPTED_EXTENSIONS.includes(getExtension(file.name)));

    if (validFiles.length !== nextFiles.length) {
      onAddFiles([], 'Only PDF and DOCX files can be uploaded.');
      return;
    }

    onAddFiles(validFiles, '');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const fileSummary = files.length > 0
    ? `${(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB selected`
    : 'No files selected';

  return (
    <section className="glass-card p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Source Documents</h2>
          <p className="mt-1 text-sm text-slate-400">Attach up to five lecture files for text extraction.</p>
        </div>
        <span className="rounded-full border border-cyan-400/25 bg-cyan-950/25 px-3 py-1 text-xs font-bold text-cyan-200">
          PDF / DOCX
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
        aria-disabled={disabled}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? 'border-cyan-300 bg-cyan-950/25'
            : 'border-slate-700 bg-slate-950/20 hover:border-cyan-400/70 hover:bg-slate-950/35'
        } ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          aria-label="Upload documents"
          type="file"
          accept=".pdf,.docx"
          multiple
          disabled={disabled}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
          className="sr-only"
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-950/30 text-cyan-200">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 16V4m0 0L7 9m5-5 5 5M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
          </svg>
        </div>
        <p className="text-base font-bold text-white">Drop files here or click to browse</p>
        <p className="mt-2 text-sm text-slate-400">Only `.pdf` and `.docx` documents are accepted.</p>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
        <span>{fileSummary}</span>
        <span>{files.length}/5 files attached</span>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-700 bg-slate-950/45 px-3 py-1.5 text-xs font-semibold text-slate-200"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onRemoveFile(index); }}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="text-slate-500 hover:text-red-300 disabled:opacity-40"
              >
                X
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
};

export default FileDropzone;

"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatFileSize } from "@/lib/utils";

interface UploadedFile {
  name: string;
  size: number;
  url: string;
}

interface FileUploadProps {
  onUpload?: (file: UploadedFile) => void;
  compact?: boolean;
}

export function FileUpload({ onUpload, compact = false }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);

  const handleFile = (nativeFile: File) => {
    const url = URL.createObjectURL(nativeFile);
    const uploaded = { name: nativeFile.name, size: nativeFile.size, url };
    setFile(uploaded);
    onUpload?.(uploaded);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nativeFile = event.target.files?.[0];
    if (nativeFile) handleFile(nativeFile);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const nativeFile = event.dataTransfer.files?.[0];
    if (nativeFile) handleFile(nativeFile);
  };

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-fox-cream px-3 py-2 text-xs text-fox-navy">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-fox-orange" />
          <span className="font-medium">{file.name}</span>
          <span className="text-fox-gray">{formatFileSize(file.size)}</span>
        </div>
        <button
          onClick={() => setFile(null)}
          className="rounded-full p-1 text-fox-gray transition-colors hover:text-fox-coral"
          aria-label="移除文件"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "cursor-pointer rounded-2xl border-2 border-dashed text-center transition-colors",
        isDragging ? "border-fox-orange bg-fox-orange/5" : "border-fox-gray-light hover:border-fox-orange-light",
        compact ? "px-3 py-2" : "p-4"
      )}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
      <Upload className="mx-auto mb-1 h-5 w-5 text-fox-gray" />
      <p className="text-xs text-fox-gray">📎 把文件拖到这里，或点击上传</p>
      {!compact && (
        <div className="mt-2">
          <Button variant="secondary" size="sm" type="button">
            选择文件
          </Button>
        </div>
      )}
    </div>
  );
}

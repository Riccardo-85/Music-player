import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

function isAudioFile(file: File) {
  return file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3");
}

export function UploadDropzone({
  disabled,
  onFiles
}: {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback(() => inputRef.current?.click(), []);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const files = Array.from(list).filter(isAudioFile);
      if (files.length) onFiles(files);
    },
    [onFiles]
  );

  return (
    <div className="card p-5">
      <div
        className={cn(
          "grid place-items-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isOver ? "border-primary bg-primary/10" : "border-border"
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(false);
          if (disabled) return;
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="max-w-md text-center">
          <div className="text-base font-semibold">Drop MP3 files here</div>
          <div className="mt-2 text-sm text-muted-foreground">
            We’ll extract ID3 tags and album art and store everything in IndexedDB for
            offline playback.
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <Button type="button" variant="primary" onClick={pick} disabled={disabled}>
              Choose files
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                // Intentional: some browsers need user gesture to show storage estimate prompt later.
                void navigator.storage?.persist?.();
              }}
            >
              Persist storage
            </Button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Tip: browser storage quotas apply (see README).
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".mp3,audio/mpeg"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
    </div>
  );
}



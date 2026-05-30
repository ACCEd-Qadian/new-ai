import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileUploadProps {
  onFileSelect: (file: File, preview?: string) => void;
  onCameraCapture: (imageData: string) => void;
}

export const FileUpload = ({ onFileSelect, onCameraCapture }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    
    if (!validTypes.includes(file.type)) {
      toast.error("सिर्फ JPG, PNG, या PDF फाइल upload करें");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("फाइल 10MB से छोटी होनी चाहिए");
      return;
    }

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreview(result);
        onFileSelect(file, result);
        toast.success("फाइल upload हो गई");
      };
      reader.readAsDataURL(file);
    } else {
      onFileSelect(file);
      toast.success("PDF upload हो गई");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPreview(result);
        onCameraCapture(result);
        toast.success("फोटो capture हो गई");
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className="space-y-2">
      {preview && (
        <div className="relative inline-block">
          <img 
            src={preview} 
            alt="Preview" 
            className="max-h-40 rounded-lg border border-border"
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={clearPreview}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <div className="flex items-center justify-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={handleFileInput}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraInput}
          />
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            Camera
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          JPG, PNG, PDF supported • Max 10MB
        </p>
      </div>
    </div>
  );
};

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Plus, Mic, Image as ImageIcon, Camera, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VoiceInput } from "./VoiceInput";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  onFileSelect?: (file: File, preview?: string) => void;
  onCameraCapture?: (imageData: string) => void;
  uploadedImage?: string | null;
  currentLanguage: "en" | "hi" | "ur" | "pa";
}

export const ChatInput = ({
  onSend,
  isLoading = false,
  currentLanguage,
  onFileSelect,
  uploadedImage
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const placeholders = {
    hi: "अपना संदेश यहाँ लिखें...",
    en: "Type your message here...",
    ur: "اپنا پیغام یہاں لکھیں...",
    pa: "ਆਪਣਾ ਸੁਨੇਹਾ ਇੱਥੇ ਲਿਖੋ..."
  };

  const currentPlaceholder = placeholders[currentLanguage] || placeholders.hi;

  const handleSend = () => {
    if ((message.trim() || uploadedImage) && !isLoading) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTranscript = useCallback((text: string) => {
    setMessage((prev) => text);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onFileSelect(file, reader.result as string);
        setIsPopoverOpen(false);
      };
      reader.readAsDataURL(file);
    }
    // Reset value so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Image Preview Area */}
      {uploadedImage && (
        <div className="mx-4 relative inline-block w-fit">
          {uploadedImage.startsWith("data:application/pdf") ? (
            <div className="h-20 w-20 bg-red-100 rounded-xl border border-red-200 flex items-center justify-center text-red-600 text-xs font-bold p-2 text-center break-words">
              PDF File
            </div>
          ) : (
            <img src={uploadedImage} alt="Upload preview" className="h-24 w-auto rounded-xl border border-white/20 shadow-lg object-cover" />
          )}
          <button
            onClick={() => onFileSelect && onFileSelect(null as any, undefined)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="glass-panel rounded-[2rem] p-2 shadow-[0_0_30px_rgba(124,58,237,0.15)] flex items-end gap-2 px-3 py-3 ring-1 ring-black/10 dark:ring-white/10 relative overflow-hidden transition-all duration-500 focus-within:shadow-[0_0_40px_rgba(124,58,237,0.3)] focus-within:ring-primary/50 cyber-border">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none bot-avatar-scan opacity-30" />

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />
        <input
          type="file"
          ref={cameraInputRef}
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />

        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 shrink-0 text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 hover:shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded-2xl border border-transparent hover:border-black/10 dark:hover:border-white/20 transition-all duration-300 z-10"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-48 glass-card border-black/10 dark:border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] text-foreground p-1 rounded-2xl animate-slide-up cyber-border">
            <div className="flex flex-col gap-1">
              <Button variant="ghost" className="justify-start gap-3 h-11 w-full hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white transition-all rounded-xl" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="w-4 h-4 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
                <span className="text-sm font-bold tracking-wide">Upload Image/PDF</span>
              </Button>
              <Button variant="ghost" className="justify-start gap-3 h-11 w-full hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white transition-all rounded-xl" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="w-4 h-4 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
                <span className="text-sm font-bold tracking-wide">Camera Capture</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentPlaceholder}
          disabled={isLoading}
          className="min-h-[48px] max-h-[120px] resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/60 px-2 py-3 text-sm z-10 font-medium tracking-wide custom-scrollbar"
          rows={1}
        />

        <div className="flex items-center gap-2 mb-0.5 z-10">
          <VoiceInput
            onTranscript={handleTranscript}
            currentLanguage={currentLanguage}
          />

          <Button
            onClick={handleSend}
            disabled={(!message.trim() && !uploadedImage) || isLoading}
            size="icon"
            className={`h-12 w-12 bg-gradient-to-br from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.4)] shrink-0 transition-all duration-300 border border-primary/50 relative overflow-hidden group ${(!message.trim() && !uploadedImage) || isLoading ? 'opacity-50 grayscale' : 'hover:scale-105 active:scale-95 animate-glow'}`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
            ) : (
              <>
                <Send className="w-5 h-5 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] relative z-10 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                {(!(!message.trim() && !uploadedImage) && !isLoading) && (
                  <span className="absolute inset-0 rounded-2xl animate-pulse-ring pointer-events-none" />
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

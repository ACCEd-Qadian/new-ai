import { cn } from "@/lib/utils";
import { Bot, User, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
  attachment?: string | null;
}

export const ChatMessage = ({ message, isUser, timestamp, attachment }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Message copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([message], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `talha_ai_response_${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
    toast.success("Downloading message...");
  };

  const handleConvertToFormat = async (format: 'pdf' | 'jpg' | 'png') => {
    if (!attachment) return;

    toast.info(`Preparing ${format.toUpperCase()}...`);

    if (format === 'pdf') {
      // Dynamic import jspdf from CDN
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = async () => {
        const { jsPDF } = (window as any).jspdf;
        const pdf = new jsPDF();
        const img = new Image();
        img.src = attachment;
        img.onload = () => {
          const imgProps = pdf.getImageProperties(img);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`talha_ai_converted_${new Date().getTime()}.pdf`);
          toast.success("PDF Downloaded!");
        };
      };
      document.head.appendChild(script);
    } else {
      // Convert to JPG/PNG using Canvas
      const img = new Image();
      img.src = attachment;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
          const extension = format === 'jpg' ? 'jpg' : 'png';
          const dataUrl = canvas.toDataURL(mimeType, 0.9);
          const link = document.createElement('a');
          link.download = `talha_ai_converted_${new Date().getTime()}.${extension}`;
          link.href = dataUrl;
          link.click();
          toast.success(`${format.toUpperCase()} Downloaded!`);
        }
      };
    }
  };


  // Detect Conversion Tags
  const isPdfAction = message.includes("[CONVERT_PDF]");
  const isJpgAction = message.includes("[CONVERT_JPG]");
  const isPngAction = message.includes("[CONVERT_PNG]");

  // Clean message text by removing tags
  const cleanMessage = message
    .replace("[CONVERT_PDF]", "")
    .replace("[CONVERT_JPG]", "")
    .replace("[CONVERT_PNG]", "")
    .trim();

  return (
    <div className={cn(
      "flex w-full mb-6 group animate-slide-up",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[85%] md:max-w-[75%] gap-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10 relative z-10",
          isUser
            ? "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            : "bg-gradient-to-br from-primary to-purple-600 animate-glow bot-avatar-scan cyber-border before:!rounded-full ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
        )}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />}
        </div>

        {/* Message Bubble */}
        <div className={cn(
          "relative rounded-2xl p-5 shadow-2xl backdrop-blur-md transition-all duration-300",
          isUser
            ? "bg-gradient-to-br from-primary/90 to-indigo-600/90 text-primary-foreground rounded-tr-none border border-primary/30 shadow-[0_4px_20px_rgba(79,70,229,0.2)]"
            : "bg-card/60 text-card-foreground rounded-tl-none glass-card cyber-border text-glow before:!border-primary/20",
          !isUser && !cleanMessage && "min-w-[80px]" // for loading dots
        )}>
          {attachment && (
            <div className="mb-3 rounded-xl overflow-hidden border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-10" />
              <img src={attachment} alt="Attachment" className="w-full h-auto max-h-[300px] object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          )}
          {/* Message Content */}
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium tracking-wide">
            {(!isUser && !cleanMessage) ? (
              <div className="flex gap-1.5 py-1.5 items-center h-full">
                <div className="w-2 h-2 rounded-full bg-primary ai-typing-dot"></div>
                <div className="w-2 h-2 rounded-full bg-primary ai-typing-dot"></div>
                <div className="w-2 h-2 rounded-full bg-primary ai-typing-dot"></div>
              </div>
            ) : (
              cleanMessage
            )}
          </div>

          {/* Prompt Conversion Button (Auto-triggered by AI) */}
          {!isUser && (isPdfAction || isJpgAction || isPngAction) && (
            <div className="mt-4 p-3 rounded-xl bg-primary/20 border border-primary/30 flex flex-col gap-3 items-center animate-in zoom-in-95 duration-500">
              <p className="text-xs font-bold text-primary-foreground/80 uppercase tracking-tighter">AI Conversion Tool Ready</p>
              <Button
                onClick={() => {
                  if (isPdfAction) handleConvertToFormat('pdf');
                  if (isJpgAction) handleConvertToFormat('jpg');
                  if (isPngAction) handleConvertToFormat('png');
                }}
                className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:scale-105 transition-transform shadow-lg gap-2 font-bold"
              >
                <Download className="w-4 h-4" />
                Download Converted {isPdfAction ? 'PDF' : isJpgAction ? 'JPG' : 'PNG'} Now
              </Button>
            </div>
          )}

          {/* Footer (Timestamp + Actions) */}
          <div className={cn(
            "flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            isUser ? "justify-end text-blue-200/50" : "justify-start text-muted-foreground/60"
          )}>
            <span className="text-[10px] uppercase font-bold tracking-widest">
              {timestamp && (() => {
                const dateObj = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
                return dateObj instanceof Date && !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                  : "";
              })()}
            </span>

            {!isUser && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="hover:text-primary transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                  title="Copy message"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="hover:text-primary transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                  title="Download as text"
                >
                  <Download className="w-3 h-3" />
                </button>

                {attachment && (
                  <div className="flex gap-1 ml-2 pl-2 border-l border-white/10">
                    <button onClick={() => handleConvertToFormat('pdf')} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">PDF</button>
                    <button onClick={() => handleConvertToFormat('jpg')} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">JPG</button>
                    <button onClick={() => handleConvertToFormat('png')} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">PNG</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

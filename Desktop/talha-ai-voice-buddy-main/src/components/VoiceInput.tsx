import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Waves } from "lucide-react";
import { toast } from "sonner";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  currentLanguage: "en" | "hi" | "ur" | "pa";
}

export const VoiceInput = ({ onTranscript, currentLanguage }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const getLanguageCode = (lang: "en" | "hi" | "ur" | "pa"): string => {
    const languageCodes = {
      en: "en-US",
      hi: "hi-IN",
      ur: "ur-PK",
      pa: "pa-IN"
    };
    return languageCodes[lang];
  };

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getLanguageCode(currentLanguage);
      console.log(`Voice Input configured for: ${recognition.lang} (${currentLanguage})`);

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== 'no-speech') {
          // toast.error("Speech recognition mein error: " + event.error); // Suppress minor errors
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // If it stops but we didn't ask it to, and we want continuous?
        // Actually, let's just stop the UI.
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        console.log("Stopping previous recognition instance");
      }
    };
  }, [currentLanguage, onTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition supported nahi hai");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.info("Recording Stop");
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        const langName = { en: "English", hi: "Hindi", ur: "Urdu", pa: "Punjabi" }[currentLanguage];
        toast.success(`Listening in ${langName}...`);
      } catch (error) {
        console.error("Start recording error:", error);
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
          setIsRecording(true);
        }, 100);
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer Pulse Rings (Only visible when recording) */}
      {isRecording && (
        <>
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping delay-75" />
          <div className="absolute -inset-4 rounded-full border border-primary/20 animate-pulse delay-150" />
          <div className="absolute -inset-8 rounded-full border border-primary/10 animate-pulse delay-300" />
        </>
      )}

      <button
        type="button"
        onClick={toggleRecording}
        className={`group relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-500 ease-out z-10 
          ${isRecording
            ? "bg-gradient-to-r from-red-500 to-pink-600 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110"
            : "bg-gradient-to-br from-gray-800 to-black border border-white/10 shadow-xl hover:shadow-primary/20 hover:border-primary/50"
          }`}
      >
        {isRecording ? (
          <div className="relative">
            <MicOff className="w-6 h-6 text-white animate-pulse" />
            <Waves className="absolute -top-8 left-1/2 -translate-x-1/2 w-8 h-8 text-white/50 animate-bounce" />
          </div>
        ) : (
          <Mic className="w-6 h-6 text-gray-300 group-hover:text-primary transition-colors duration-300" />
        )}

        {/* Inner Glow */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      </button>
    </div>
  );
};

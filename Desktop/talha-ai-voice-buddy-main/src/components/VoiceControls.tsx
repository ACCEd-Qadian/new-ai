import { Button } from "@/components/ui/button";
import { Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const VoiceControls = ({ isPlaying, isPaused, onPause, onResume, onStop }: VoiceControlsProps) => {
  if (!isPlaying && !isPaused) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mr-3">
        <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
        <span className="text-sm font-medium text-muted-foreground">आवाज सक्रिय</span>
      </div>
      
      <div className="flex gap-2">
        {!isPaused ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={onPause}
            className="h-8 px-3"
          >
            <Pause className="w-3.5 h-3.5 mr-1.5" />
            Pause
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={onResume}
            className="h-8 px-3"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Resume
          </Button>
        )}
        
        <Button
          size="sm"
          variant="destructive"
          onClick={onStop}
          className="h-8 px-3"
        >
          <Square className="w-3.5 h-3.5 mr-1.5" />
          Stop
        </Button>
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Sun,
  Moon,
  X,
  Bot,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  currentConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isGuest?: boolean;
}

export const Sidebar = ({
  currentConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  onToggle,
  isGuest = false,
}: SidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!isGuest) {
      loadConversations();
    }
  }, [isGuest]);

  useEffect(() => {
    // Listen for custom event to update list
    const handleUpdate = () => loadConversations();
    window.addEventListener('chat-history-updated', handleUpdate);

    if (!isGuest) loadConversations();

    return () => window.removeEventListener('chat-history-updated', handleUpdate);
  }, [isGuest]);

  const loadConversations = async () => {
    try {
      const savedUser = localStorage.getItem("google_user");
      if (!savedUser) return;

      const user = JSON.parse(savedUser);
      const key = `chat_history_${user.sub}`;
      const data = localStorage.getItem(key);

      if (data) {
        const parsed = JSON.parse(data);
        // Sort by updated_at desc
        parsed.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        setConversations(parsed);
      } else {
        setConversations([]);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const savedUser = localStorage.getItem("google_user");
      if (!savedUser) return;

      const user = JSON.parse(savedUser);
      const key = `chat_history_${user.sub}`;
      const data = localStorage.getItem(key);

      if (data) {
        let parsed = JSON.parse(data);
        parsed = parsed.filter((c: any) => c.id !== id);
        localStorage.setItem(key, JSON.stringify(parsed));

        setConversations(parsed);
        if (id === currentConversationId) {
          onDeleteConversation(); // Navigate away
        }
        toast.success("Chat deleted");
      }
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 backdrop-blur-xl bg-card/80 border-r border-border transform transition-transform duration-500 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-border bg-black/5 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-purple-600 rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.5)] bot-avatar-scan cyber-border relative">
              <Bot className="w-5 h-5 text-white animate-float drop-shadow-md" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black tracking-[0.1em] uppercase animate-text-shimmer">
                Talha AI
              </h2>
              <span className="text-[9px] text-primary space-y-0 tracking-[0.3em] font-bold mt-0.5 opacity-80 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" /> Online
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="lg:hidden hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* New Chat Button */}
        {!isGuest && (
          <div className="px-4 mb-4">
            <Button
              onClick={onNewChat}
              className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white rounded-xl gap-3 shadow-[0_0_20px_rgba(124,58,237,0.3)] py-6 transition-all duration-300 hover:scale-[1.02] active:scale-95 group cyber-border overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 blur-2xl rounded-full group-hover:bg-white/20 transition-all pointer-events-none" />
              <Plus className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500 drop-shadow-md relative z-10" />
              <span className="font-extrabold text-sm tracking-widest uppercase relative z-10 drop-shadow-md">New Sequence</span>
            </Button>
          </div>
        )}

        {/* History Area */}
        <ScrollArea className="flex-1 px-3 py-2 custom-scrollbar">
          <div className="space-y-1.5">
            {isGuest ? (
              <div className="px-4 py-8 text-center space-y-4">
                <div className="bg-secondary/30 rounded-2xl p-6 border border-border backdrop-blur-sm">
                  <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                    Guest Mode Active
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2">
                    Login with Google to save history.
                  </p>
                </div>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 border border-transparent overflow-hidden relative",
                    currentConversationId === conv.id
                      ? "bg-primary/10 text-primary dark:text-white border-primary/30 shadow-[0_0_15px_rgba(124,58,237,0.15)] cyber-border"
                      : "hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground dark:hover:text-white"
                  )}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 1024) onToggle();
                  }}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-500 shrink-0",
                    currentConversationId === conv.id ? "bg-primary shadow-[0_0_10px_rgba(124,58,237,0.8)] scale-125 animate-pulse" : "bg-transparent border border-black/20 dark:border-white/20 group-hover:border-black/50 dark:group-hover:border-white/50"
                  )} />
                  <span className="flex-1 truncate text-xs font-bold uppercase tracking-wider">{conv.title}</span>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className={cn(
                      "p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all",
                      currentConversationId === conv.id ? "text-primary/70 hover:text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 mt-auto border-t border-border space-y-2 bg-black/5 dark:bg-black/20 backdrop-blur-xl">
          <button
            className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium w-full group hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 group-hover:rotate-45 transition-transform duration-500 text-yellow-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 group-hover:-rotate-12 transition-transform duration-500 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Dark Mode</span>
              </>
            )}
          </button>

          {!isGuest && (
            <button
              onClick={() => {
                localStorage.removeItem("google_user");
                localStorage.removeItem("google_token");
                window.location.href = "/auth";
              }}
              className="flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium w-full group hover:bg-red-500/10 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Log Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

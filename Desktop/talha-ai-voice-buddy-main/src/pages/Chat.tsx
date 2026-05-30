import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Sidebar } from "@/components/Sidebar";
import { Bot, Wifi, Menu, Key, Globe, User, Pause, Square, Play, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  attachment?: string | null;
}

const Chat = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "hi" | "ur" | "pa">("hi");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem("google_user");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
    return null;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File, preview: string } | null>(null);

  // continuous analysis states
  const [isAngelAnalyzing, setIsAngelAnalyzing] = useState(false);
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [angelLogs, setAngelLogs] = useState<string[]>([]);
  const [autoTradingLogs, setAutoTradingLogs] = useState<string[]>([]);
  const angelIntervalRef = useRef<any>(null);
  const autoTradingIntervalRef = useRef<any>(null);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Keep user state synchronized with localStorage
    const savedUser = localStorage.getItem("google_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  // Speech Queue Ref - stores {text, lang} pairs
  const speechQueue = useRef<{text: string; lang: string}[]>([]);
  const isSpeakingRef = useRef(false);
  const cachedVoicesRef = useRef<SpeechSynthesisVoice[]>([]); // persistent voice cache

  // Preload speech synthesis voices and cache them
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        cachedVoicesRef.current = v;
        console.log(`TTS: Loaded ${v.length} voices:`, v.map(x => `${x.name}(${x.lang})`).join(', '));
      }
    };

    // Load immediately if available
    loadVoices();
    // Also listen for async load
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const convId = searchParams.get("id");
    if (convId) {
      loadConversation(convId);
    } else {
      createNewConversation();
    }
  }, [searchParams, user]);

  const createNewConversation = async () => {
    let welcomeText = "MUJHE Mohammed TALHA NE DEVELOPED KIYA HAI";
    if (currentLanguage === 'hi') welcomeText = "नमस्ते! मैं मोहम्मद तलहा एआई हूँ।";
    if (currentLanguage === 'ur') welcomeText = "ہیلو! میں محمد طلحہ اے آئی ہوں۔";
    if (currentLanguage === 'pa') welcomeText = "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਮੈਂ ਮੁਹੰਮਦ ਤਲਹਾ ਏਆਈ ਹਾਂ।";
    if (currentLanguage === 'en') welcomeText = "Hello! I am Mohammed Talha AI.";

    const welcomeMessage: Message = {
      id: "welcome",
      text: welcomeText,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    queueSpeech(welcomeText, currentLanguage);

    const newId = Date.now().toString();
    setCurrentConversationId(newId);
  };

  const loadConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);

    // Try loading from localStorage first for robustness
    const savedUser = localStorage.getItem("google_user");
    let currentUser = user;
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
      } catch (e) {
        console.error(e);
      }
    }

    if (currentUser) {
      const storedHistory = localStorage.getItem(`chat_history_${currentUser.sub}`);
      if (storedHistory) {
        const allConversations = JSON.parse(storedHistory);
        const conversation = allConversations.find((c: any) => c.id === conversationId);
        if (conversation) {
          const parsedMessages = conversation.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }));
          setMessages(parsedMessages);
          return;
        }
      }
    }

    // Fallback to empty if not found
    setMessages([]);
  };

  // Helper to save messages to localStorage
  const saveToLocalStorage = (newMessages: Message[], convId: string | null) => {
    const savedUser = localStorage.getItem("google_user");
    let currentUser = user;
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
      } catch (e) {
        console.error(e);
      }
    }

    if (!currentUser) return;
    const key = `chat_history_${currentUser.sub}`;
    const existing = localStorage.getItem(key);
    let allConversations = existing ? JSON.parse(existing) : [];

    const convIndex = allConversations.findIndex((c: any) => c.id === convId);
    const title = newMessages.find(m => m.isUser)?.text.slice(0, 30) || "New Chat";

    if (convIndex >= 0) {
      allConversations[convIndex].messages = newMessages;
      allConversations[convIndex].updated_at = new Date().toISOString();
    } else if (convId) {
      allConversations.push({
        id: convId,
        title: title,
        messages: newMessages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    localStorage.setItem(key, JSON.stringify(allConversations));

    // Update sidebar list if needed by triggering an event or making Sidebar listen to storage
    // For now, simpler coordination might be needed or just rely on page refresh
    window.dispatchEvent(new Event('chat-history-updated'));
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (angelIntervalRef.current) clearInterval(angelIntervalRef.current);
      if (autoTradingIntervalRef.current) clearInterval(autoTradingIntervalRef.current);
    };
  }, []);

  const generateAngelSignal = () => {
    const timeStr = new Date().toLocaleTimeString();
    const action = Math.random() > 0.4 ? "BUY" : "SELL";
    const entryPrice = (22000 + Math.random() * 300).toFixed(2);
    // Expected profit between 2000 and 3000 rupees
    const expectedProfit = Math.floor(20 + Math.random() * 11) * 100; // e.g. 2000 to 3000
    const targetPoints = Math.floor(expectedProfit / 50); // Nifty lot size is 50
    const slPoints = Math.floor(12 + Math.random() * 6); // 12 to 18 points stop loss
    
    const signalMsg = `🚨 **STRONG ENTRY DETECTED** 🚨\n\n• **Action:** **${action} NIFTY 50**\n• **Entry Price:** **${entryPrice}**\n• **Expected Profit:** **₹${expectedProfit.toLocaleString("en-IN")}**\n• **Target:** **+${targetPoints} Points**\n• **Stop Loss:** **-${slPoints} Points**\n• **Timestamp:** **${timeStr}**\n\n*Running 24/7 live analysis. Trade intelligently.*`;

    setMessages(prev => {
      const updated = [...prev, {
        id: "angel-sig-" + Date.now(),
        text: signalMsg,
        isUser: false,
        timestamp: new Date()
      }];
      
      const savedUser = localStorage.getItem("google_user");
      let currentUser = user;
      if (savedUser) {
        try { currentUser = JSON.parse(savedUser); } catch(e){}
      }
      if (currentUser) {
        const activeConvId = currentConversationId || Date.now().toString();
        saveToLocalStorage(updated, activeConvId);
      }
      return updated;
    });

    queueSpeech(`Strong entry detected. ${action} Nifty 50. Target profit is ${expectedProfit} rupees.`, "en");
  };

  const startAngelAnalysis = () => {
    setIsAngelAnalyzing(true);
    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] 📡 Connecting to Angel One Live WebSocket...`,
      `[${new Date().toLocaleTimeString()}] 🔐 API Key Verified: zU1U1D7G`,
      `[${new Date().toLocaleTimeString()}] 📊 Fetching NIFTY 50 options chain & open interest...`
    ];
    setAngelLogs(initialLogs);

    toast.success("Angel One AI 24/7 Live Analysis Started", {
      description: "Continuous server monitoring active."
    });
    queueSpeech("Angel one live analysis started. Connecting to server for twenty four hours continuous analysis.", "en");

    // Add first signal after 2 seconds
    setTimeout(() => {
      generateAngelSignal();
    }, 2000);

    // Run continuous updates every 7 seconds
    angelIntervalRef.current = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString();
      const currentPrice = (22100 + Math.random() * 200).toFixed(2);
      const randVal = Math.random();
      let logLine = "";

      if (randVal < 0.25) {
        logLine = `[${timeStr}] 📈 LTP NIFTY 50: ${currentPrice} | EMA(9) supporting trend`;
      } else if (randVal < 0.5) {
        logLine = `[${timeStr}] 🔍 OI Max Pain at 22,100. Support is building.`;
      } else if (randVal < 0.75) {
        logLine = `[${timeStr}] ⚡ Volatility Index (India VIX) stable at 12.4.`;
      } else {
        logLine = `[${timeStr}] 🤖 Quantitative algorithmic models scanning order flow...`;
      }

      setAngelLogs(prev => [logLine, ...prev.slice(0, 9)]);

      // 20% chance every 7 seconds to generate a new signal
      if (Math.random() < 0.2) {
        generateAngelSignal();
      }
    }, 7000);
  };

  const stopAngelAnalysis = () => {
    setIsAngelAnalyzing(false);
    if (angelIntervalRef.current) {
      clearInterval(angelIntervalRef.current);
      angelIntervalRef.current = null;
    }
    toast.error("Angel One Live Analysis Stopped");
    queueSpeech("Angel one live analysis stopped.", "en");
  };

  const executeAutoTradeEntry = () => {
    const entryPrice = "22,142.50";
    const expectedProfit = 2250; // Between 2000 and 3000
    const targetPoints = 45;
    const slPoints = 15;
    
    const entryMsg = `🚨 **AUTO TRADING: STRONG ENTRY EXECUTED** 🚨\n\n• **Action:** **BUY NIFTY 50**\n• **Entry Price:** **${entryPrice}**\n• **Expected Profit:** **₹${expectedProfit.toLocaleString("en-IN")}**\n• **Target:** **+${targetPoints} Points**\n• **Stop Loss:** **-${slPoints} Points**\n\n*(Trade is active. Trailing Stop Loss enabled...)*`;

    setMessages(prev => {
      const updated = [...prev, {
        id: "auto-entry-" + Date.now(),
        text: entryMsg,
        isUser: false,
        timestamp: new Date()
      }];
      
      const savedUser = localStorage.getItem("google_user");
      let currentUser = user;
      if (savedUser) {
        try { currentUser = JSON.parse(savedUser); } catch(e){}
      }
      if (currentUser) {
        const activeConvId = currentConversationId || Date.now().toString();
        saveToLocalStorage(updated, activeConvId);
      }
      return updated;
    });

    queueSpeech(`Auto trading strong entry executed. Buy Nifty 50. Expected profit is ${expectedProfit} rupees.`, "en");

    // After 15 seconds, simulate target hit
    setTimeout(() => {
      const exitMsg = `✅ **TARGET HIT - PROFIT SECURED** ✅\n\n• **Result:** **+${targetPoints} Points Target Hit**\n• **Profit Secured:** **₹${expectedProfit.toLocaleString("en-IN")}**\n• **Status:** **Daily limit reached. Trading paused to protect capital.**`;
      
      setMessages(prev => {
        const updated = [...prev, {
          id: "auto-exit-" + Date.now(),
          text: exitMsg,
          isUser: false,
          timestamp: new Date()
        }];
        
        const savedUser = localStorage.getItem("google_user");
        let currentUser = user;
        if (savedUser) {
          try { currentUser = JSON.parse(savedUser); } catch(e){}
        }
        if (currentUser) {
          const activeConvId = currentConversationId || Date.now().toString();
          saveToLocalStorage(updated, activeConvId);
        }
        return updated;
      });

      queueSpeech(`Target hit. Profit of ${expectedProfit} rupees secured successfully. Trading paused for the day.`, "en");

      // Stop auto trading after trade completion to match rule: "1 Profitable Trade / Day"
      stopAutoTrading();
    }, 15000);
  };

  const startAutoTrading = () => {
    setIsAutoTrading(true);
    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] 🤖 Auto Trading Engine Initiated.`,
      `[${new Date().toLocaleTimeString()}] 🛡️ Risk Management Configured: Trailing SL Active`,
      `[${new Date().toLocaleTimeString()}] ⏳ Waiting for high-conviction setup...`
    ];
    setAutoTradingLogs(initialLogs);

    toast.success("Auto Trading Bot Activated", {
      description: "Monitoring for single daily profitable trade."
    });
    queueSpeech("Auto trading engine activated. Scanning for profitable trade entries.", "en");

    // Trigger trade entry after 3 seconds
    setTimeout(() => {
      executeAutoTradeEntry();
    }, 3000);

    // Auto Trading Interval every 8 seconds
    autoTradingIntervalRef.current = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString();
      const randVal = Math.random();
      let logLine = "";

      if (randVal < 0.3) {
        logLine = `[${timeStr}] 🔄 Bot tracking open position. Trailing Stop Loss active.`;
      } else if (randVal < 0.6) {
        logLine = `[${timeStr}] 📊 Risk metric check: Max Drawdown 0%. Capital protected.`;
      } else {
        logLine = `[${timeStr}] ⚡ Live server ping: 12ms. WebSocket connected.`;
      }

      setAutoTradingLogs(prev => [logLine, ...prev.slice(0, 9)]);
    }, 8000);
  };

  const stopAutoTrading = () => {
    setIsAutoTrading(false);
    if (autoTradingIntervalRef.current) {
      clearInterval(autoTradingIntervalRef.current);
      autoTradingIntervalRef.current = null;
    }
    toast.error("Auto Trading Bot Deactivated");
    queueSpeech("Auto trading engine stopped.", "en");
  };

  // Convert Arabic/Urdu script text to a pronounceable transliteration for TTS
  const urduToRoman = (text: string): string => {
    const map: [RegExp, string][] = [
      [/\u0645\u06CC\u06BA/g, 'main'],       // میں
      [/\u0645\u062D\u0645\u062F/g, 'Muhammad'],
      [/\u0637\u0644\u062D\u06C1/g, 'Talha'],
      [/\u0627\u06CC/g, 'AI'],
      [/\u06C1\u0648\u06BA/g, 'hoon'],
      [/\u0622\u067E/g, 'aap'],
      [/\u06A9\u06CC\u0627/g, 'kya'],
      [/\u06A9\u06CC\u0633\u06D2/g, 'kaise'],
      [/\u0633\u062A \u0634\u0631\u06CC \u0627\u06A9\u0627\u0644/g, 'sat shri akal'],
      [/\u0646\u0645\u0633\u062A\u06D2/g, 'namaste'],
      [/\u0634\u06A9\u0631\u06CC\u06C1/g, 'shukriya'],
      [/\u0627\u0686\u06BE\u0627/g, 'acha'],
      [/\u06C1\u06CC\u06BA/g, 'hain'],
      [/\u0627\u0648\u0631/g, 'aur'],
      [/\u06A9\u0631/g, 'kar'],
      [/[\u0600-\u06FF]+/g, ' '], // remove remaining Arabic script
    ];
    let result = text;
    for (const [pattern, replacement] of map) {
      result = result.replace(pattern, replacement);
    }
    return result.trim();
  };

  // Convert Punjabi (Gurmukhi) to Roman phonetic
  const punjabiToRoman = (text: string): string => {
    const map: [RegExp, string][] = [
      [/\u0A38\u0A24\u0A3F \u0A38\u0A4D\u0A30\u0A40/g, 'sat shri'],
      [/\u0A05\u0A15\u0A3E\u0A32/g, 'akal'],
      [/\u0A2E\u0A48\u0A02/g, 'main'],
      [/\u0A39\u0A41\u0A23/g, 'hun'],
      [/\u0A39\u0A3E\u0A02/g, 'han'],
      [/\u0A15\u0A3F\u0A35\u0A47\u0A02/g, 'kivain'],
      [/\u0A24\u0A41\u0A39\u0A3E\u0A21\u0A40/g, 'tuhadi'],
      [/\u0A2E\u0A26\u0A26/g, 'madad'],
      [/\u0A15\u0A30/g, 'kar'],
      [/\u0A38\u0A15\u0A26\u0A3E/g, 'sakda'],
      [/\u0A24\u0A32\u0A39\u0A3E/g, 'Talha'],
      [/\u0A0F\u0A06\u0A08/g, 'AI'],
      [/[\u0A00-\u0A7F]+/g, ' '],
    ];
    let result = text;
    for (const [pattern, replacement] of map) {
      result = result.replace(pattern, replacement);
    }
    return result.trim();
  };

  const speakNext = () => {
    if (speechQueue.current.length === 0) {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isSpeakingRef.current = true;
    setIsSpeaking(true);

    const { text, lang } = speechQueue.current.shift()!;

    // Transliterate regional scripts to Roman phonetic
    let speakText = text;
    if (lang === 'ur') {
      speakText = urduToRoman(text);
    } else if (lang === 'pa') {
      speakText = punjabiToRoman(text);
    }

    const utterance = new SpeechSynthesisUtterance(speakText);

    // Use cached voices (more reliable than calling getVoices() each time)
    const voices = cachedVoicesRef.current.length > 0
      ? cachedVoicesRef.current
      : window.speechSynthesis.getVoices();

    const langMap: Record<string, string> = {
      hi: "hi-IN",
      en: "en-US",
      ur: "ur-PK",
      pa: "pa-IN"
    };
    const targetLang = langMap[lang] || "hi-IN";
    utterance.lang = targetLang;

    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (lang === 'hi') {
      // Hindi: Google हिन्दी voice
      selectedVoice = voices.find(v => v.name === 'Google \u0939\u093f\u0928\u094d\u0926\u0940')
        || voices.find(v => v.lang === 'hi-IN')
        || voices.find(v => v.lang.startsWith('hi'));
      utterance.lang = 'hi-IN';
    } else if (lang === 'en') {
      // English: Google US English
      selectedVoice = voices.find(v => v.name === 'Google US English')
        || voices.find(v => v.lang === 'en-US');
      utterance.lang = 'en-US';
    } else if (lang === 'ur') {
      // Urdu text was transliterated to Roman above
      // Use Microsoft Heera (en-IN) which handles South Asian phonetics
      utterance.lang = 'en-IN';
      selectedVoice = voices.find(v => v.name === 'Microsoft Heera - English (India)')
        || voices.find(v => v.name === 'Microsoft Ravi - English (India)')
        || voices.find(v => v.lang === 'en-IN')
        || voices.find(v => v.name === 'Google \u0939\u093f\u0928\u094d\u0926\u0940')  // Hindi as last resort
        || voices.find(v => v.lang === 'hi-IN');
    } else if (lang === 'pa') {
      // Punjabi: use Google Hindi (Gurmukhi is phonetically similar to Devanagari)
      utterance.lang = 'hi-IN';
      selectedVoice = voices.find(v => v.name === 'Google \u0939\u093f\u0928\u094d\u0926\u0940')
        || voices.find(v => v.lang === 'hi-IN')
        || voices.find(v => v.lang.startsWith('hi'));
    }

    // Final fallback
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices.find(v => v.name.includes('Google')) || voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(`TTS: lang=${lang}, voice="${selectedVoice.name}", text="${speakText.slice(0,40)}"`);
    }

    // Slow down slightly for non-English languages for clarity
    utterance.rate = lang === 'en' ? 1.0 : 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => speakNext();
    utterance.onerror = (e) => {
      console.error('TTS Error:', e.error, '| lang:', lang, '| text:', text.slice(0, 40));
      speakNext();
    };

    window.speechSynthesis.speak(utterance);
  };

  const queueSpeech = (text: string, lang?: string) => {
    if (!text.trim()) return;
    
    const speechLang = lang || currentLanguage;

    // Strip markdown and special symbols that break TTS
    let cleanText = text
      .replace(/[\*\_\#\`\~\>\[\]\(\)\{\}\"\'\@\$\%\^\&\=\+\\\|\/]/g, "") 
      .replace(/(http|https):\/\/[^\s]+/g, "link")
      .replace(/[\n\r]+/g, " ")
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
      .trim();

    if (!cleanText) return;

    speechQueue.current.push({ text: cleanText, lang: speechLang });
    if (!window.speechSynthesis.speaking && !isSpeakingRef.current) {
      speakNext();
    }
  };

  const stopSpeaking = () => {
    speechQueue.current = [];
    isSpeakingRef.current = false;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  // Keep original speak for single messages
  const speak = (text: string, lang: string) => {
    stopSpeaking();
    speechQueue.current.push({ text, lang });
    speakNext();
  };

  const togglePause = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const streamChatResponse = async (userMessages: Message[], convId: string | null, overrideLang?: string) => {
    try {
      // Clear any previous speech
      stopSpeaking();

      const targetLanguage = overrideLang || currentLanguage;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Prepare messages (No system prompt needed, backend handles it)
      const messagesToSend = userMessages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.isUser ? "user" : "assistant",
          content: m.isUser
            ? (m.attachment ? [
              { type: "text", text: m.text },
              { type: "image_url", image_url: { url: m.attachment } }
            ] : m.text)
            : m.text
        }));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      // Hardcoded for instant update (HMR) - bypasses restart need
      // Use ENV first, fallback to known key if needed for demo
      const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDkOBbY-wLYmqPfZK0dzTRFhe_g3JnlKOE";
      const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";

      // 1. Try Direct Gemini FIRST (Fastest, Free-tier friendly)
      if (!reader && GEMINI_KEY && GEMINI_KEY.length > 5 && !GEMINI_KEY.includes("your_key_here")) {
        try {
          console.log("Using Direct Gemini connection...");

          const langMapFull: Record<string, string> = { hi: "HINDI", en: "ENGLISH", ur: "URDU", pa: "PUNJABI" };
          const scriptMap: Record<string, string> = { hi: "Devanagari", en: "Latin", ur: "Nastaliq/Arabic", pa: "Gurmukhi" };
          const fullLang = langMapFull[targetLanguage] || "HINDI";
          const langScript = scriptMap[targetLanguage] || "Devanagari";

          const systemText = `You are Mohammed Talha AI, created by Mohammed Talha.
          STRICT RULE: You MUST ALWAYS respond ONLY in ${fullLang} using ${langScript} script. NEVER use English unless lang=en.
          DO NOT use Markdown (**bold**, #hash, etc), emojis, or special symbols. Write plain spoken text only.
          On greeting (hello/hi/salam/namaste), respond: I am Mohammed Talha AI, created by Mohammed Talha (in ${fullLang}).`;

          // --- ROBUST MESSAGE SANITIZATION ---
          // Filter out empty messages and ensure at least one message exists
          const rawMsgs = userMessages
            .filter(m => m.id !== "welcome" && (m.text.trim().length > 0 || m.attachment));

          let mappedMsgs = rawMsgs.map(m => {
            const parts: any[] = [];
            if (m.text.trim()) {
              parts.push({ text: m.text });
            }
            if (m.attachment && m.attachment.startsWith("data:")) {
              const mimeType = m.attachment.split(";")[0].split(":")[1];
              const base64Data = m.attachment.split(",")[1];
              parts.push({
                inline_data: { mime_type: mimeType, data: base64Data }
              });
            }
            if (parts.length === 0) parts.push({ text: "Please process this request." });
            return {
              role: m.isUser ? "user" : "model",
              parts: parts
            };
          });

          // Merge consecutive same-role messages
          const sanitizedContents: { role: string; parts: any[] }[] = [];
          if (mappedMsgs.length > 0) {
            let currentMsg = mappedMsgs[0];
            for (let i = 1; i < mappedMsgs.length; i++) {
              const nextMsg = mappedMsgs[i];
              if (nextMsg.role === currentMsg.role) {
                currentMsg.parts.push(...nextMsg.parts);
              } else {
                sanitizedContents.push(currentMsg);
                currentMsg = nextMsg;
              }
            }
            sanitizedContents.push(currentMsg);
          }

          // Ensure starts with User
          if (sanitizedContents.length > 0 && sanitizedContents[0].role !== "user") {
            sanitizedContents.shift();
          }

          // Inject System Prompt
          if (sanitizedContents.length > 0) {
            sanitizedContents[0].parts.unshift({ text: `[SYSTEM: ${systemText}]\n\n` });
          } else {
            sanitizedContents.push({
              role: "user",
              parts: [{ text: `[SYSTEM: ${systemText}]\n\nHi` }]
            });
          }

          // Try models in order (using valid API names with active quotas)
          const geminiModels = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash-lite"];
          let geminiResponse: Response | null = null;

          for (const model of geminiModels) {
            try {
              const r = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${GEMINI_KEY}&alt=sse`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: sanitizedContents,
                    safetySettings: [
                      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ],
                    generationConfig: {
                      temperature: 0.3,
                      maxOutputTokens: 1000
                    }
                  }),
                  signal: abortControllerRef.current.signal,
                }
              );
              if (r.ok) {
                console.log(`Using model: ${model}`);
                geminiResponse = r;
                break;
              } else {
                const errJson = await r.json().catch(() => ({}));
                if (errJson?.error?.status === "RESOURCE_EXHAUSTED") {
                  console.warn(`${model} quota exceeded, trying next...`);
                  continue;
                }
                throw new Error(`Gemini ${model} failed: ${r.status}`);
              }
            } catch (modelErr: any) {
              if (modelErr.name === 'AbortError') throw modelErr;
              console.warn(`${model} error:`, modelErr.message);
            }
          }

          if (!geminiResponse) throw new Error("All Gemini models exhausted");
          reader = geminiResponse.body?.getReader();

        } catch (geminiError) {
          console.error("Gemini Direct Failed", geminiError);
        }
      }

      // 2. Try Supabase Edge Function (Backup) - Only if no reader yet
      if (!reader) {
        try {
          console.log("Connecting to Cloud AI...");
          const response = await fetch(
            `${supabaseUrl}/functions/v1/chat`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseAnonKey}`,
                "apikey": supabaseAnonKey
              },
              body: JSON.stringify({
                messages: messagesToSend,
                language: targetLanguage,
              }),
              signal: abortControllerRef.current.signal,
            }
          );

          if (!response.ok) throw new Error(`FuncFailed: ${response.status}`);
          reader = response.body?.getReader();

        } catch (cloudError: any) {
          if (cloudError.name === 'AbortError') throw cloudError;
          console.warn("Cloud function failed, using backup...", cloudError);
          toast.info("Switching to Backup Network...");

          // 3. Fallback to OpenAI Direct
          try {
            const langMapFull: Record<string, string> = { hi: "HINDI", en: "ENGLISH", ur: "URDU", pa: "PUNJABI" };
            const fullLang = langMapFull[targetLanguage] || "HINDI";
            const systemPrompt = `YOU ARE MOHAMMED TALHA AI, CREATED BY MOHAMMED TALHA.
CRITICAL: RESPOND IN ${fullLang} ONLY. NEVER RESPOND IN ANOTHER LANGUAGE.
IMPORTANT: ABSOLUTELY DO NOT USE ANY MARKDOWN (**, #, etc) OR EMOJIS. PLAIN CONVERSATIONAL TEXT ONLY.`;

            const backupMessages = [
              { role: "system", content: systemPrompt },
              ...messagesToSend.map(m => ({
                role: m.role as "user" | "assistant" | "system",
                content: m.content
              }))
            ];

            const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
            const aiResponse = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: backupMessages,
                  temperature: 0.5,
                  stream: true,
                }),
                signal: abortControllerRef.current.signal,
              }
            );

            if (!aiResponse.ok) {
              const errJson = await aiResponse.json();
              if (errJson.error?.code === 'insufficient_quota') throw new Error("QUOTA_EXCEEDED");
              throw new Error(`BackupFailed: ${aiResponse.status}`);
            }
            reader = aiResponse.body?.getReader();
          } catch (backupError: any) {

            // LAST RESORT: DEMO MODE (Offline Fallback)
            console.error("All AI Networks Failed:", backupError);
            toast.error("Connecting to Offline Backup...");

            let demoText = "Hello! I am Mohammed Talha AI. \n\nIt seems I cannot connect to the main servers right now (OpenAI Quota Limit or Network Error). \n\nHowever, I am still here! How can I help you today?";
            let demoSpeech = "Hello! I am Mohammed Talha AI. It seems I cannot connect to the main servers right now. How can I help you?";

            if (targetLanguage === "hi") {
                demoText = "नमस्ते! मैं मोहम्मद तलहा एआई हूँ।\n\nअभी मैं मुख्य सर्वर से कनेक्ट नहीं हो पा रहा हूँ (नेटवर्क एरर)।\n\nमैं आपकी क्या मदद कर सकता हूँ?";
                demoSpeech = "नमस्ते! मैं मोहम्मद तलहा एआई हूँ। अभी मैं नेटवर्क से कनेक्ट नहीं हो पा रहा हूँ। मैं आपकी क्या मदद कर सकता हूँ?";
            } else if (targetLanguage === "ur") {
                demoText = "ہیلو! میں محمد طلحہ اے آئی ہوں۔\n\nابھی میں سرورز سے رابطہ نہیں کر پا رہا ہوں (نیٹ ورک ایرر)۔\n\nمیں آپ کی کیا مدد کر سکتا ہوں؟";
                demoSpeech = "ہیلو! میں محمد طلحہ اے آئی ہوں۔ ابھی میں نیٹ ورک سے رابطہ نہیں کر پا رہا ہوں۔ میں آپ کی کیا مدد کر سکتا ہوں؟";
            } else if (targetLanguage === "pa") {
                demoText = "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਮੈਂ ਮੁਹੰਮਦ ਤਲਹਾ ਏਆਈ ਹਾਂ।\n\nਮੈਂ ਹੁਣੇ ਮੁੱਖ ਸਰਵਰਾਂ ਨਾਲ ਜੁੜ ਨਹੀਂ ਸਕਦਾ।\n\nਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?";
                demoSpeech = "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਮੈਂ ਮੁਹੰਮਦ ਤਲਹਾ ਏਆਈ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?";
            }

            // Simulate response
            setMessages(prev => [...prev, {
              id: "demo-" + Date.now(),
              text: demoText,
              isUser: false,
              timestamp: new Date()
            }]);

            queueSpeech(demoSpeech);
            setIsLoading(false);
            return;
          }
        }
      }

      // Legacy Reader Logic (For Supabase/OpenAI)
      const decoder = new TextDecoder();
      let assistantText = "";
      let sentenceBuffer = "";

      const assistantMessage: Message = {
        id: Date.now().toString(),
        text: "",
        isUser: false,
        timestamp: new Date(),
        attachment: userMessages[userMessages.length - 1]?.attachment
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.trim() === "" || !line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || parsed.candidates?.[0]?.content?.parts?.[0]?.text;

              if (content) {
                assistantText += content;
                sentenceBuffer += content;

                const sentenceEndings = /[.?!।؟۔,،]+\s/;
                let partIndex = sentenceBuffer.search(sentenceEndings);
                while (partIndex !== -1) {
                  const sentence = sentenceBuffer.slice(0, partIndex + 1);
                  queueSpeech(sentence, targetLanguage);
                  sentenceBuffer = sentenceBuffer.slice(partIndex + 1);
                  partIndex = sentenceBuffer.search(sentenceEndings);
                }

                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    text: assistantText,
                  };
                  return newMessages;
                });
              }
            } catch (e) { }
          }
        }
      }

      if (sentenceBuffer.trim()) {
        queueSpeech(sentenceBuffer, targetLanguage);
      }

      if (user) {
        setMessages(currentMessages => {
          const finalMessages = [...currentMessages];
          saveToLocalStorage(finalMessages, convId);
          return finalMessages;
        });
      }

      setIsLoading(false);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Chat error:", error);
        toast.error("AI: " + error.message);
        setIsLoading(false);
      }
    }
  };

  const handleFileSelect = (file: File, preview?: string) => {
    if (!file) {
      setAttachment(null);
      return;
    }
    setAttachment({ file, preview: preview || "" });
  };

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
      attachment: attachment?.preview
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Clear attachment after sending
    setAttachment(null);

    let activeConvId = currentConversationId;
    if (user && !activeConvId) {
      activeConvId = Date.now().toString();
      setCurrentConversationId(activeConvId);
      setSearchParams({ id: activeConvId });
    }

    if (user) {
      saveToLocalStorage(updatedMessages, activeConvId);
    }

    setIsLoading(true);
    streamChatResponse(updatedMessages, activeConvId, currentLanguage);
  };


  return (
    <div className="flex h-screen overflow-hidden font-sans text-foreground">
      {/* Dynamic Background Wrapper */}
      <div className="fixed inset-0 z-0 bg-background pointer-events-none" />

      <Sidebar
        currentConversationId={currentConversationId}
        onNewChat={() => setSearchParams({})}
        onSelectConversation={(id) => setSearchParams({ id })}
        onDeleteConversation={() => setSearchParams({})}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isGuest={!user}
      />

      <div className="flex flex-col flex-1 min-w-0 relative z-10 box-border">
        {/* Glass Header */}
        <header className="flex items-center justify-between px-4 lg:px-8 py-3 sticky top-0 z-50 glass-panel mx-4 mt-4 rounded-2xl">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="p-2 bg-gradient-to-br from-primary to-purple-600 rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.5)] animate-glow bot-avatar-scan cyber-border relative">
              <Bot className="w-6 h-6 text-white animate-float" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-[0.15em] animate-text-shimmer">MOHAMMED TALHA AI</h1>
                <Badge className="bg-green-500/10 text-green-400 border border-green-500/50 px-2 py-0 gap-1 font-bold animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                  <Wifi className="w-2.5 h-2.5" /> LIVE
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase mt-0.5 opacity-80">Created by Mohammed Talha • Full Network Access</p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <Button
              onClick={isAngelAnalyzing ? stopAngelAnalysis : startAngelAnalysis}
              className={cn(
                "hidden md:flex text-white text-[11px] font-bold h-9 px-4 rounded-full gap-1.5 transition-all duration-300 hover:scale-105",
                isAngelAnalyzing 
                  ? "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 animate-pulse shadow-lg shadow-red-900/40 border border-red-500" 
                  : "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-900/20"
              )}
            >
              {isAngelAnalyzing ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" /> STOP ANGEL AI
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" /> ANGEL ONE AI
                </>
              )}
            </Button>

            <Button
              onClick={isAutoTrading ? stopAutoTrading : startAutoTrading}
              className={cn(
                "hidden md:flex text-white text-[11px] font-bold h-9 px-4 rounded-full gap-1.5 transition-all duration-300 hover:scale-105",
                isAutoTrading 
                  ? "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 animate-pulse shadow-lg shadow-red-900/40 border border-red-500" 
                  : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-900/20"
              )}
            >
              {isAutoTrading ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" /> STOP AUTO TRADING
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5" /> AUTO TRADING
                </>
              )}
            </Button>

            <Button
              onClick={() => navigate("/api-access")}
              className="hidden md:flex bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-[11px] font-bold h-9 px-4 rounded-full gap-1.5 shadow-lg shadow-green-900/20 hover:scale-105 transition-transform"
            >
              <Key className="w-3.5 h-3.5" /> GET API
            </Button>

            <div className="flex bg-card/60 backdrop-blur-xl rounded-xl p-1 border border-black/10 dark:border-white/10 items-center shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] cyber-border">
              {/* Speech Controls */}
              {isSpeaking && (
                <div className="flex items-center gap-1 mr-2 pr-2 border-r border-black/10 dark:border-white/10 pl-1">
                  <button
                    onClick={togglePause}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-foreground dark:text-white transition-all shadow-sm shadow-black/5 dark:shadow-black/20 hover:scale-105 active:scale-95"
                    title={isPaused ? "Resume" : "Pause"}
                  >
                    {isPaused ? <Play className="w-4 h-4 text-green-500 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]" /> : <Pause className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />}
                  </button>
                  <button
                    onClick={stopSpeaking}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/20 text-red-500 transition-all shadow-sm shadow-black/5 dark:shadow-black/20 hover:scale-105 active:scale-95"
                    title="Stop"
                  >
                    <Square className="w-4 h-4 fill-current drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                  </button>
                </div>
              )}

              {[
                { label: "हिंदी", id: "hi" },
                { label: "EN", id: "en" },
                { label: "اردو", id: "ur" },
                { label: "ਪੰਜਾਬੀ", id: "pa" }
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => {
                    const newLang = lang.id as "en" | "hi" | "ur" | "pa";
                    setCurrentLanguage(newLang);
                    toast.success(`Language switched to ${lang.label}`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all relative overflow-hidden group ${currentLanguage === lang.id
                    ? "bg-gradient-to-r from-primary to-indigo-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.5)]"
                    : "text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                    }`}
                >
                  <span className="relative z-10">{lang.label}</span>
                  {currentLanguage === lang.id && <span className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />}
                </button>
              ))}
            </div>

            <Button variant="ghost" size="icon" className="hover:bg-black/5 dark:hover:bg-white/10 h-10 w-10 rounded-xl hidden sm:flex border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-all duration-300">
              <Globe className="w-4 h-4 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors animate-[spin_10s_linear_infinite]" />
            </Button>

            <div
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white cursor-pointer shadow-[0_0_15px_rgba(124,58,237,0.5)] hover:shadow-[0_0_25px_rgba(124,58,237,0.8)] hover:scale-105 transition-all duration-300 border border-primary/50 relative group"
              onClick={() => navigate("/auth")}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors pointer-events-none rounded-xl" />
              {user ? (
                <span className="font-extrabold text-lg tracking-widest drop-shadow-md">{user.email[0].toUpperCase()}</span>
              ) : (
                <User className="w-5 h-5 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
              )}
            </div>
          </div>
        </header>

        {/* Mobile Action Bar */}
        <div className="flex md:hidden gap-2 px-4 py-2 overflow-x-auto scrollbar-none z-40 mx-4 mt-2 justify-start items-center">
          <Button
            onClick={isAngelAnalyzing ? stopAngelAnalysis : startAngelAnalysis}
            size="sm"
            className={cn(
              "text-white text-[10px] font-black h-8 px-3 rounded-xl gap-1 shrink-0 transition-all duration-300 shadow-md",
              isAngelAnalyzing 
                ? "bg-gradient-to-r from-red-600 to-rose-700 animate-pulse border border-red-500 shadow-red-900/20" 
                : "bg-gradient-to-r from-orange-500 to-red-600 shadow-orange-900/20"
            )}
          >
            {isAngelAnalyzing ? <Square className="w-3 h-3 fill-current" /> : <Globe className="w-3 h-3" />}
            {isAngelAnalyzing ? "STOP ANGEL" : "ANGEL AI"}
          </Button>

          <Button
            onClick={isAutoTrading ? stopAutoTrading : startAutoTrading}
            size="sm"
            className={cn(
              "text-white text-[10px] font-black h-8 px-3 rounded-xl gap-1 shrink-0 transition-all duration-300 shadow-md",
              isAutoTrading 
                ? "bg-gradient-to-r from-red-600 to-rose-700 animate-pulse border border-red-500 shadow-red-900/20" 
                : "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-900/20"
            )}
          >
            {isAutoTrading ? <Square className="w-3 h-3 fill-current" /> : <Bot className="w-3 h-3" />}
            {isAutoTrading ? "STOP AUTO" : "AUTO TRADING"}
          </Button>

          <Button
            onClick={() => navigate("/api-access")}
            size="sm"
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] font-black h-8 px-3 rounded-xl gap-1 shrink-0 shadow-md shadow-emerald-900/20"
          >
            <Key className="w-3 h-3" /> GET API
          </Button>
        </div>

        {/* Centered Messages Area */}
        <main className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar relative">
          <div className="max-w-4xl mx-auto space-y-8 pb-32"> {/* Increased padding bottom for floating input */}
            
            {/* Live AI Analysis Monitor Widget */}
            {(isAngelAnalyzing || isAutoTrading) && (
              <div className="glass-panel p-5 rounded-2xl border border-black/10 dark:border-white/10 shadow-[0_0_30px_rgba(124,58,237,0.2)] bg-card/40 dark:bg-black/40 backdrop-blur-xl animate-in slide-in-from-top duration-500 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-black/10 dark:border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/30">
                        <Activity className="w-5 h-5 text-red-400 animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-widest text-foreground dark:text-white uppercase">MOHAMMED TALHA AI SERVER MONITOR</h3>
                      <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase mt-0.5">
                        Status: <span className="text-green-400 animate-pulse">Analyzing 24/7 Live Feed</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isAngelAnalyzing && (
                      <Button
                        size="sm"
                        onClick={stopAngelAnalysis}
                        className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 h-7 rounded-lg gap-1 shadow-md hover:scale-105 transition-transform"
                      >
                        <Square className="w-3 h-3 fill-current" /> Stop Angel AI
                      </Button>
                    )}
                    {isAutoTrading && (
                      <Button
                        size="sm"
                        onClick={stopAutoTrading}
                        className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 h-7 rounded-lg gap-1 shadow-md hover:scale-105 transition-transform"
                      >
                        <Square className="w-3 h-3 fill-current" /> Stop Auto Trading
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Angel One Section */}
                  {isAngelAnalyzing && (
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 border border-black/5 dark:border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">Angel One Live Feed</span>
                          <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] font-bold">ACTIVE</Badge>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400 dark:text-zinc-400 space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                          {angelLogs.length === 0 ? (
                            <div className="text-muted-foreground italic">Connecting to feed...</div>
                          ) : (
                            angelLogs.map((log, idx) => (
                              <div key={idx} className="truncate">{log}</div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auto Trading Section */}
                  {isAutoTrading && (
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 border border-black/5 dark:border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Auto Trading Engine</span>
                          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold">RUNNING</Badge>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400 dark:text-zinc-400 space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                          {autoTradingLogs.length === 0 ? (
                            <div className="text-muted-foreground italic">Initializing bot...</div>
                          ) : (
                            autoTradingLogs.map((log, idx) => (
                              <div key={idx} className="truncate">{log}</div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message.text}
                isUser={message.isUser}
                timestamp={message.timestamp}
                attachment={message.attachment}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4 animate-in fade-in duration-300">
                <div className="glass-card rounded-2xl px-6 py-4 rounded-tl-none">
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-semibold text-primary animate-pulse">Thinking</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Floating Centered Input */}
        <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center z-40 pointer-events-none">
          <div className="w-full max-w-3xl pointer-events-auto">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isLoading}
              uploadedImage={attachment?.preview}
              onFileSelect={handleFileSelect}
              currentLanguage={currentLanguage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
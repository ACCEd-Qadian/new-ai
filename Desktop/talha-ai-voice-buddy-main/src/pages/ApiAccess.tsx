import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Bot,
    ArrowLeft,
    Key,
    ShieldCheck,
    Zap,
    BarChart3,
    Clock,
    CheckCircle2,
    Copy,
    Trash2,
    Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApiKey {
    key: string;
    created_at: string;
    name: string;
}

const ApiAccess = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<"landing" | "success">("landing");
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [savedKeys, setSavedKeys] = useState<ApiKey[]>([]);

    useEffect(() => {
        const savedUser = localStorage.getItem("google_user");
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            loadKeys(parsedUser);
        }
    }, []);

    const loadKeys = async (currentUser: any) => {
        let dbKeys: ApiKey[] = [];
        let localKeys: ApiKey[] = [];

        // 1. Try fetching from DB
        try {
            const { data, error } = await supabase
                .from('api_keys' as any)
                .select('*')
                .eq('user_email', currentUser.email)
                .order('created_at', { ascending: false });

            if (!error && data) {
                dbKeys = (data as any[]).map(k => ({
                    key: k.key_value,
                    created_at: k.created_at,
                    name: k.name || `API Key`
                }));
            }
        } catch (e) {
            console.error("DB Fetch failed", e);
        }

        // 2. Fetch from Local Storage
        const saved = localStorage.getItem(`api_keys_${currentUser.sub}`);
        if (saved) {
            localKeys = JSON.parse(saved);
        }

        // 3. Merge (removing duplicates by key)
        const allKeys = [...dbKeys];
        localKeys.forEach(lk => {
            if (!allKeys.find(dk => dk.key === lk.key)) {
                allKeys.push(lk);
            }
        });

        // Sort by date desc
        allKeys.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setSavedKeys(allKeys);
    };

    const handleGoogleLogin = () => {
        navigate("/auth");
    };

    const handleCreateApiClick = async () => {
        if (!user) {
            navigate("/auth");
            return;
        }

        setLoading(true);
        // Generate key
        const randomStr = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
        const newKey = `talha_live_${randomStr}`;
        const keyName = `API Key ${savedKeys.length + 1}`;

        try {
            // Try Saving to Real Database
            const { error } = await supabase
                .from('api_keys' as any)
                .insert([
                    {
                        user_email: user.email,
                        key_value: newKey,
                        name: keyName
                    }
                ]);

            if (error) throw error;
            toast.success("New API Key Generated & Saved to DB!");

        } catch (error: any) {
            console.error("Database error, falling back to local storage:", error);
            // Fallback: Save to Local Storage
            const newKeyObj = {
                key: newKey,
                created_at: new Date().toISOString(),
                name: keyName
            };
            const updatedKeys = [...savedKeys, newKeyObj];
            // We don't setSavedKeys here because loadKeys or the next lines will handle it, 
            // but we must save to LS so it persists.
            localStorage.setItem(`api_keys_${user.sub}`, JSON.stringify(updatedKeys));
            toast.success("New API Key Generated (Local Storage)");
        }

        setApiKey(newKey);
        // Reload keys (will fetch from DB or LS)
        loadKeys(user);
        setStep("success");
        setLoading(false);
    };

    const handleDeleteKey = async (keyToDelete: string) => {
        // 1. Try DB Delete
        try {
            await supabase
                .from('api_keys' as any)
                .delete()
                .eq('key_value', keyToDelete);
        } catch (e) {
            console.error("DB Delete failed", e);
        }

        // 2. Always update Local Storage
        const saved = localStorage.getItem(`api_keys_${user.sub}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            const filtered = parsed.filter((k: ApiKey) => k.key !== keyToDelete);
            localStorage.setItem(`api_keys_${user.sub}`, JSON.stringify(filtered));
        }

        // 3. Update UI
        setSavedKeys(prev => prev.filter(k => k.key !== keyToDelete));
        toast.success("API Key Deleted");
    };

    if (step === "success") {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans text-center">
                <div className="max-w-md w-full bg-card border border-border rounded-3xl p-10 space-y-8 shadow-2xl">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black">API Generated!</h2>
                        <p className="text-muted-foreground text-sm font-medium">Your new key is ready to use.</p>
                    </div>

                    <div className="bg-secondary p-5 rounded-2xl space-y-3 relative overflow-hidden group">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Secret API Key</p>
                        <div className="font-mono text-sm break-all font-bold bg-background/50 p-4 rounded-xl border border-border text-green-600">
                            {apiKey}
                        </div>
                        <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:text-blue-700 font-bold transition-all group-hover:bg-blue-600/5" onClick={() => {
                            navigator.clipboard.writeText(apiKey);
                            toast.success("Key copied!");
                        }}>
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Copy Key
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <Button onClick={() => setStep("landing")} className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-xl">
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Header */}
            <header className="p-4 lg:px-12 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
                <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Chat
                </Button>
                {user && (
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-foreground">{user.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{user.email}</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                            {user.email?.[0].toUpperCase()}
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 pb-2">
                        Developer API Dashboard
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Manage your API keys and integrate Mohammed Talha AI into your applications.
                    </p>
                </div>

                {!user ? (
                    <div className="flex flex-col items-center gap-6 py-12">
                        <div className="p-10 bg-secondary/30 rounded-3xl border border-border text-center max-w-md">
                            <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Login Required</h3>
                            <p className="text-muted-foreground mb-6">Please login with Google to create and manage your API keys.</p>
                            <Button onClick={handleGoogleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-12">
                                Login with Google
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Create New Key Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/20 h-full flex flex-col">
                                <div className="p-3 bg-white/10 rounded-2xl w-fit mb-6">
                                    <Key className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Create New API</h3>
                                <p className="text-blue-100 text-sm mb-8 leading-relaxed">
                                    Generate a secure unique key to access the AI models programmatically.
                                </p>
                                <div className="mt-auto">
                                    <Button
                                        onClick={handleCreateApiClick}
                                        disabled={loading}
                                        className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold h-12 rounded-xl border border-white/20 transition-all hover:scale-[1.02]"
                                    >
                                        {loading ? <Clock className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                        {loading ? "Generating..." : "Generate Key"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Keys List */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                    Active API Keys
                                </h3>
                                <Badge variant="outline" className="font-mono">
                                    {savedKeys.length} Keys
                                </Badge>
                            </div>

                            <div className="space-y-4">
                                {savedKeys.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                                        <p className="text-muted-foreground font-medium">No API keys found. Create one to get started.</p>
                                    </div>
                                ) : (
                                    savedKeys.map((k, i) => (
                                        <div key={i} className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 group hover:shadow-lg transition-all hover:border-blue-500/30">
                                            <div className="p-3 bg-secondary rounded-lg">
                                                <Key className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-sm">{k.name}</span>
                                                    <Badge variant="secondary" className="text-[10px] h-5">ACTIVE</Badge>
                                                </div>
                                                <div className="font-mono text-xs text-muted-foreground truncate opacity-70">
                                                    {k.key}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 hover:bg-white/5"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(k.key);
                                                        toast.success("Key copied");
                                                    }}
                                                >
                                                    <Copy className="w-4 h-4 text-muted-foreground" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 hover:bg-red-500/10 hover:text-red-500"
                                                    onClick={() => handleDeleteKey(k.key)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ApiAccess;

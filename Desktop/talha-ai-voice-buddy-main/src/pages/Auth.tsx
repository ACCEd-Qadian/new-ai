import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Bot, LogIn } from "lucide-react";
import { toast } from "sonner";

interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

const AuthContent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem("google_user");
    if (savedUser) {
      navigate("/");
    }
  }, [navigate]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        // Fetch user info from Google API
        const userInfoResponse = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );
        const userInfo = await userInfoResponse.json();

        const user: GoogleUser = {
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
          sub: userInfo.sub,
        };

        localStorage.setItem("google_user", JSON.stringify(user));
        localStorage.setItem("google_token", tokenResponse.access_token);

        toast.success(`Welcome ${user.name}! 🎉`);
        setTimeout(() => navigate("/"), 500);
      } catch (error) {
        console.error("User info error:", error);
        toast.error("Login successful but failed to get user info");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error("Google login failed");
      setLoading(false);
    }
  });

  const handleGuestMode = () => {
    localStorage.removeItem("google_user");
    localStorage.removeItem("google_token");
    navigate("/");
    toast.success("Guest mode में चल रहे हैं - चैट history save नहीं होगी");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-primary to-purple-600 rounded-2xl shadow-xl shadow-primary/20 animate-glow">
              <Bot className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase text-glow">
              TALHA AI LOGIN
            </h1>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed">
              नमस्ते! मैं मोहम्मद तल्हा एआई हूँ<br />
              Hello! I'm Mohammed Talha AI
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 shadow-2xl space-y-6">
          <Button
            onClick={() => login()}
            disabled={loading}
            className="w-full h-14 text-base bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 gap-3 transition-all active:scale-[0.98] border border-white/10"
            size="lg"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? "Connecting..." : "Continue with Google"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest text-muted-foreground">
              <span className="bg-card px-3">or</span>
            </div>
          </div>

          <Button
            onClick={handleGuestMode}
            variant="ghost"
            className="w-full h-14 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-xl transition-all"
            size="lg"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Continue as Guest
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground font-medium leading-relaxed opacity-60">
          Google login से आपकी chat history save होगी<br />
          Guest mode में temporary session रहेगा
        </p>
      </div>
    </div>
  );
};

const Auth = () => {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Configuration Error</h1>
          <p className="text-muted-foreground">
            Please add VITE_GOOGLE_CLIENT_ID to your .env file
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContent />
    </GoogleOAuthProvider>
  );
};

export default Auth;
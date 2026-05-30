# Google OAuth Setup Guide for "Continue with Google"

## Step 1: Get Your Google OAuth Credentials

1. Google Cloud Console mein jaayen: https://console.cloud.google.com/
2. Apna "Continue with Google" project select karein
3. Left sidebar mein: **APIs & Services** > **Credentials**
4. Apne OAuth 2.0 Client ID par click karein
5. Client ID aur Client Secret copy karein

## Step 2: Configure Redirect URIs

Google Cloud Console mein:
- **Authorized JavaScript origins**: 
  - http://localhost:8080
  - http://localhost:5173
  
- **Authorized redirect URIs**:
  - http://localhost:8080/auth/callback
  - http://localhost:5173/auth/callback

## Step 3: Environment Variables Setup

Project root mein `.env.local` file banaye aur yeh add karein:

```env
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_client_secret_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

## Step 4: Required npm packages

```bash
npm install @react-oauth/google jwt-decode
```

Yeh packages install karne ke baad main code update kar dunga.

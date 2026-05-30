import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language } = await req.json();
    console.log(`Chat request received: ${messages.length} messages, Language: ${language}`);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is missing in Supabase secrets." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get real-time date and time
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const languageNames: Record<string, string> = {
      hi: "Hindi",
      en: "English",
      ur: "Urdu",
      pa: "Punjabi"
    };
    const targetLang = languageNames[language] || "Hindi";
    console.log(`NUCLEAR FIX: targetLang=${targetLang}, inputLanguage=${language}`);

    // Ultra-aggressive system prompt with multiple layers
    const systemPrompt = `YOU ARE MOHAMMED TALHA AI - CREATED BY MOHAMMED TALHA

ABSOLUTE LANGUAGE RULE - NON-NEGOTIABLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPOND IN: ${targetLang.toUpperCase()} ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL INSTRUCTIONS:
1. You MUST write EVERY SINGLE WORD in ${targetLang}
2. IGNORE the language of user's input - ONLY use ${targetLang}
3. If previous messages were in other languages, FORGET THEM and use ${targetLang}
4. Even if user writes in Hindi/English/Urdu/Punjabi, you MUST reply in ${targetLang}
5. Use proper script for reading: English(Latin), Hindi(Devanagari), Urdu(Arabic), Punjabi(Gurmukhi)
6. CRITICAL FOR TTS: Absolutely DO NOT use any Markdown formatting, bolding (**), asterisks, hashes, brackets, or special symbols. Write completely text-only conversational output so the voice engine can read it clearly without crashing.

GREETING RESPONSE:
If user says "hello" or "hi", respond with this EXACT meaning in ${targetLang}:
"I am Mohammed Talha AI, created by Mohammed Talha"

FAILURE TO FOLLOW = SYSTEM ERROR`;

    console.log(`Setting up Gemini contents for ${targetLang}`);

    const system_instruction = {
      parts: [{ text: systemPrompt }]
    };

    const contents = messages.map((m: any, index: number) => {
      const role = m.role === "assistant" ? "model" : "user";
      let parts: any[] = [];

      let text = "";
      if (typeof m.content === "string") {
        text = m.content;
      } else if (Array.isArray(m.content)) {
        const textPart = m.content.find((p: any) => p.type === "text");
        text = textPart?.text || "";

        // Check for image_url parts (from OpenAI style messages)
        const imagePart = m.content.find((p: any) => p.type === "image_url");
        if (imagePart && imagePart.image_url?.url) {
          const url = imagePart.image_url.url;
          const mimeType = url.split(";")[0].split(":")[1];
          const data = url.split(",")[1];
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: data
            }
          });
        }
      }

      // Add aggressive language prefix to EVERY user message
      if (role === "user") {
        console.log(`Adding language enforcement to user message`);
        text = `[RESPOND IN ${targetLang.toUpperCase()} ONLY - NO EXCEPTIONS]\n${text}`;
      }

      parts.unshift({ text: text });

      return {
        role: role,
        parts: parts
      };
    });

    console.log(`Making hyper-strict request for ${targetLang}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction,
          contents,
          generationConfig: {
            temperature: 0.0, // Absolute zero for maximum instruction following
            topK: 1,
            topP: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: "text/plain",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", response.status, errorData);
      return new Response(
        JSON.stringify({ error: errorData.error?.message || "Gemini API Error" }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Transform Gemini SSE stream to standard SSE stream that the frontend expects
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body?.getReader();

    if (reader) {
      (async () => {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6);
                try {
                  const data = JSON.parse(jsonStr);
                  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (content) {
                    // Send in the format the frontend expects: data: {"choices": [{"delta": {"content": "..."}}]}
                    const output = {
                      choices: [{
                        delta: { content: content }
                      }]
                    };
                    await writer.write(encoder.encode(`data: ${JSON.stringify(output)}\n\n`));
                  }
                } catch (e) {
                  console.error("Error parsing Gemini stream:", e);
                }
              }
            }
          }
          await writer.write(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Stream processing error:", err);
        } finally {
          writer.close();
        }
      })();
    }

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("Chat function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

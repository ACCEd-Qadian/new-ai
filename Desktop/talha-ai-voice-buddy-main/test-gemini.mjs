const GEMINI_KEY = "AIzaSyDkOBbY-wLYmqPfZK0dzTRFhe_g3JnlKOE";
const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];

async function testModel(model, lang, text) {
    const langMapFull = { hi: "HINDI", en: "ENGLISH", ur: "URDU", pa: "PUNJABI" };
    const scriptMap = { hi: "Devanagari", en: "Latin", ur: "Nastaliq/Arabic", pa: "Gurmukhi" };
    const fullLang = langMapFull[lang];
    const langScript = scriptMap[lang];
    const systemText = `You are Mohammed Talha AI. STRICTLY respond ONLY in ${fullLang} (${langScript}). No Markdown, no emojis, plain text only.`;
    const contents = [{ role: "user", parts: [{ text: `[SYSTEM: ${systemText}]\n\n${text}` }] }];

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents, generationConfig: { temperature: 0.3, maxOutputTokens: 150 } })
        }
    );

    if (!response.ok) {
        const err = await response.json();
        return `ERROR ${response.status}: ${err.error?.status}`;
    }
    const json = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No response";
}

async function main() {
    console.log("=== Testing New Key: AIzaSyDkOBbY-wLYmqPfZK0dzTRFhe_g3JnlKOE ===\n");
    for (const model of MODELS) {
        console.log(`\n--- Model: ${model} ---`);
        for (const lang of ["hi", "ur", "pa", "en"]) {
            const result = await testModel(model, lang, "hello");
            console.log(`  [${lang.toUpperCase()}]: ${result}`);
        }
    }
}

main();

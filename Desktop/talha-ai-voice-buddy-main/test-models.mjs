const GEMINI_KEY = "AIzaSyDkOBbY-wLYmqPfZK0dzTRFhe_g3JnlKOE";

async function test(model) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] })
    });
    const json = await res.json();
    console.log(`Model ${model}: ${res.status} - ${json.candidates?.[0]?.content?.parts?.[0]?.text || json.error?.message}`);
  } catch (e) {
    console.log(`Model ${model} Error: ${e.message}`);
  }
}

async function run() {
  await test("gemini-flash-lite-latest");
}
run();

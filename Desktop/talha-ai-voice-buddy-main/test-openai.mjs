const key = "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";

async function test() {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }]
    })
  });
  const json = await res.json();
  console.log(`OpenAI: ${res.status} - ${json.choices?.[0]?.message?.content || json.error?.message}`);
}
test();

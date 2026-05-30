const GEMINI_KEY = "AIzaSyDkOBbY-wLYmqPfZK0dzTRFhe_g3JnlKOE";

async function run() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
  const json = await res.json();
  const models = json.models.filter(m => m.name.includes("flash") || m.name.includes("latest")).map(m => m.name);
  console.log(models);
}
run();

// Free API: https://api.mymemory.translated.net/get?q=TEXT&langpair=FROM|TO
const BASE = "https://api.mymemory.translated.net/get";

// Elements
const themeBtn = document.getElementById("themeBtn");
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const srcEl = document.getElementById("source");
const dstEl = document.getElementById("target");
const countEl = document.getElementById("count");
const translateBtn = document.getElementById("translateBtn");
const clearBtn = document.getElementById("clearBtn");
const swapBtn = document.getElementById("swap");
const copyBtn = document.getElementById("copyBtn");
const speakBtn = document.getElementById("speakBtn");
const downloadBtn = document.getElementById("downloadBtn");
const errorEl = document.getElementById("error");
const statusEl = document.getElementById("status");
const historyEl = document.getElementById("history");
const clearHistoryBtn = document.getElementById("clearHistory");

// ===== Theme =====
(function initTheme(){
  const saved = localStorage.getItem("tr-theme");
  if (saved === "light"){ document.documentElement.classList.add("light"); themeBtn.textContent = "🌚"; }
  else themeBtn.textContent = "🌙";
})();
themeBtn.addEventListener("click", ()=>{
  const r = document.documentElement;
  r.classList.toggle("light");
  const light = r.classList.contains("light");
  themeBtn.textContent = light ? "🌚" : "🌙";
  localStorage.setItem("tr-theme", light ? "light" : "dark");
});

// ===== Helpers =====
function showError(msg){
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
  setTimeout(()=> errorEl.classList.add("hidden"), 3500);
}
function setStatus(msg){ statusEl.textContent = msg || "—"; }

// simple language guess (for "auto")
function guessLang(s){
  if (/[ғқҳўЁёҚқҒғЎўА-Яа-я]/.test(s)) return s.match(/[ғқҳў]/i) ? "uz" : "ru";
  if (/\p{Script=Arabic}/u.test(s)) return "ar";
  if (/[\u4E00-\u9FFF]/.test(s)) return "zh-CN";
  if (/[\u3040-\u30FF]/.test(s)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(s)) return "ko";
  if (/[ğüşöçıİ]/i.test(s)) return "tr";
  return "en";
}

function limit500() {
  const s = srcEl.value;
  if (s.length > 500) srcEl.value = s.slice(0, 500);
  countEl.textContent = srcEl.value.length;
}

// History (localStorage)
const HKEY = "tr-history";
function getHistory(){ try { return JSON.parse(localStorage.getItem(HKEY) || "[]"); } catch { return []; } }
function setHistory(arr){ localStorage.setItem(HKEY, JSON.stringify(arr.slice(0,20))); renderHistory(); }
function addHistory(item){
  const list = getHistory();
  list.unshift(item);
  setHistory(list);
}
function renderHistory(){
  const list = getHistory();
  historyEl.innerHTML = list.map(i => `
    <li>
      <div class="meta">${i.from} → ${i.to} • ${new Date(i.ts).toLocaleTimeString()}</div>
      <div><b>${escapeHTML(i.src)}</b></div>
      <div class="muted" style="margin-top:6px">${escapeHTML(i.dst)}</div>
    </li>
  `).join("") || `<li class="muted">Empty</li>`;
}
function escapeHTML(s=""){ return s.replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }
renderHistory();

// ===== Translate =====
async function translate(){
  const text = srcEl.value.trim();
  if (!text){ showError("Matn kiriting."); return; }

  // langpair
  let from = fromEl.value;
  const to = toEl.value;
  if (from === to){ showError("From va To bir xil. Boshqacha tanlang."); return; }

  if (from === "auto") from = guessLang(text);

  setStatus("Translating…");
  try{
    const url = new URL(BASE);
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", `${from}|${to}`);

    const res = await fetch(url.toString());
    const data = await res.json();

    // best translation: pick highest match if available
    let out = data?.responseData?.translatedText || "";
    if (Array.isArray(data?.matches) && data.matches.length){
      const best = data.matches.reduce((a,b)=> (b.match > (a?.match||0) ? b : a), null);
      if (best?.translation) out = best.translation;
    }

    dstEl.value = out;
    setStatus(`OK • ${from} → ${to}`);

    addHistory({ from, to, src: text, dst: out, ts: Date.now() });
  }catch(e){
    showError("API xatosi yoki tarmoq muammosi.");
  }
}

// ===== UI actions =====
srcEl.addEventListener("input", limit500);
limit500();

translateBtn.addEventListener("click", translate);
clearBtn.addEventListener("click", ()=>{ srcEl.value=""; dstEl.value=""; limit500(); setStatus("—"); });

swapBtn.addEventListener("click", ()=>{
  // swap selects
  const a = fromEl.value; fromEl.value = toEl.value; toEl.value = a;
  // move text
  if (dstEl.value){ srcEl.value = dstEl.value; dstEl.value = ""; }
  limit500();
});

copyBtn.addEventListener("click", async ()=>{
  const text = dstEl.value || srcEl.value;
  try{ await navigator.clipboard.writeText(text); setStatus("Copied."); }catch{}
});

speakBtn.addEventListener("click", ()=>{
  const text = (dstEl.value || "").trim();
  if (!text || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  // set best-effort voice by lang
  const langMap = { "uz":"uz-UZ", "ru":"ru-RU", "tr":"tr-TR", "de":"de-DE", "fr":"fr-FR", "es":"es-ES", "it":"it-IT", "ar":"ar-SA", "hi":"hi-IN", "ja":"ja-JP", "ko":"ko-KR", "zh-CN":"zh-CN", "en":"en-US" };
  u.lang = langMap[toEl.value] || "en-US";
  window.speechSynthesis.speak(u);
});

downloadBtn.addEventListener("click", ()=>{
  const blob = new Blob([dstEl.value || ""], {type:"text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `translation_${Date.now()}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
});

document.querySelectorAll(".chip").forEach(b=>{
  b.addEventListener("click", ()=>{ srcEl.value = b.dataset.text; limit500(); translate(); });
});

clearHistoryBtn.addEventListener("click", ()=> setHistory([]));

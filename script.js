let selectedPlatform = "";
const message = document.getElementById("message");
const urlInput = document.getElementById("url");
const downloadBtn = document.getElementById("download");

document.querySelectorAll(".platforms button").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedPlatform = btn.dataset.platform;
    document.querySelectorAll(".platforms button").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    message.className = "";
    message.textContent = selectedPlatform + " selected.";
  });
});

const allowed = {
  Instagram: ["instagram.com", "www.instagram.com"],
  YouTube: ["youtube.com", "www.youtube.com", "youtu.be", "www.youtu.be", "m.youtube.com"],
  Facebook: ["facebook.com", "www.facebook.com", "fb.watch", "www.fb.watch", "m.facebook.com"]
};

downloadBtn.addEventListener("click", () => {
  const url = urlInput.value.trim();
  if (!selectedPlatform) return show("Please select Instagram, YouTube, or Facebook first.", true);
  if (!url) return show("Please paste a video URL first.", true);

  let parsed;
  try { parsed = new URL(url); } catch { return show("Please enter a valid video URL.", true); }
  if (parsed.protocol !== "https:" || !allowed[selectedPlatform].includes(parsed.hostname.toLowerCase())) {
    return show("This URL does not match the selected platform.", true);
  }

  // Normal browser navigation lets the server stream the file directly to the download manager,
  // avoiding a large in-memory Blob and making large downloads much more reliable on mobile.
  const endpoint = "/api/download?platform=" + encodeURIComponent(selectedPlatform) + "&url=" + encodeURIComponent(url);
  message.className = "";
  message.textContent = "Starting download…";
  window.location.assign(endpoint);
  setTimeout(() => show("If the download did not start, check whether the video is public and downloadable.", false), 1800);
});

urlInput.addEventListener("keydown", e => { if (e.key === "Enter") downloadBtn.click(); });
function show(text, error) { message.textContent = text; message.className = error ? "error" : "success"; }

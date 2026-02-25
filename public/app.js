(function () {
  const fileInput = document.getElementById("file");
  const parseBtn = document.getElementById("parseBtn");
  const statusEl = document.getElementById("status");
  const warningsEl = document.getElementById("warnings");
  const statsEl = document.getElementById("stats");
  const resultsSection = document.getElementById("results");
  const previewBody = document.getElementById("previewBody");
  const downloadBtn = document.getElementById("downloadBtn");

  let lastResult = null;

  fileInput.addEventListener("change", function () {
    parseBtn.disabled = !fileInput.files || fileInput.files.length === 0;
    if (!fileInput.files?.length) {
      resultsSection.hidden = true;
      lastResult = null;
    }
  });

  parseBtn.addEventListener("click", async function () {
    const file = fileInput.files?.[0];
    if (!file) return;

    statusEl.textContent = "Parsing…";
    statusEl.className = "status loading";
    warningsEl.textContent = "";
    warningsEl.innerHTML = "";
    statsEl.textContent = "";
    resultsSection.hidden = true;
    lastResult = null;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        statusEl.textContent = data.error || "Parse failed";
        statusEl.className = "status error";
        return;
      }

      lastResult = data;
      statusEl.textContent = "Done.";
      statusEl.className = "status success";

      if (data.warnings && data.warnings.length > 0) {
        const ul = document.createElement("ul");
        data.warnings.forEach(function (w) {
          const li = document.createElement("li");
          li.textContent = w;
          ul.appendChild(li);
        });
        warningsEl.appendChild(ul);
      }

      if (data.stats) {
        const s = data.stats;
        statsEl.textContent =
          "Found " +
          s.totalFound +
          " pair(s), kept " +
          s.kept +
          ", duplicates removed: " +
          s.duplicatesRemoved +
          (s.skippedLines ? ", skipped lines: " + s.skippedLines : "") +
          (s.truncatedSynonyms ? ", truncated synonyms: " + s.truncatedSynonyms : "") +
          ".";
      }

      if (data.pairs && data.pairs.length > 0) {
        previewBody.innerHTML = "";
        data.pairs.forEach(function (p) {
          const tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" +
            escapeHtml(p.word) +
            "</td><td>" +
            escapeHtml(p.translation1) +
            "</td><td>" +
            (p.translation2 ? escapeHtml(p.translation2) : "—") +
            "</td>";
          previewBody.appendChild(tr);
        });
        resultsSection.hidden = false;
      } else {
        resultsSection.hidden = true;
      }
    } catch (err) {
      statusEl.textContent = "Error: " + (err.message || "Network error");
      statusEl.className = "status error";
    }
  });

  downloadBtn.addEventListener("click", function () {
    if (!lastResult || !lastResult.txt) return;
    const blob = new Blob([lastResult.txt], { type: "text/plain; charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vocabulary.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
})();

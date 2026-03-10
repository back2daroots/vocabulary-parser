let previousBlobUrl = null;

document.getElementById("convert-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("file");
    const modeSelect = document.getElementById("mode");
    const submitBtn = document.getElementById("submit-btn");
    const messageEl = document.getElementById("message");
    const resultsEl = document.getElementById("results");
    const downloadLink = document.getElementById("download-link");

    const file = fileInput.files?.[0];
    if (!file) {
        showMessage("Please select a file.", "error");
        return;
    }

    messageEl.hidden = true;
    resultsEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Converting…";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", modeSelect.value);

    try {
        const res = await fetch("/api/convert", {
            method: "POST",
            body: formData,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showMessage(data.detail || `Error ${res.status}`, "error");
            return;
        }

        document.getElementById("pairs-count").textContent = data.pairs_count ?? 0;
        document.getElementById("skipped-count").textContent = data.skipped_count ?? 0;
        document.getElementById("preview").textContent = data.preview || "(empty)";

        // Create blob from file content and trigger download (no second request)
        const content = data.file_content ?? "";
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        if (previousBlobUrl) {
            URL.revokeObjectURL(previousBlobUrl);
        }
        previousBlobUrl = URL.createObjectURL(blob);
        downloadLink.href = previousBlobUrl;
        downloadLink.download = "vocabulary.txt";
        downloadLink.click();

        resultsEl.hidden = false;
        showMessage("Conversion complete.", "success");
    } catch (err) {
        showMessage(err.message || "Network error.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Convert";
    }
});

function showMessage(text, type) {
    const el = document.getElementById("message");
    el.textContent = text;
    el.className = "message " + type;
    el.hidden = false;
}

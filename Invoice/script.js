/* Invoice script */

/* Helper selectors */
const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
const nf = (n) => (isNaN(n) ? "0.00" : Number(n).toFixed(2));

/* ---------- Recalculate totals (subtotal, tax, discount, grand) ---------- */
function recalc() {
  const rows = $$("#itemsTable tbody tr");
  let subtotal = 0;

  rows.forEach(row => {
    const qty  = parseFloat(row.cells[1].querySelector("input").value) || 0;
    const rate = parseFloat(row.cells[2].querySelector("input").value) || 0;
    const line = qty * rate;
    // write line total
    row.cells[3].textContent = nf(line);
    subtotal += line;
  });

  // percentages
  const taxPct  = parseFloat($("#taxPct")?.value)  || 0;
  const discPct = parseFloat($("#discPct")?.value) || 0;

  const taxAmt  = subtotal * (taxPct / 100);
  const discAmt = subtotal * (discPct / 100);
  const grand   = subtotal + taxAmt - discAmt;

  $("#subtotal").textContent   = nf(subtotal);
  $("#taxAmt").textContent     = nf(taxAmt);
  $("#discAmt").textContent    = nf(discAmt);
  $("#grandTotal").textContent = nf(grand);
}

/* ---------- Add a new item row ---------- */
function addRow() {
  const tbody = $("#itemsTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" placeholder="Service / Product"></td>
    <td><input type="number" min="0" step="1" value="1"></td>
    <td><input type="number" min="0" step="0.01" value="0"></td>
    <td class="line-total">0.00</td>
    <td class="no-print"><button class="btn danger btn-remove">Remove</button></td>
  `;
  tbody.appendChild(tr);
  recalc();
}

/* ---------- Remove row (delegated) ---------- */
function onTableClick(e) {
  if (e.target.classList.contains("btn-remove")) {
    e.target.closest("tr").remove();
    recalc();
  }
}

/* ---------- Clear all rows (keep 1 starter row) ---------- */
function clearRows() {
  $("#itemsTable tbody").innerHTML = "";
  addRow();
  recalc();
}

/* ---------- Print (browser print dialog) ---------- */
function doPrint() {
  // Browser must often have "Print background graphics" checked to preserve background colors.
  // We already set print-color-adjust in CSS; if colors are still missing, the print dialog option must be enabled by the user.
  window.print();
}

/* ---------- Robust PDF download (clones node, sizes for A4, uses html2pdf) ---------- */
async function downloadPDF() {
  // Fallback: if html2pdf not loaded, just print
  if (!window.html2pdf) {
    alert("PDF library not loaded — using Print instead. For direct PDF download ensure you're online.");
    return doPrint();
  }

  // Clone the invoice node so we can adapt its size for A4 without disturbing the page
  const original = $("#invoiceApp");
  const clone = original.cloneNode(true);

  // Add a helper class to the clone to size it for PDF (CSS-free sizing below)
  clone.style.width = "190mm";   // A4 minus small margins
  clone.style.maxWidth = "190mm";
  clone.style.margin = "0 auto";
  clone.style.boxShadow = "none";
  clone.style.borderRadius = "0";
  clone.style.padding = "10mm";

  // Remove buttons and no-print elements from the clone to avoid them being rendered in PDF
  clone.querySelectorAll(".no-print").forEach(el => el.remove());

  // Append clone (off-screen) so html2pdf can render it
  clone.style.position = "fixed";
  clone.style.left = "-9999px";
  document.body.appendChild(clone);

  // html2pdf options tuned to avoid cropping and allow page breaks
  const opt = {
    margin:       10,
    filename:     `${($("#invNo").value || "invoice")}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false, allowTaint: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'] } // better splitting across pages
  };

  try {
    await html2pdf().set(opt).from(clone).save();
  } catch (err) {
    console.error("PDF export error:", err);
    alert("PDF export failed — falling back to Print.");
    doPrint();
  } finally {
    // cleanup
    clone.remove();
  }
}

/* ---------- Logo upload preview ---------- */
function handleLogoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { $("#logo").src = reader.result; };
  reader.readAsDataURL(file);
}

/* ---------- wire events ---------- */
document.addEventListener("input", (e) => {
  // Any input change inside invoice triggers recalculation
  if (e.target.closest(".invoice-app")) recalc();
});

$("#itemsTable").addEventListener("click", onTableClick);
$("#addRow").addEventListener("click", addRow);
$("#clearRows").addEventListener("click", clearRows);
$("#printBtn").addEventListener("click", doPrint);
$("#pdfBtn").addEventListener("click", downloadPDF);
$("#logoUpload").addEventListener("change", handleLogoUpload);

/* ---------- init ---------- */
(function init(){
  // set today's date by default for convenience
  const today = new Date().toISOString().slice(0,10);
  $("#invDate").value ||= today;
  $("#dueDate").value ||= "";

  recalc();
})();

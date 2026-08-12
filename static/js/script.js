document.getElementById("fermon_pos").addEventListener("change", updateFromFermonOld);
document.getElementById("fermon_gene").addEventListener("change", updateFromFermonOld);
document.getElementById("nt").addEventListener("change", updateFromNucleotide);
document.getElementById("new_fermon_gene").addEventListener("change", updateFromCorrected);
document.getElementById("new_fermon_pos").addEventListener("change", updateFromCorrected);
document.getElementById("p_segment").addEventListener("change", updateFromP);
document.getElementById("p_pos").addEventListener("change", updateFromP);
document.getElementById("conversionForm").addEventListener("submit", function (e) {
  e.preventDefault(); // prevent full page reload
});

// Reverse indices built once from lookup.js so any box can resolve its
// counterpart entries in O(1). Earlier (lowest-nt) entries win ties, matching
// lookup.js's ascending nt insertion order.
const fermonIndex = {};
const correctedIndex = {};
const pIndex = {};
for (const key in lookup) {
  const entry = lookup[key];

  const fermonKey = `${entry.fermon.gene}_${entry.fermon.aa}`;
  if (!(fermonKey in fermonIndex)) fermonIndex[fermonKey] = entry;

  const correctedKey = `${entry.corrected.gene}_${entry.corrected.aa}`;
  if (!(correctedKey in correctedIndex)) correctedIndex[correctedKey] = entry;

  if (entry.p) {
    const pKey = `${entry.p.segment}_${entry.p.aa}`;
    if (!(pKey in pIndex)) pIndex[pKey] = entry;
  }
}

// Fills every box from a single resolved lookup entry, keeping all
// annotation schemes in sync regardless of which box triggered the lookup.
function populateFromEntry(entry) {
  document.getElementById("nt").value = entry.nt;
  document.getElementById("fermon_gene").value = entry.fermon.gene;
  document.getElementById("fermon_pos").value = entry.fermon.aa;
  document.getElementById("new_fermon_gene").value = entry.corrected.gene;
  document.getElementById("new_fermon_pos").value = entry.corrected.aa;
  document.getElementById("p_segment").value = entry.p.segment;
  document.getElementById("p_pos").value = entry.p.aa;
}

function describeEntry(entry) {
  const { fermon, corrected, p } = entry;
  const unchanged = fermon.gene === corrected.gene && fermon.aa === corrected.aa;

  let html = `Nucleotide <strong>${entry.nt}</strong> → `;
  html += `<strong>${p.segment} ${p.aa}</strong> → `;
  if (unchanged) {
    html += `<strong>${fermon.gene} ${fermon.aa}</strong> (unchanged)`;
  } else {
    html += `Fermon (GenBank): <strong>${fermon.gene} ${fermon.aa}</strong> → Fermon (Corrected): <strong>${corrected.gene} ${corrected.aa}</strong>`;
  }
  return html;
}

function clearForm() {
  document.getElementById("conversionForm").reset();
  document.getElementById("result").innerText = "";

  // Explicitly clear all manually filled fields
  document.getElementById("nt").value = "";
  document.getElementById("fermon_gene").value = "Select Gene";
  document.getElementById("fermon_pos").value = "";
  document.getElementById("new_fermon_gene").value = "Select Gene";
  document.getElementById("new_fermon_pos").value = "";
  document.getElementById("p_segment").value = "Select Segment";
  document.getElementById("p_pos").value = "";
}

function updateFromNucleotide() {
  const nt = parseInt(document.getElementById("nt").value);
  const resultDiv = document.getElementById("result");
  resultDiv.innerText = "";

  if (isNaN(nt)) return;

  const entry = lookup[`nt_${nt}`];
  if (!entry) {
    resultDiv.innerText = "Nucleotide position not found in lookup.";
    return;
  }

  populateFromEntry(entry);
  resultDiv.innerHTML = describeEntry(entry);
}

function updateFromFermonOld() {
  const gene = document.getElementById("fermon_gene").value;
  const aa = parseInt(document.getElementById("fermon_pos").value);
  const resultDiv = document.getElementById("result");
  resultDiv.innerText = "";

  if (!gene || isNaN(aa)) return;

  const entry = fermonIndex[`${gene}_${aa}`];
  if (!entry) {
    resultDiv.innerText = `Position ${aa} is not found in ${gene}. Please check the input.`;
    return;
  }

  populateFromEntry(entry);
  resultDiv.innerHTML = describeEntry(entry);
}

function updateFromCorrected() {
  const gene = document.getElementById("new_fermon_gene").value;
  const aa = parseInt(document.getElementById("new_fermon_pos").value);
  const resultDiv = document.getElementById("result");
  resultDiv.innerText = "";

  if (!gene || isNaN(aa)) return;

  const entry = correctedIndex[`${gene}_${aa}`];
  if (!entry) {
    resultDiv.innerText = "Corrected gene/AA combination not found. Please provide a valid position.";
    return;
  }

  populateFromEntry(entry);
  resultDiv.innerHTML = describeEntry(entry);
}

function updateFromP() {
  const segment = document.getElementById("p_segment").value;
  const aa = parseInt(document.getElementById("p_pos").value);
  const resultDiv = document.getElementById("result");
  resultDiv.innerText = "";

  if (!segment || isNaN(aa)) return;

  const entry = pIndex[`${segment}_${aa}`];
  if (!entry) {
    resultDiv.innerText = `Position ${aa} is not found in ${segment}. Please check the input.`;
    return;
  }

  populateFromEntry(entry);
  resultDiv.innerHTML = describeEntry(entry);
}

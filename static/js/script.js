document.getElementById("fermon_pos").addEventListener("change", updateFromFermonOld);
document.getElementById("fermon_gene").addEventListener("change", updateFromFermonOld);
document.getElementById("nt").addEventListener("change", updateFromNucleotide);
document.getElementById("new_fermon_gene").addEventListener("change", updateFromCorrected);
document.getElementById("new_fermon_pos").addEventListener("change", updateFromCorrected);
document.getElementById("conversionForm").addEventListener("submit", function (e) {
  e.preventDefault(); // prevent full page reload
});

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

  const { fermon, corrected } = entry;

  document.getElementById("fermon_gene").value = fermon.gene;
  document.getElementById("fermon_pos").value = fermon.aa;
  document.getElementById("new_fermon_gene").value = corrected.gene;
  document.getElementById("new_fermon_pos").value = corrected.aa;

  if (fermon.gene === corrected.gene && fermon.aa === corrected.aa) {
    resultDiv.innerText = `nt ${nt} → ${fermon.gene} ${fermon.aa} (unchanged)`;
  } else {
    resultDiv.innerText = `nt ${nt} → Fermon: ${fermon.gene} ${fermon.aa} → Corrected: ${corrected.gene} ${corrected.aa}`;
  }
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
}
function updateFromFermonOld() {
  const gene = document.getElementById("fermon_gene").value;
  const aa = parseInt(document.getElementById("fermon_pos").value);
  const resultDiv = document.getElementById("result");
  resultDiv.innerText = "";

  if (!gene || isNaN(aa)) return;

  // Search in the lookup for matching Fermon annotation
  let found = false;

  for (const key in lookup) {
    const entry = lookup[key];
    if (entry.fermon.gene === gene && entry.fermon.aa === aa) {
      found = true;

      document.getElementById("nt").value = entry.nt;
      document.getElementById("new_fermon_gene").value = entry.corrected.gene;
      document.getElementById("new_fermon_pos").value = entry.corrected.aa;

      if (entry.fermon.gene === entry.corrected.gene && entry.fermon.aa === entry.corrected.aa) {
        resultDiv.innerText = `No change: ${gene} ${aa} → nt ${entry.nt} → still ${gene} ${aa}`;
      } else {
        resultDiv.innerText = `Fermon: ${gene} ${aa} → nt ${entry.nt} → Corrected: ${entry.corrected.gene} ${entry.corrected.aa}`;
      }
      break;
    }
  }
  if (!found) {
    resultDiv.innerText = `Position ${aa} is not found in ${gene}. Please check the input.`;
  }
}
function updateFromCorrected() {
  const gene = document.getElementById("new_fermon_gene").value;
  const aa = parseInt(document.getElementById("new_fermon_pos").value);
  const resultDiv = document.getElementById("result");
  resultDiv.innerText = "";

  if (!gene || isNaN(aa)) return;

  const reverseKey = `gene_${gene}_${aa}`;
  let found = false;

  for (const key in lookup) {
    const entry = lookup[key];
    if (
      entry.corrected?.gene === gene &&
      entry.corrected?.aa === aa
    ) {
      document.getElementById("nt").value = entry.nt;
      document.getElementById("fermon_gene").value = entry.fermon.gene;
      document.getElementById("fermon_pos").value = entry.fermon.aa;
      resultDiv.innerText = `Corrected: ${gene} ${aa} → nt ${entry.nt} → Fermon: ${entry.fermon.gene} ${entry.fermon.aa}`;
      found = true;
      break;
    }
  }

  if (!found) {
    resultDiv.innerText = "Corrected gene/AA combination not found.";
  }
}

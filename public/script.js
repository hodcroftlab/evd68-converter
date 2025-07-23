document.getElementById("conversionForm").addEventListener("submit", function (e) {
    e.preventDefault();
  
    const nt = document.getElementById("nt").value;
    const vp1 = document.getElementById("vp1").value;
    const resultDiv = document.getElementById("result");
  
    // Clear result by default
    resultDiv.innerText = "";
  
    if (vp1) {
      // If VP1 is filled, ignore NT field
      if (lookup[`vp1_${vp1}`]) {
        const { new_vp1 } = lookup[`vp1_${vp1}`];
        resultDiv.innerText = `Remapped VP1 Position: ${new_vp1}`;
      } else {
        resultDiv.innerText = "VP1 position not found (1-309).";
      }
    } else if (nt) {
      // Only use NT if VP1 is empty
      if (lookup[`nt_${nt}`]) {
        const { gene, aa } = lookup[`nt_${nt}`];
        resultDiv.innerText = `Gene: ${gene}, Amino Acid Position: ${aa}`;
      } else {
        resultDiv.innerText = "Nucleotide position not found (733-7296).";
      }
    } else {
      resultDiv.innerText = "Please enter a valid position.";
    }
  });  
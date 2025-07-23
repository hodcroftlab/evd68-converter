document.getElementById("conversionForm").addEventListener("submit", function (e) {
    e.preventDefault();
  
    const nt = document.getElementById("nt").value;
    const vp1 = document.getElementById("vp1").value;
    const resultDiv = document.getElementById("result");
  
    // Clear previous result
    resultDiv.innerText = "";
  
    if (vp1) {
      const key = `vp1_${vp1}`;
      if (lookup[key]) {
        const { gene, aa } = lookup[key];
        resultDiv.innerText = `VP1 pos ${vp1} → Gene: ${gene}, Amino Acid Position: ${aa}`;
      } else {
        resultDiv.innerText = "VP1 position not found (1-309).";
      }
    } else if (nt) {
      const key = `nt_${nt}`;
      if (lookup[key]) {
        const { gene, aa } = lookup[key];
        resultDiv.innerText = `Gene: ${gene}, Amino Acid Position: ${aa}`;
      } else {
        resultDiv.innerText = "Nucleotide position not found (733-7296).";
      }
    } else {
      resultDiv.innerText = "Please enter a valid position.";
    }
  });  
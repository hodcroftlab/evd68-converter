document.getElementById("conversionForm").addEventListener("submit", function (e) {
    e.preventDefault();
  
    const nt = document.getElementById("nt").value;
    const vp1 = document.getElementById("vp1").value;
    const resultDiv = document.getElementById("result");
  
    if (nt && lookup[`nt_${nt}`]) {
      const { gene, aa } = lookup[`nt_${nt}`];
      resultDiv.innerText = `Gene: ${gene}, Amino Acid Position: ${aa}`;
    } else if (vp1 && lookup[`vp1_${vp1}`]) {
      const { new_vp1 } = lookup[`vp1_${vp1}`];
      resultDiv.innerText = `Remapped VP1 Position: ${new_vp1}`;
    } else {
      resultDiv.innerText = "No match found.";
    }
  });  
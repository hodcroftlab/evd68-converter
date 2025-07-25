from Bio import SeqIO, AlignIO
from Bio.SeqFeature import SeqFeature
import subprocess
import tempfile
from pathlib import Path
from typing import Optional
from BCBio import GFF
import json
import argparse


class FermonAnnotation:
    def __init__(self, reference_path: str):
        self.ref_record = SeqIO.read(reference_path, "genbank")
        self.features = {
        f.qualifiers.get("product", ["unknown"])[0]: f
        for f in self.ref_record.features
        if f.type not in {"source"} and "product" in f.qualifiers
    }
        self.nt_to_gene = self._build_nt_map()
        self.vp1_start = self.features["VP1"].location.start

    def _build_nt_map(self):
        """Build map from nucleotide position to gene name."""
        mapping = {}
        for f in self.ref_record.features:
            if f.type != "source" and "product" in f.qualifiers:
                gene = f.qualifiers["product"][0]
                for pos in range(int(f.location.start)+1, int(f.location.end)+1):
                    mapping[pos] = gene
        return mapping

    def get_gene_for_nt(self, nt_pos: int) -> Optional[str]:
        gene = self.nt_to_gene.get(nt_pos)
        if not gene:
            return None

        feature = self.features.get(gene)
        if not feature:
            return None

        codon_offset = nt_pos - int(feature.location.start)-1
        aa_pos = codon_offset // 3 + 1  # 1-based
        return (gene, aa_pos)

    def get_new_vp1_position(self, vp1_pos: int) -> int:
        """Return new VP1 position with -12 offset, raise if out of range. Return new VP3 position for VP1 remapping."""
        vp1 = self.features.get("VP1")
        vp3 = self.features.get("VP3")
        if not vp1 or not vp3:
            raise ValueError("VP1 or VP3 feature not found in reference.")

        vp1_len = (int(vp1.location.end) - int(vp1.location.start))// 3 + 12
        vp3_len = (int(vp3.location.end) - int(vp3.location.start))// 3

        if not (1 <= vp1_pos <= vp1_len):
            raise ValueError(f"VP1 position {vp1_pos} is out of bounds (1-{vp1_len}).")

        if 1 <= vp1_pos <= 12:
            # VP1 positions 1-12 are part of VP3
            aa_pos = vp3_len - (12 - vp1_pos)
            return ("VP3", aa_pos)
        
        return ("VP1", vp1_pos - 12)

    def align_to_fermon(self, query_fasta: str, aligned_out: str):
        with tempfile.TemporaryDirectory() as tmpdir:
            fermon_fa = Path(tmpdir) / "fermon.fasta"
            SeqIO.write([self.ref_record], fermon_fa, "fasta")

            combined_fasta = Path(tmpdir) / "combined.fa"
            with open(combined_fasta, "w") as out:
                out.write(fermon_fa.read_text())
                out.write(Path(query_fasta).read_text())

            with open(aligned_out, "w") as out_handle:
                subprocess.run(
                    ["mafft", "--auto", combined_fasta],
                    stdout=out_handle,
                    stderr=subprocess.DEVNULL,
                    check=True
                )

    def parse_alignment(self, aligned_path: str):
        """Load aligned FASTA and return aligned sequences as strings."""
        alignment = AlignIO.read(aligned_path, "fasta")
        return {record.id: str(record.seq) for record in alignment}

def write_lookup_js(data, output_path):
    with open(output_path, "w") as out:
        out.write("const lookup = ")
        json.dump(data, out, indent=2)
        out.write(";")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("reference", help="GenBank file for Fermon reference")
    parser.add_argument("--nt", type=int, help="Nucleotide position to query")
    parser.add_argument("--vp1", type=int, help="VP1 position to remap")
    parser.add_argument("--export", action="store_true", help="Export lookup to lookup.js")
    args = parser.parse_args()

    ann = FermonAnnotation(args.reference)

    if args.nt is not None:
        gene_aa = ann.get_gene_for_nt(args.nt)
        if gene_aa:
            gene, aa = gene_aa
            print(f"Nucleotide {args.nt} → Gene: {gene}, Amino Acid Position: {aa}")
        else:
            print(f"Nucleotide {args.nt} not mapped to any gene.")

    if args.vp1 is not None:
        try:
            gene, aa = ann.get_new_vp1_position(args.vp1)
            for nt in ann.nt_to_gene:
                if ann.get_gene_for_nt(nt) == (gene, aa):
                    print(f"VP1 position {args.vp1} → Gene: {gene}, AA: {aa}, Nucleotide: {nt}")
                    break
            else:
                print(f"VP1 position {args.vp1} → Gene: {gene}, AA: {aa} (no matching nt)")
        except ValueError as e:
            print(f"Error: {e}")

    if args.export:
        # Derive vp1_<pos> and update gene_... mappings
        vp3_len = (int(ann.features["VP3"].location.end) - int(ann.features["VP3"].location.start)) // 3
        vp1_len = (int(ann.features["VP1"].location.end) - int(ann.features["VP1"].location.start)) // 3
        
        lookup = {}

        # Step 1: Build new annotation from GenBank (corrected)
        for nt in sorted(ann.nt_to_gene.keys()):
            new_info = ann.get_gene_for_nt(nt)
            if not new_info:
                continue

            new_gene, new_aa = new_info

            # Step 2: Check if this nt was originally part of VP1 in old annotation
            # → get old VP1 position (if any)
            rev_key = f"gene_{new_gene}_{new_aa}"
            fermon_pos = None
            old_gene = new_gene
            old_aa = new_aa

            if rev_key in lookup and "vp1" in lookup[rev_key]:
                fermon_pos = lookup[rev_key]["vp1"]
            else:
                # Try mapping back via get_old_vp1_position
                try:
                    for old_vp1 in range(1, 310):
                        g, a = ann.get_new_vp1_position(old_vp1)
                        if (g, a) == (new_gene, new_aa):
                            old_gene = "VP1"
                            old_aa = old_vp1
                            break
                except:
                    pass  # no match

            lookup[f"nt_{nt}"] = {
                "nt": nt,
                "fermon": { "gene": old_gene, "aa": old_aa },
                "corrected": { "gene": new_gene, "aa": new_aa }
            }

        write_lookup_js(lookup, "lookup.js")
        print("Exported lookup.js")

if __name__ == "__main__":
    main()

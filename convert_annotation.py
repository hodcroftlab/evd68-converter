from Bio import SeqIO, AlignIO
from Bio.SeqFeature import SeqFeature
import subprocess
import tempfile
from pathlib import Path
from typing import Optional
from BCBio import GFF

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
                for pos in range(int(f.location.start), int(f.location.end)):
                    mapping[pos] = gene
        return mapping

    def get_gene_for_nt(self, nt_pos: int) -> Optional[str]:
        gene = self.nt_to_gene.get(nt_pos)
        if not gene:
            return None

        feature = self.features.get(gene)
        if not feature:
            return None

        codon_offset = nt_pos - int(feature.location.start)
        aa_pos = codon_offset // 3 + 1  # 1-based
        return (gene, aa_pos)

    def get_new_vp1_position(self, vp1_pos: int) -> int:
        """Return new VP1 position with -12 offset, raise if out of range."""
        vp1 = self.features.get("VP1")
        if not vp1:
            raise ValueError("VP1 feature not found in reference.")

        vp1_len = (int(vp1.location.end) - int(vp1.location.start))// 3 + 12
        if not (1 <= vp1_pos <= vp1_len):
            raise ValueError(f"VP1 position {vp1_pos} is out of bounds (1-{vp1_len}).")

        return max(1, vp1_pos - 12)

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

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("reference", help="GenBank file for Fermon reference")
    parser.add_argument("--nt", type=int, help="Nucleotide position to query")
    parser.add_argument("--vp1", type=int, help="VP1 position to remap")
    parser.add_argument("--query", help="Optional FASTA file to align")
    args = parser.parse_args()

    ann = FermonAnnotation(args.reference)

    if args.nt is not None:
        gene = ann.get_gene_for_nt(args.nt)
        print(f"Nucleotide {args.nt} → Gene: {gene}")

    if args.vp1 is not None:
        new_pos = ann.get_new_vp1_position(args.vp1)
        print(f"VP1 position {args.vp1} → New VP1 position: {new_pos}")

    if args.query:
        with tempfile.NamedTemporaryFile("w+", suffix=".fa") as out:
            ann.align_to_fermon(args.query, out.name)
            aligned = ann.parse_alignment(out.name)
            # for name, seq in aligned.items():
            #     print(f">{name}\n{seq}")


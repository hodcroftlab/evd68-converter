from flask import Flask, render_template, request, jsonify
import os
from convert_annotation import FermonAnnotation

app = Flask(__name__)

# Path to the pre-selected reference GenBank file
REFERENCE_PATH = 'reference.gbk'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    nt = request.form.get('nt', type=int)
    vp1 = request.form.get('vp1', type=int)
    query = request.files.get('query')

    # Process the inputs using your script
    ann = FermonAnnotation(REFERENCE_PATH)

    result = {}
    if nt is not None:
        gene = ann.get_gene_for_nt(nt)
        result['nt'] = f"Nucleotide {nt} → Gene: {gene}"

    if vp1 is not None:
        new_pos = ann.get_new_vp1_position(vp1)
        result['vp1'] = f"VP1 position {vp1} → New VP1 position: {new_pos}"

    if query:
        query_path = os.path.join('path/to/temp', query.filename)
        query.save(query_path)
        with tempfile.NamedTemporaryFile("w+", suffix=".fa") as out:
            ann.align_to_fermon(query_path, out.name)
            aligned = ann.parse_alignment(out.name)
            result['alignment'] = aligned
        os.remove(query_path)

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)

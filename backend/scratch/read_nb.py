import json

nb_path = r"c:\Users\renuk\Projects\cold Mail Sender\jupyter_notebook_deva_refrence\notebook7.ipynb"
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

code_cells = []
for idx, cell in enumerate(nb.get("cells", [])):
    if cell.get("cell_type") == "code":
        source = "".join(cell.get("source", []))
        code_cells.append(f"# --- CELL {idx} ---\n{source}\n")

with open(r"c:\Users\renuk\Projects\cold Mail Sender\backend\scratch\notebook_code.py", "w", encoding="utf-8") as f:
    f.write("\n".join(code_cells))

print("Extracted code cells successfully.")

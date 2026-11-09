import re

with open("App.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "group-hover:border-slate-300" in line and "/>" not in line:
        lines[i] = line.rstrip() + " />\n"

with open("App.tsx", "w") as f:
    f.writelines(lines)

import re
with open("App.tsx", "r") as f:
    content = f.read()

content = re.sub(r"scriptMode=\{formData\.scriptMode\}\s+\)\}", "scriptMode={formData.scriptMode}\n                      />\n                   )}", content)

with open("App.tsx", "w") as f:
    f.write(content)

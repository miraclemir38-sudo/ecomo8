import re

with open("services/geminiService.ts", "r") as f:
    content = f.read()

content = content.replace("'gemini-3.1-flash-image-preview'", "'gemini-3.1-flash-image'")

with open("services/geminiService.ts", "w") as f:
    f.write(content)

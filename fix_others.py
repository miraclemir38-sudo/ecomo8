import re

with open("services/geminiService.ts", "r") as f:
    content = f.read()

content = content.replace("const res = JSON.parse(response.text || '{\"recommendedId\": \"calm\"}');", 
"""let res: any = { recommendedId: "calm" };
    try { res = JSON.parse(response.text || '{"recommendedId": "calm"}'); } catch(e) {}""")

content = content.replace("return JSON.parse(response.text || \"[]\");",
"""try { return JSON.parse(response.text || "[]"); } catch(e) { return []; }""")

with open("services/geminiService.ts", "w") as f:
    f.write(content)

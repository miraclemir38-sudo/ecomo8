import re
with open("App.tsx", "r") as f:
    c = f.read()
c = re.sub(r"setMarketingKit=\{setMarketingKit\}\s*</div>", "setMarketingKit={setMarketingKit}\n                  />\n                </div>", c)
with open("App.tsx", "w") as f:
    f.write(c)

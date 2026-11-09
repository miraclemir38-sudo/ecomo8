import re
with open("App.tsx", "r") as f:
    c = f.read()
c = re.sub(r"onClearUsedTopics=\{[^}]+\}\s*</div>", "onClearUsedTopics={() => setUsedTopics([])}\n      />\n    </div>", c)
with open("App.tsx", "w") as f:
    f.write(c)

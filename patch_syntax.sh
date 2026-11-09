node -e '
const fs = require("fs");
let content = fs.readFileSync("./components/VideoProductionPanel.tsx", "utf8");
content = content.replace(
  `<video src={asset.url} className="w-full h-full object-cover" controls muted loop />\\n                            {asset.assetType === '\\''video'\\'' && (`,
  `<>\\n                              <video src={asset.url} className="w-full h-full object-cover" controls muted loop />\\n                            {asset.assetType === '\\''video'\\'' && (`
);

content = content.replace(
  `                              </button>\\n                            )} ) : ( <img src={asset.url}`,
  `                              </button>\\n                            )}</> ) : ( <img src={asset.url}`
);

fs.writeFileSync("./components/VideoProductionPanel.tsx", content);
console.log("Syntax patched");
'

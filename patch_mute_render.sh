node -e '
const fs = require("fs");
let content = fs.readFileSync("./components/VideoProductionPanel.tsx", "utf8");

const target = `let videoAudioBuffer: AudioBuffer | null = null;
        if (asset.assetType === '\''video'\'' && asset.url) {`;

const replacement = `let videoAudioBuffer: AudioBuffer | null = null;
        if (asset.assetType === '\''video'\'' && asset.url && asset.muteVideo === false) {`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync("./components/VideoProductionPanel.tsx", content);
  console.log("Success");
} else {
  console.log("Target not found");
}
'

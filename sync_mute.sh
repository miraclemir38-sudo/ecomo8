node -e '
const fs = require("fs");
let content = fs.readFileSync("./components/VideoProductionPanel.tsx", "utf8");

// Remove the custom mute button
const buttonPattern = /<button onClick=\{\(\) => handleToggleMuteVideo\(asset\.id\)\}[\s\S]*?<\/button>/;
content = content.replace(buttonPattern, "");

// We need to add an onVolumeChange handler to the video element.
const videoPattern = /<video src=\{asset\.url\} className="w-full h-full object-cover" controls muted loop \/>/;
const newVideo = `<video src={asset.url} className="w-full h-full object-cover" controls muted={asset.muteVideo !== false} loop onVolumeChange={(e) => {
                                const isMuted = (e.target as HTMLVideoElement).muted;
                                if (asset.muteVideo !== isMuted) {
                                  setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, muteVideo: isMuted } : a));
                                }
                              }} />`;

content = content.replace(videoPattern, newVideo);

fs.writeFileSync("./components/VideoProductionPanel.tsx", content);
console.log("Mute synced");
'

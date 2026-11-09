node -e '
const fs = require("fs");
let content = fs.readFileSync("./components/VideoProductionPanel.tsx", "utf8");
const handleToggleMuteVideoCode = `
  const handleToggleMuteVideo = (id: string) => {
    setAssets(prev => prev.map(a => 
      a.id === id ? { ...a, muteVideo: a.muteVideo === undefined ? false : !a.muteVideo } : a
    ));
  };
`;
// find place to insert handleToggleMuteVideo
const hookEnd = "  const handleGenerateOverlayTitle = async ";
content = content.replace(hookEnd, handleToggleMuteVideoCode + hookEnd);

const toggleUI = `{asset.assetType === '\''video'\'' && (
                              <button onClick={() => handleToggleMuteVideo(asset.id)} className={\`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-all \${asset.muteVideo !== false ? '\''bg-red-500/80 text-white'\'' : '\''bg-slate-800/80 text-white'\''}\`} title={asset.muteVideo !== false ? "원본 소리 꺼짐 (클릭하여 켜기)" : "원본 소리 켜짐 (클릭하여 끄기)"}>
                                {asset.muteVideo !== false ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                              </button>
                            )}`;

const targetUI = `<video src={asset.url} className="w-full h-full object-cover" controls muted loop />`;
const replacementUI = `<video src={asset.url} className="w-full h-full object-cover" controls muted loop />\n                            ${toggleUI}`;

content = content.replace(targetUI, replacementUI);
fs.writeFileSync("./components/VideoProductionPanel.tsx", content);
'

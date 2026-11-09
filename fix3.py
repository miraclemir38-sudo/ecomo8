import re

with open("App.tsx", "r") as f:
    content = f.read()

# Replace using regex to match spacing differences
pattern = r"\s*\)\s*:\s*\(\s*<div[^>]*>\s*<VideoProductionPanel[^>]*>\s*</div>\s*\)\s*:\s*\("
# Wait, VideoProductionPanel was broken by having `/>` in the middle!
pattern = r"\)\s*:\s*\(\s*<div className=\"flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300\">\s*<VideoProductionPanel.*?setDetectedSpeakers=\{setDetectedSpeakers\}\s*</div>\s*\)\s*:\s*\("

new_block = """) : activeTab === 'video' ? (
                <div className="flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                  <VideoProductionPanel 
                    scriptContent={generatedScript || ""}
                    apiKey={process.env.API_KEY || ""}
                    scriptMode={formData.scriptMode}
                    channelTheme={formData.channelTheme}
                    assets={assets}
                    setAssets={setAssets}
                    formData={formData}
                    onFullBackup={handleFullBackup}
                    globalSpeakerMap={globalSpeakerMap}
                    setGlobalSpeakerMap={setGlobalSpeakerMap}
                    detectedSpeakers={detectedSpeakers}
                    setDetectedSpeakers={setDetectedSpeakers}
                  />
                </div>
              ) : ("""

content = re.sub(pattern, new_block, content, flags=re.DOTALL)

with open("App.tsx", "w") as f:
    f.write(content)

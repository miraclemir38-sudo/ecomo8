import sys
with open('components/VideoProductionPanel.tsx', 'r') as f:
    code = f.read()

target = """            // Start audio with a slight delay
            source.start(audioCtx.currentTime + AUDIO_DELAY_SEC);
            if (videoSource) videoSource.start(audioCtx.currentTime + AUDIO_DELAY_SEC);"""

replacement = """            // Start audio with a slight delay
            source.start(audioCtx.currentTime + AUDIO_DELAY_SEC);
            if (videoSource) videoSource.start(audioCtx.currentTime + AUDIO_DELAY_SEC);
            
            // Enforce strict scene duration limit so videos don't stay too long if audio is longer
            setTimeout(() => {
                if (isSceneActive) {
                    try { source.stop(); } catch(e) {}
                }
            }, (sceneDuration + AUDIO_DELAY_SEC) * 1000);"""

if target in code:
    code = code.replace(target, replacement)
    with open('components/VideoProductionPanel.tsx', 'w') as f:
        f.write(code)
    print("Patched successfully!")
else:
    print("Target not found")

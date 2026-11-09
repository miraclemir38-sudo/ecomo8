import sys
with open('components/VideoProductionPanel.tsx', 'r') as f:
    code = f.read()

old_logic = """        let sceneDuration = audioDuration;
        if (isVideo && visualElement) {
            const vDur = (visualElement as HTMLVideoElement).duration;
            if (vDur && isFinite(vDur)) {
                if (audioBuffer) {
                    sceneDuration = Math.max(audioDuration, vDur);
                } else {
                    sceneDuration = vDur;
                    audioDuration = vDur;
                }
            }
        }"""

new_logic = """        let sceneDuration = audioDuration;
        if (isVideo && visualElement) {
            const vDur = (visualElement as HTMLVideoElement).duration;
            if (vDur && isFinite(vDur)) {
                sceneDuration = vDur;
            }
        }"""

if old_logic in code:
    code = code.replace(old_logic, new_logic)
    with open('components/VideoProductionPanel.tsx', 'w') as f:
        f.write(code)
    print("Patched successfully!")
else:
    print("Target not found")

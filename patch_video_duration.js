const fs = require('fs');
let code = fs.readFileSync('components/VideoProductionPanel.tsx', 'utf8');

const oldLogic = `        let sceneDuration = audioDuration;
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
        }`;

const newLogic = `        let sceneDuration = audioDuration;
        if (isVideo && visualElement) {
            const vDur = (visualElement as HTMLVideoElement).duration;
            if (vDur && isFinite(vDur)) {
                sceneDuration = vDur;
            }
        }`;

if (code.includes(oldLogic)) {
    code = code.replace(oldLogic, newLogic);
    fs.writeFileSync('components/VideoProductionPanel.tsx', code);
    console.log("Patched successfully!");
} else {
    console.log("Could not find the target code.");
}

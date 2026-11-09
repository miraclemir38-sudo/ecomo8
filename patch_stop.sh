sed -i 's/resolve(); }, SCENE_PADDING_MS); };/resolve(); if (videoSource) { try { videoSource.stop(); } catch(e) {} } }, SCENE_PADDING_MS); };/' components/VideoProductionPanel.tsx

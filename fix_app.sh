#!/bin/bash
# Remove all the bad additions
sed -i '/^\s*\/>$/d' App.tsx
sed -i 's/                        )}/                   )}/g' App.tsx

# Properly fix the two places
# 1. ScriptViewer
sed -i '/channelTheme={formData.channelTheme}/ {
  N
  s/scriptMode={formData.scriptMode}\n                   )}/scriptMode={formData.scriptMode}\n                      \/>\n                   )}/
}' App.tsx


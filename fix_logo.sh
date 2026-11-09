#!/bin/bash
sed -i 's/) : activeTab === '\'video\'' ? (formData.channelTheme === '\'education\'' ? (/) : formData.channelTheme === '\''education'\'' ? (/g' App.tsx
sed -i 's/) : activeTab === '\'video\'' ? (/) : (/g' App.tsx

#!/bin/bash
sed -i -e "s/mode: 'critic' | 'success' | 'insight',/mode: 'critic' | 'success' | 'insight' | 'writers-room',/g" services/geminiService.ts

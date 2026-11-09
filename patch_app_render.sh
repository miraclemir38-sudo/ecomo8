#!/bin/bash
sed -i '/<div className="flex-1 min-h-0 flex flex-col">/,/<\/div>/ {
  /activeTab === '\''script'\'' ? (/ b scriptBlock
  /activeTab === '\''video'\'' ? (/ b videoBlock
  b
  :scriptBlock
  b
  :videoBlock
  b
}' App.tsx

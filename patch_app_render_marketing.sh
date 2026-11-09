#!/bin/bash
sed -i 's/              ) : (/              ) : activeTab === '\''video'\'' ? (/g' App.tsx

cat << 'INNEREOF' > temp_replace.txt
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                  <MarketingPanel 
                    scriptContent={generatedScript || ""}
                    marketingKit={marketingKit}
                    setMarketingKit={setMarketingKit}
                  />
                </div>
INNEREOF

sed -i '/<VideoProductionPanel/,/<\/div>/ {
  /<\/div>/ {
    r temp_replace.txt
    d
  }
}' App.tsx


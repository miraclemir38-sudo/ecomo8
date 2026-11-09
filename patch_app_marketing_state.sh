#!/bin/bash
sed -i '/const \[generatedScript, setGeneratedScript\] = useState/a \
  const [marketingKit, setMarketingKit] = useState<MarketingKit | null>(null);\
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);' App.tsx

sed -i 's/import { ChannelTheme, ScriptFormData/import { ChannelTheme, ScriptFormData, MarketingKit, ThumbnailConcept/g' App.tsx

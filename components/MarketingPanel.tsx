import React, { useState } from 'react';
import { Button } from './Button';
import { Megaphone, CheckCircle2, Loader2, Play } from 'lucide-react';
import { MarketingKit, ThumbnailConcept } from '../types';
import { generateMarketingKit, generateMarketingThumbnail } from '../services/geminiService';

interface MarketingPanelProps {
  scriptContent: string;
  marketingKit: MarketingKit | null;
  setMarketingKit: (kit: MarketingKit) => void;
}

export function MarketingPanel({ scriptContent, marketingKit, setMarketingKit }: MarketingPanelProps) {
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);
  const [thumbnailGeneratingId, setThumbnailGeneratingId] = useState<string | null>(null);

  const handleGenerateKit = async () => {
    if (!scriptContent) {
      alert("대본을 먼저 생성해주세요.");
      return;
    }
    try {
      setIsGeneratingKit(true);
      const kit = await generateMarketingKit(scriptContent);
      kit.thumbnails = kit.thumbnails.map((t, i) => ({ ...t, id: `thumb-${i}` }));
      setMarketingKit(kit);
    } catch (e) {
      console.error(e);
      alert("마케팅 키트 생성에 실패했습니다.");
    } finally {
      setIsGeneratingKit(false);
    }
  };

  const handleGenerateThumbnail = async (concept: ThumbnailConcept) => {
    try {
      setThumbnailGeneratingId(concept.id);
      const url = await generateMarketingThumbnail(concept);
      setMarketingKit({
        ...marketingKit!,
        thumbnails: marketingKit!.thumbnails.map(t => 
          t.id === concept.id ? { ...t, imageUrl: url } : t
        )
      });
    } catch (e) {
      console.error(e);
      alert("썸네일 생성에 실패했습니다.");
    } finally {
      setThumbnailGeneratingId(null);
    }
  };

  if (!scriptContent && !marketingKit) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center h-full">
        <Megaphone className="w-12 h-12 mb-4 text-slate-200" />
        <p>대본을 먼저 완성한 뒤 마케팅 키트를 생성하세요.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-green-600" /> 마케팅 / SEO 에이전트
          </h2>
          <p className="text-xs text-slate-500 mt-1">대본 분석 기반 최적화 제목 및 A/B 테스트용 썸네일 자동 생성</p>
        </div>
        <Button onClick={handleGenerateKit} isLoading={isGeneratingKit} className="bg-green-600 hover:bg-green-500 text-white shadow-green-500/20">
          {marketingKit ? "키트 다시 생성" : "마케팅 키트 생성"}
        </Button>
      </div>

      <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
        {!marketingKit ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            {isGeneratingKit ? (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
                <p>마케팅 에이전트가 완벽한 유튜브 기획을 구성 중입니다...</p>
              </>
            ) : (
              <p>우측 상단의 생성 버튼을 눌러보세요.</p>
            )}
          </div>
        ) : (
          <div className="space-y-8 pb-10">
            {/* Titles */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> 매력적인 썸네일 제목 후보 (Top 5)</h3>
              <ul className="space-y-3">
                {marketingKit.titles.map((title, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-green-600 font-bold">{i + 1}.</span>
                    <span className="font-medium text-slate-800">{title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Thumbnails */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> A/B 테스트용 썸네일 이미지 (텍스트 포함)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {marketingKit.thumbnails.map((thumb) => (
                  <div key={thumb.id} className="border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-slate-50">
                    <div className={`p-2 text-center text-xs font-bold uppercase tracking-wider ${thumb.concept === 'aggro' ? 'bg-red-600 text-white' : thumb.concept === 'info' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'}`}>
                      {thumb.concept === 'aggro' ? '🔥 어그로형' : thumb.concept === 'info' ? '💡 정보형' : '❤️ 감성형'}
                    </div>
                    <div className="aspect-video bg-slate-200 relative flex items-center justify-center">
                      {thumb.imageUrl ? (
                        <img src={thumb.imageUrl} alt={thumb.titleText} className="w-full h-full object-cover" />
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleGenerateThumbnail(thumb)}
                          isLoading={thumbnailGeneratingId === thumb.id}
                        >
                          <Play className="w-3 h-3 mr-1" /> 생성하기
                        </Button>
                      )}
                    </div>
                    <div className="p-3 text-xs space-y-2">
                      <p><span className="font-bold text-slate-600">메인 텍스트:</span> {thumb.titleText}</p>
                      <p><span className="font-bold text-slate-600">서브 텍스트:</span> {thumb.subtitleText}</p>
                      <p className="text-slate-400 line-clamp-2" title={thumb.visualPrompt}>{thumb.visualPrompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> 유튜브 설명란</h3>
                <textarea 
                  className="w-full h-32 p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50"
                  readOnly
                  value={marketingKit.description}
                />
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> 고정 댓글 (참여 유도)</h3>
                  <div className="p-3 text-sm border border-slate-200 rounded-lg bg-blue-50 text-blue-800">
                    {marketingKit.pinnedComment}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> 해시태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {marketingKit.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-600">
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


import React from 'react';
import { TopicSuggestion, TopicItem } from '../types';
import { Button } from './Button';
import { X, Sparkles, Clock, Zap, History } from 'lucide-react';

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: TopicSuggestion[];
  onSelect: (topic: string, category: string, duration?: number, mode?: 'critic' | 'success' | 'insight' | 'writers-room') => void;
  isLoading: boolean;
  onRefresh: () => void;
  usedTopics?: string[];
  onClearUsedTopics?: () => void;
}

export const TopicModal: React.FC<TopicModalProps> = ({ 
  isOpen, 
  onClose, 
  suggestions, 
  onSelect,
  isLoading,
  onRefresh,
  usedTopics = [],
  onClearUsedTopics
}) => {
  if (!isOpen) return null;

  // Ensure suggestions is always an array
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-brand-700">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-xl font-bold">AI 추천 영상 주제 (실시간 트렌드)</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-14 bg-slate-100 rounded animate-pulse"></div>
                    <div className="h-14 bg-slate-100 rounded animate-pulse"></div>
                    <div className="h-14 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {safeSuggestions.map((group, idx) => {
                const category = group?.category || "추천 주제";
                const topics = Array.isArray(group?.topics) ? group.topics : [];
                
                return (
                  <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                      {category.includes('국뽕') && <span className="text-lg">🇰🇷</span>}
                      {category.includes('몰락') && <span className="text-lg">📉</span>}
                      {category.includes('비판') && <span className="text-lg">🔥</span>}
                      {category.includes('성공') && <span className="text-lg">🚀</span>}
                      {category.includes('통찰') && <span className="text-lg">💡</span>}
                      
                      {/* New Psychology Categories */}
                      {category.includes('분석') && <span className="text-lg">🕵️‍♂️</span>}
                      {category.includes('Case Study') && <span className="text-lg">🕵️‍♂️</span>}
                      {category.includes('테스트') && <span className="text-lg">📝</span>}
                      {category.includes('Self-Test') && <span className="text-lg">📝</span>}
                      {category.includes('대처') && <span className="text-lg">🛡️</span>}
                      {category.includes('Solution') && <span className="text-lg">🛡️</span>}

                      {category.includes('다크') && <span className="text-lg">🌑</span>}
                      {category.includes('치유') && <span className="text-lg">🌱</span>}
                      {category.includes('행동') && <span className="text-lg">🧠</span>}
                      
                      {category}
                    </h3>
                    <div className="grid gap-3">
                      {topics.map((item, tIdx) => {
                        const title = typeof item === 'string' ? item : item?.title || "제목 없음";
                        const duration = typeof item === 'object' ? item?.duration || 0 : 0;
                        const reason = typeof item === 'object' ? item?.reason : "";
                        const isShorts = duration > 0 && duration < 3;

                        return (
                          <button
                            key={tIdx}
                            onClick={() => {
                              onSelect(title, category, duration, typeof item === 'object' ? item?.mode : undefined);
                              onClose();
                            }}
                            className="text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-brand-300 hover:bg-white hover:shadow-md transition-all group relative overflow-hidden"
                          >
                            <div className="flex justify-between items-start gap-4">
                               <div className="flex-1">
                                  <span className="font-bold text-slate-700 group-hover:text-brand-700 text-base leading-snug block mb-1">
                                     {title}
                                  </span>
                                  {reason && (
                                      <span className="text-xs text-slate-400 font-medium">
                                          Why: {reason}
                                      </span>
                                  )}
                               </div>
                               
                               {duration > 0 && (
                                  <div className={`flex flex-col items-center justify-center min-w-[50px] px-2 py-1.5 rounded-lg border text-xs font-bold ${
                                      isShorts 
                                      ? 'bg-red-50 text-red-600 border-red-100' 
                                      : (duration >= 12 
                                          ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                          : 'bg-blue-50 text-blue-600 border-blue-100')
                                  }`}>
                                      {isShorts ? <Zap className="w-3.5 h-3.5 mb-0.5" /> : <Clock className="w-3.5 h-3.5 mb-0.5" />}
                                      <span>{duration}분</span>
                                  </div>
                               )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Display Used Topics */}
              {usedTopics.length > 0 && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 border-dashed">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <History className="w-4 h-4" /> 
                        이미 사용한 주제 ({usedTopics.length})
                      </h3>
                      {onClearUsedTopics && (
                        <button 
                          onClick={onClearUsedTopics}
                          className="text-[10px] text-slate-400 hover:text-red-500 font-bold transition-colors"
                        >
                          기록 삭제
                        </button>
                      )}
                   </div>
                   <div className="flex flex-wrap gap-2 opacity-60 pointer-events-none">
                      {usedTopics.map((topic, i) => (
                        <span key={i} className="bg-white px-2 py-1 rounded text-[11px] text-slate-500 border border-slate-100">
                           {topic}
                        </span>
                      ))}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button variant="secondary" onClick={onRefresh} isLoading={isLoading}>
            <Sparkles className="w-4 h-4" />
            다른 주제 더 보기 (Refresh)
          </Button>
        </div>
      </div>
    </div>
  );
};

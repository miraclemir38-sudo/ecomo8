
import React from 'react';
import { TrendingUp, Sparkles, Video, Upload, ChevronRight, BarChart3, Globe2, Zap } from 'lucide-react';
import { EcoMoLogo } from './Logo';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden relative selection:bg-emerald-500 selection:text-white">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px]"></div>
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 h-screen flex flex-col justify-center">
        
        {/* Header / Brand */}
        <div className="absolute top-8 left-6 flex items-center gap-3 opacity-80">
          <EcoMoLogo className="w-8 h-8 text-emerald-400" />
          <span className="font-serif tracking-wider text-sm font-medium text-slate-300">ECOMO STUDIO</span>
        </div>

        {/* Main Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-xs font-medium text-emerald-400 mb-2">
              <Sparkles className="w-3 h-3" />
              <span>Powered by Gemini 3.1 & Veo</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              The Future of <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Economic Media
              </span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              경제 채널을 위한 올인원 AI 프로덕션. <br/>
              심층적인 데이터 분석 대본부터, Veo 기반의 고화질 영상 생성, 
              그리고 유튜브 업로드까지 단 하나의 플랫폼에서 완성하세요.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onEnter}
                className="group relative px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  스튜디오 입장하기 <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
              
              <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2">
                 <Globe2 className="w-4 h-4 text-slate-400" />
                 기능 둘러보기
              </button>
            </div>
          </div>

          {/* Feature Cards Visual */}
          <div className="hidden lg:grid grid-cols-2 gap-4 opacity-90">
             <div className="space-y-4 mt-12">
                <FeatureCard 
                   icon={<BarChart3 className="w-6 h-6 text-blue-400" />}
                   title="Data-Driven Script"
                   desc="실시간 경제 지표와 뉴스를 분석하여 신뢰도 높은 대본을 작성합니다."
                   delay="delay-100"
                />
                <FeatureCard 
                   icon={<Video className="w-6 h-6 text-purple-400" />}
                   title="Cinematic Visuals"
                   desc="Veo AI를 통해 텍스트만으로 방송급 퀄리티의 영상을 생성합니다."
                   delay="delay-300"
                />
             </div>
             <div className="space-y-4">
                <FeatureCard 
                   icon={<Zap className="w-6 h-6 text-yellow-400" />}
                   title="Instant Rendering"
                   desc="클라우드 기반의 초고속 렌더링으로 편집 시간을 90% 단축합니다."
                   delay="delay-200"
                />
                 <FeatureCard 
                   icon={<Upload className="w-6 h-6 text-red-400" />}
                   title="Auto Publishing"
                   desc="SEO 최적화된 제목과 설명으로 유튜브 채널에 즉시 업로드합니다."
                   delay="delay-500"
                />
             </div>
          </div>
        </div>
      </div>
      
      {/* Footer ticker style */}
      <div className="absolute bottom-0 w-full border-t border-slate-800 bg-slate-900/50 backdrop-blur text-[10px] py-2 px-6 flex justify-between text-slate-500 uppercase tracking-widest">
         <div>EcoMo Studio v1.0.0</div>
         <div className="flex gap-4">
            <span>Server: Stable</span>
            <span>Latency: 24ms</span>
            <span>Gemini: Connected</span>
         </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: string }) => (
  <div className={`p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-sm hover:bg-slate-800/60 transition-colors animate-in fade-in slide-in-from-right-10 duration-700 fill-mode-backwards ${delay}`}>
    <div className="mb-4 bg-slate-900/50 w-fit p-3 rounded-xl border border-slate-700/50 shadow-inner">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-slate-200 mb-2">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

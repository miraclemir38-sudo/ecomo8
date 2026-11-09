
import React, { useState, useEffect } from 'react';
import { Youtube, Upload, X, CheckCircle2, Loader2, AlertCircle, Key, MessageCircle, Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { YouTubeMetadata } from '../types';

interface YouTubeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: YouTubeMetadata | null;
  videoBlobUrl: string | null;
  scriptContent: string;
}

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export const YouTubeUploadModal: React.FC<YouTubeUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  metadata: initialMetadata, 
  videoBlobUrl 
}) => {
  const [formData, setFormData] = useState<YouTubeMetadata>({
    title: '',
    description: '',
    tags: [],
    pinnedComment: ''
  });
  
  const [clientId, setClientId] = useState('');
  const [hasAuth, setHasAuth] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [commentCopied, setCommentCopied] = useState(false);

  useEffect(() => {
    if (initialMetadata) {
      setFormData({
          title: initialMetadata.title || '',
          description: initialMetadata.description || '',
          tags: Array.isArray(initialMetadata.tags) ? initialMetadata.tags : [],
          pinnedComment: initialMetadata.pinnedComment || ''
      });
    }
  }, [initialMetadata]);

  useEffect(() => {
    const savedId = localStorage.getItem('google_client_id');
    if (savedId) setClientId(savedId);
  }, []);

  const handleGoogleLogin = () => {
    if (!clientId) {
      alert("Google Client ID를 입력해주세요.");
      return;
    }
    localStorage.setItem('google_client_id', clientId);

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/youtube.upload',
      callback: (response: any) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          setHasAuth(true);
        } else {
          alert("로그인에 실패했습니다.");
        }
      },
    });
    client.requestAccessToken();
  };

  const handleCopyComment = () => {
      if (formData.pinnedComment) {
          navigator.clipboard.writeText(formData.pinnedComment);
          setCommentCopied(true);
          setTimeout(() => setCommentCopied(false), 2000);
      }
  };

  const handleUpload = async () => {
    if (!videoBlobUrl || !accessToken) return;
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const response = await fetch(videoBlobUrl);
      const videoBlob = await response.blob();
      const fileSize = videoBlob.size;

      const metadata = {
        snippet: {
          title: formData.title,
          description: formData.description,
          tags: formData.tags,
          categoryId: '25', 
        },
        status: {
          privacyStatus: 'private', 
          selfDeclaredMadeForKids: false,
        },
      };

      const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,contentDetails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': fileSize.toString(),
          'X-Upload-Content-Type': 'video/webm',
        },
        body: JSON.stringify(metadata),
      });

      if (!initResponse.ok) {
         throw new Error(`Upload initialization failed: ${initResponse.statusText}`);
      }

      const uploadUrl = initResponse.headers.get('Location');
      if (!uploadUrl) throw new Error("No upload location URL returned");

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', 'video/webm');
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const result = JSON.parse(xhr.response);
          setUploadedVideoId(result.id);
          setUploadStatus('success');
        } else {
          setUploadStatus('error');
        }
      };

      xhr.onerror = () => {
        setUploadStatus('error');
      };

      xhr.send(videoBlob);

    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus('error');
    }
  };

  if (!isOpen) return null;

  const safeTags = Array.isArray(formData.tags) ? formData.tags : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#FF0000]/5">
          <div className="flex items-center gap-2 text-[#FF0000]">
            <Youtube className="w-6 h-6" />
            <h2 className="text-xl font-bold tracking-tight">유튜브 업로드 매니저</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {uploadStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">업로드 완료!</h3>
              <p className="text-slate-500 max-w-sm">
                영상이 성공적으로 EcoMo 채널에 업로드되었습니다.<br/>
                현재 <strong>'비공개(Private)'</strong> 상태로 설정되어 있습니다.
              </p>
              
              {formData.pinnedComment && (
                  <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4 text-left">
                      <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> 추천 고정 댓글 (복사해서 사용)
                      </p>
                      <p className="text-sm text-slate-800 bg-white p-2 rounded border border-slate-100 mb-2">
                          {formData.pinnedComment}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopyComment}
                        className="w-full h-8 text-xs"
                      >
                          {commentCopied ? <Check className="w-3 h-3 mr-1"/> : <Copy className="w-3 h-3 mr-1"/>}
                          {commentCopied ? "복사완료!" : "댓글 복사하기"}
                      </Button>
                  </div>
              )}

              <div className="flex gap-3 pt-4">
                 <Button onClick={onClose} variant="outline">닫기</Button>
                 <a 
                   href={`https://studio.youtube.com/video/${uploadedVideoId}/edit`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="px-4 py-2 bg-[#FF0000] text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                 >
                   <Youtube className="w-4 h-4" /> YouTube 스튜디오로 이동
                 </a>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                    <p className="text-sm text-blue-800 flex items-start gap-2">
                       <CheckCircle2 className="w-4 h-4 mt-0.5" />
                       AI가 최적화된 제목, 설명(타임스탬프 포함)을 자동 생성했습니다.
                    </p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">제목 (Title)</label>
                    <input 
                      type="text" 
                      value={formData.title} 
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-medium"
                    />
                    <p className="text-xs text-right text-slate-400">{formData.title.length}/100</p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">설명 (Description & Timestamps)</label>
                    <textarea 
                      rows={8}
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm resize-none font-mono"
                      placeholder="영상 설명과 타임스탬프(00:00)가 여기에 표시됩니다."
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">고정 댓글 추천 (Pinned Comment Strategy)</label>
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            value={formData.pinnedComment || ""}
                            onChange={(e) => setFormData({...formData, pinnedComment: e.target.value})}
                            className="flex-1 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                            placeholder="시청자 참여를 유도하는 질문을 입력하세요..."
                        />
                        <button 
                            onClick={handleCopyComment}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg px-3 transition-colors"
                            title="복사하기"
                        >
                            {commentCopied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                        </button>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">태그 (Tags)</label>
                    <div className="flex flex-wrap gap-2 p-2.5 border border-slate-300 rounded-lg bg-slate-50 min-h-[50px]">
                        {safeTags.map((tag, idx) => (
                           <span key={idx} className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                             #{tag}
                             <button onClick={() => {
                               const newTags = safeTags.filter((_, i) => i !== idx);
                               setFormData({...formData, tags: newTags});
                             }} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                           </span>
                        ))}
                        <input 
                           type="text" 
                           placeholder="태그 추가 (Enter)" 
                           className="bg-transparent text-sm outline-none flex-1 min-w-[100px]"
                           onKeyDown={(e) => {
                              if(e.key === 'Enter') {
                                 e.preventDefault();
                                 const val = e.currentTarget.value.trim();
                                 if(val && !safeTags.includes(val)) {
                                    setFormData({...formData, tags: [...safeTags, val]});
                                    e.currentTarget.value = '';
                                 }
                              }
                           }}
                        />
                    </div>
                 </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                 {!hasAuth ? (
                    <div className="space-y-3">
                       <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-slate-500">Google OAuth Client ID (For Demo)</label>
                          <div className="flex gap-2">
                             <div className="relative flex-1">
                                <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input 
                                   type="text" 
                                   value={clientId}
                                   onChange={(e) => setClientId(e.target.value)}
                                   placeholder="Enter your Client ID"
                                   className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                />
                             </div>
                             <Button onClick={handleGoogleLogin} className="whitespace-nowrap bg-blue-600 hover:bg-blue-700">
                                <Youtube className="w-4 h-4 mr-2" />
                                구글 로그인
                             </Button>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="space-y-4">
                       <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
                          <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                             <CheckCircle2 className="w-4 h-4" />
                             YouTube 계정 연결됨
                          </div>
                          <button onClick={() => setHasAuth(false)} className="text-xs text-slate-500 underline">로그아웃</button>
                       </div>
                       
                       {uploadStatus === 'uploading' ? (
                          <div className="space-y-2">
                             <div className="flex justify-between text-sm font-medium">
                                <span>업로드 중...</span>
                                <span>{uploadProgress}%</span>
                             </div>
                             <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div className="bg-[#FF0000] h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                             </div>
                             <p className="text-center text-xs text-slate-500 animate-pulse">창을 닫지 마세요.</p>
                          </div>
                       ) : (
                          <Button 
                             onClick={handleUpload} 
                             className="w-full py-3 bg-[#FF0000] hover:bg-red-700 text-white shadow-lg shadow-red-200"
                             disabled={uploadStatus === 'error'}
                          >
                             <Upload className="w-5 h-5 mr-2" />
                             YouTube에 업로드 시작
                          </Button>
                       )}
                       
                       {uploadStatus === 'error' && (
                          <p className="text-sm text-red-600 flex items-center justify-center gap-1 font-medium">
                             <AlertCircle className="w-4 h-4" /> 업로드 중 오류가 발생했습니다.
                          </p>
                       )}
                    </div>
                 )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

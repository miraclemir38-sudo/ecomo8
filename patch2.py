import sys

with open('components/VideoProductionPanel.tsx', 'r') as f:
    content = f.read()

import_line = "import { Video, Play, Loader2, AlertCircle, Film, RefreshCw, Download, Image as ImageIcon, Zap, Mic, Music, MonitorPlay, Wand2, HelpCircle, RotateCcw, Volume2, X, CheckCircle2, Type, Sparkles, Undo2, VolumeX, Link as LinkIcon, Settings, Upload, Youtube, Eye, Palette, AlertTriangle, Hourglass, Filter, Hammer, Volume1, Move, Star, FileUp, Pause, Captions, MessageSquare, Smartphone, RectangleHorizontal, Save, User, FileAudio, Square, ImagePlus, AlignLeft, AlignRight } from 'lucide-react';"
new_import_line = import_line.replace("} from 'lucide-react'", ", Trash2 } from 'lucide-react'")

content = content.replace(import_line, new_import_line)

old_ui = '<div className="text-xs text-slate-400 font-mono">ID: {asset.id}</div> </div> </div>'
new_ui = '<div className="text-xs text-slate-400 font-mono">ID: {asset.id}</div> <button onClick={() => handleDeleteScene(asset.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="이 씬 삭제하기" disabled={isBatchProcessing || isRendering}><Trash2 className="w-4 h-4" /></button> </div> </div>'

content = content.replace(old_ui, new_ui)

with open('components/VideoProductionPanel.tsx', 'w') as f:
    f.write(content)

print("UI patched successfully")

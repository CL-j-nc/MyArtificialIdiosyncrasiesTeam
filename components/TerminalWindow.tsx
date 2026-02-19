
import React, { useEffect, useRef } from 'react';
import { LogEntry, ModelProvider, AppTheme } from '../types';

interface TerminalWindowProps {
  logs: LogEntry[];
  title?: string;
  isProcessing?: boolean;
  theme?: AppTheme;
}

const getBadgeColor = (source: LogEntry['source']) => {
  switch (source) {
    case ModelProvider.GEMINI: return 'text-sky-400';
    case ModelProvider.GROQ: return 'text-orange-500';
    case ModelProvider.OLLAMA: return 'text-emerald-500';
    case ModelProvider.GPT4O: return 'text-purple-400';
    default: return 'text-slate-500';
  }
};

const TerminalWindow: React.FC<TerminalWindowProps> = ({ 
  logs, 
  title = "遥测数据流.STREAM", 
  isProcessing,
  theme = AppTheme.CYBERPUNK
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Theme Helpers
  const isLightTheme = theme === AppTheme.CLASSIC || theme === AppTheme.RENAISSANCE;
  const bgClass = isLightTheme ? 'bg-white/80 border-black/10' : 'bg-black/80 border-white/10';
  const textMain = isLightTheme ? 'text-slate-700' : 'text-slate-300';
  const textDim = isLightTheme ? 'text-black/40' : 'text-white/20';
  const borderClass = isLightTheme ? 'border-black/10' : 'border-white/10';
  const itemHover = isLightTheme ? 'hover:bg-black/5' : 'hover:bg-white/5';

  return (
    <div className={`relative w-full h-full flex flex-col ${bgClass} backdrop-blur-xl rounded-2xl border overflow-hidden shadow-2xl transition-colors duration-500`}>
      
      {/* Dynamic Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${borderClass} select-none ${isLightTheme ? 'bg-black/5' : 'bg-white/5'}`}>
        <div className="flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'}`}></div>
            <span className={`text-[9px] font-mono tracking-[0.2em] uppercase font-black ${isLightTheme ? 'text-black/60' : 'text-white/60'}`}>{title}</span>
        </div>
        <div className={`text-[8px] font-mono ${textDim}`}>
            安全隧道::已激活
        </div>
      </div>

      {/* Log Feed */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-3 custom-scrollbar">
        {logs.length === 0 && (
            <div className={`flex flex-col items-center justify-center h-full space-y-2 opacity-50 ${textDim}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="tracking-widest">等待上行链路...</span>
            </div>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className={`animate-fade-in group ${itemHover} p-1 rounded-lg transition-colors`}>
            <div className="flex items-center gap-2 mb-1">
                <span className={`text-[8px] ${textDim}`}>{log.timestamp}</span>
                <span className={`font-black tracking-tighter uppercase ${getBadgeColor(log.source)}`}>
                    {log.source === 'System' ? '[核心]' : `[${log.source}]`}
                </span>
                <div className={`h-[1px] flex-1 ${isLightTheme ? 'bg-black/5' : 'bg-white/5'}`}></div>
            </div>
            <p className={`${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : textMain} pl-2 border-l ${borderClass} ml-1 break-words leading-relaxed`}>
              {log.message}
            </p>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-cyan-500 mt-4 pl-1 animate-pulse">
            <span className="text-xs">{'>'}</span>
            <span className="w-2 h-4 bg-cyan-500/20"></span>
          </div>
        )}
      </div>

      {/* Footer Decoration */}
      <div className="h-1 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"></div>
    </div>
  );
};

export default TerminalWindow;

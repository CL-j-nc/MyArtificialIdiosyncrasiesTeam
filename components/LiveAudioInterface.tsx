import React, { useEffect } from 'react';
import { LogEntry } from '../types';

interface LiveAudioInterfaceProps {
  onClose: () => void;
  addLog: (log: LogEntry) => void;
}

const LiveAudioInterface: React.FC<LiveAudioInterfaceProps> = ({ onClose, addLog }) => {
  useEffect(() => {
    addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      source: 'System',
      message: '当前为 Ollama 接入。实时语音会话未启用，请使用文本对话模式。',
      type: 'info',
    });
  }, [addLog]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-md rounded-3xl p-10 border border-white/10 animate-fade-in">
      <div className="mb-8 w-24 h-24 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M12 14v-1m0 0V8m0 5l3 3m-3-3l-3 3m8-10H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V8a2 2 0 00-2-2z" />
        </svg>
      </div>
      <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">语音实时会话未启用</h3>
      <p className="text-xs text-white/60 mb-2 font-mono">Ollama 当前接入为文本推理模式</p>
      <p className="text-[11px] text-white/40 mb-10 font-mono">请关闭此窗口并在输入框中继续对话。</p>
      <button
        onClick={onClose}
        className="px-8 py-3 bg-white text-black text-xs font-black rounded-full uppercase tracking-widest hover:bg-cyan-500 hover:text-white transition-all shadow-2xl"
      >
        返回文本模式
      </button>
    </div>
  );
};

export default LiveAudioInterface;

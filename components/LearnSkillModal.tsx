
import React, { useState } from 'react';

interface LearnSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (input: string) => void;
  isProcessing: boolean;
}

const LearnSkillModal: React.FC<LearnSkillModalProps> = ({ isOpen, onClose, onIngest, isProcessing }) => {
  const [input, setInput] = useState('');
  const [type, setType] = useState<'URL' | 'PATH' | 'SEARCH'>('SEARCH');

  if (!isOpen) return null;

  const examples = {
    URL: 'https://raw.githubusercontent.com/user/repo/main/optimize.sh',
    PATH: './scripts/neural_optimizer.sh',
    SEARCH: 'Advanced Kubernetes scaling patterns'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onIngest(input);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="w-full max-w-lg bg-black/90 border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-[10px] font-black font-mono text-cyan-400 uppercase tracking-[0.2em]">模块摄入接口</span>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex gap-2 mb-4">
            {(['SEARCH', 'URL', 'PATH'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setInput(''); }}
                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest border rounded-xl transition-all ${type === t ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-white/5 text-white/20 hover:text-white/40'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[8px] text-white/30 uppercase font-black tracking-widest ml-1">
                {type}_源向量
              </label>
              <input
                autoFocus
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-cyan-500/40 transition-all font-mono placeholder:text-white/5"
                placeholder={examples[type]}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[9px] font-mono text-white/40 leading-relaxed italic">
                <span className="text-cyan-400 font-bold mr-2">i</span>
                系统将扫描 {type.toLowerCase()} 寻找可执行的认知模式并将其合并到核心向量记忆中。
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-black h-12 rounded-2xl text-[11px] font-black tracking-widest transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] disabled:opacity-20 uppercase active:scale-95 flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              初始化摄入
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="px-6 py-4 bg-black/40 border-t border-white/5 text-center">
          <span className="text-[8px] font-mono text-white/10 tracking-[0.3em] uppercase">安全协议::等级_4_激活</span>
        </div>
      </div>
    </div>
  );
};

export default LearnSkillModal;

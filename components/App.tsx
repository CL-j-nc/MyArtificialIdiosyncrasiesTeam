
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { WorkflowType, WorkflowState, LogEntry, ModelProvider, AgentStyle, AppTheme, BotProfile } from '../types';
import { 
  runDiagnoseWorkflow, 
  runCodeGenWorkflow, 
  runSmartRoute,
  runGithubWorkflow,
  runCloudflareWorkflow,
  runSkillLearningWorkflow,
  runSelfDiagnoseWorkflow,
  runThinkingWorkflow,
  runVisionWorkflow,
  runTranscriptionWorkflow,
  runTTSWorkflow,
  checkApiHealth
} from '../services/geminiService';
import { MemoryService } from '../services/memoryService';
import TerminalWindow from './TerminalWindow';
import TelegramWidget from './TelegramWidget';
import AgentScene from './AgentScene';
import LearnSkillModal from './LearnSkillModal';
import LiveAudioInterface from './LiveAudioInterface';
import AgentSettingsModal from './AgentSettingsModal';

const App: React.FC = () => {
  const memoryService = useMemo(() => MemoryService.getInstance(), []);

  const [state, setState] = useState<WorkflowState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workflow_state');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...parsed, isRunning: false, currentStage: 'IDLE' };
        } catch (e) { console.error(e); }
      }
    }
    return { isRunning: false, currentStage: 'IDLE', logs: [], result: null, isGlitched: false };
  });

  const [input, setInput] = useState('');
  const [isFeedingBread, setIsFeedingBread] = useState(false);
  const [agentSpeech, setAgentSpeech] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<ModelProvider | 'System'>('System');
  const [isLearnModalOpen, setIsLearnModalOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [apiStatus, setApiStatus] = useState<'ONLINE' | 'OFFLINE' | 'CONNECTING'>('CONNECTING');
  
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Bot Profile Management
  const [bots, setBots] = useState<BotProfile[]>([]);

  // State for Telegram outgoing messages
  const [tgOutgoing, setTgOutgoing] = useState<{botId: string, chatId: string, text: string}[]>([]);
  const lastProcessedOutgoingIndex = useRef<number>(-1);

  // Agent Customization State
  const [agentStyles, setAgentStyles] = useState<AgentStyle[]>([]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Theme State
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(AppTheme.CYBERPUNK);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    localStorage.setItem('workflow_state', JSON.stringify({ ...state, isRunning: false })); 
  }, [state]);

  // Load Bots
  useEffect(() => {
    const saved = localStorage.getItem('tg_bots');
    if (saved) {
      try { setBots(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  const handleBotsChange = (newBots: BotProfile[]) => {
      setBots(newBots);
      localStorage.setItem('tg_bots', JSON.stringify(newBots));
  };

  // Handle Outgoing Telegram Messages
  useEffect(() => {
    if (tgOutgoing.length > 0 && lastProcessedOutgoingIndex.current < tgOutgoing.length - 1) {
      const start = lastProcessedOutgoingIndex.current + 1;
      for (let i = start; i < tgOutgoing.length; i++) {
          const msg = tgOutgoing[i];
          const bot = bots.find(b => b.id === msg.botId);
          if (bot && bot.botToken) {
              fetch(`https://api.telegram.org/bot${bot.botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: msg.chatId, text: msg.text, parse_mode: 'Markdown' })
              }).catch(e => console.error("TG Send Error", e));
          }
      }
      lastProcessedOutgoingIndex.current = tgOutgoing.length - 1;
    }
  }, [tgOutgoing, bots]);

  useEffect(() => {
    const savedStyles = localStorage.getItem('agent_styles');
    if (savedStyles) {
        try { setAgentStyles(JSON.parse(savedStyles)); } catch(e) {}
    }
  }, []);

  const updateAgentStyle = (newStyle: AgentStyle) => {
      setAgentStyles(prev => {
          const others = prev.filter(s => s.id !== newStyle.id);
          const updated = [...others, newStyle];
          localStorage.setItem('agent_styles', JSON.stringify(updated));
          return updated;
      });
  };

  // Periodic Health Check
  useEffect(() => {
    const verifyHealth = async () => {
        const isHealthy = await checkApiHealth();
        setApiStatus(isHealthy ? 'ONLINE' : 'OFFLINE');
    };
    verifyHealth();
    const interval = setInterval(verifyHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const logsRef = useRef<LogEntry[]>(state.logs);
  const [tgLogs, setTgLogs] = useState<{ botId: string, message: string }[]>([]);
  const activeBotTriggerRef = useRef<string | null>(null);

  const addLog = useCallback((log: LogEntry) => {
    logsRef.current = [...logsRef.current, log];
    setState(prev => ({ ...prev, logs: logsRef.current }));
    setActiveModel(log.source);
    if (log.type === 'thinking' || log.type === 'info') setAgentSpeech(log.message);
    if (activeBotTriggerRef.current) {
        setTgLogs(prev => [...prev, { botId: activeBotTriggerRef.current!, message: `${log.source}: ${log.message}` }]);
    }
  }, []);

  const playTTS = async (text: string) => {
    try {
      const audioData = await runTTSWorkflow(text, addLog);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await decodeAudioData(audioData, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) { console.error("TTS Playback Error", e); }
  };

  const handleRunWorkflow = async (type: WorkflowType, textOverride?: string, fromTelegram?: {botId: string, chatId: string}) => {
    const textToProcess = textOverride || input;
    if (type === WorkflowType.LEARN_SKILL && !textOverride && !input.trim()) {
      setIsLearnModalOpen(true);
      return;
    }
    if (state.isRunning) {
        if (fromTelegram) {
            setTgOutgoing(prev => [...prev, {botId: fromTelegram.botId, chatId: fromTelegram.chatId, text: "System is busy processing another workflow. Please wait."}]);
        }
        return;
    }

    logsRef.current = [];
    activeBotTriggerRef.current = fromTelegram ? fromTelegram.botId : null;

    setState(prev => ({ ...prev, isRunning: true, currentStage: type, logs: [], result: null }));
    setActiveModel(ModelProvider.GEMINI);

    try {
      let result = '';
      if (isThinkingMode && !fromTelegram) {
        result = await runThinkingWorkflow(textToProcess, addLog);
      } else {
        switch (type) {
          case WorkflowType.DIAGNOSE: result = await runDiagnoseWorkflow(textToProcess, addLog); break;
          case WorkflowType.CODE_GEN: result = await runCodeGenWorkflow(textToProcess, addLog); break;
          case WorkflowType.SMART_ROUTE: result = await runSmartRoute(textToProcess, addLog); break;
          case WorkflowType.GITHUB_PR: result = await runGithubWorkflow(textToProcess, addLog); break;
          case WorkflowType.DEPLOY_CF: result = await runCloudflareWorkflow("prod", addLog); break;
          case WorkflowType.LEARN_SKILL: result = await runSkillLearningWorkflow(textToProcess, addLog); break;
          case WorkflowType.SELF_DIAGNOSE: result = await runSelfDiagnoseWorkflow(textToProcess, addLog); break;
          default: result = await runSmartRoute(textToProcess, addLog);
        }
      }
      
      setAgentSpeech("Task complete.");
      setState(prev => ({ ...prev, isRunning: false, result }));
      setActiveModel('System');

      if (fromTelegram) {
          setTgOutgoing(prev => [...prev, {
              botId: fromTelegram.botId, 
              chatId: fromTelegram.chatId, 
              text: `✅ Workflow [${type}] Complete.\n\nResult:\n${result.substring(0, 3000)}` 
          }]);
      }
    } catch (error: any) {
      setAgentSpeech("Sequence aborted.");
      setState(prev => ({ ...prev, isRunning: false }));
      activeBotTriggerRef.current = null;

      if (fromTelegram) {
          setTgOutgoing(prev => [...prev, {
              botId: fromTelegram.botId, 
              chatId: fromTelegram.chatId, 
              text: `❌ Workflow Failed: ${error.message}` 
          }]);
      }
    }
  };

  const handleTelegramCommand = (botId: string, chatId: string, cmd: string, args: string) => {
      addLog({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString(), source: 'System', message: `Telegram CMD received: /${cmd} ${args}`, type: 'info' });
      setTgLogs(prev => [...prev, { botId, message: `CMD: /${cmd}` }]);
      const trigger = { botId, chatId };
      switch (cmd.toLowerCase()) {
          case 'diagnose': handleRunWorkflow(WorkflowType.DIAGNOSE, args || "Full system diagnosis", trigger); break;
          case 'code': handleRunWorkflow(WorkflowType.CODE_GEN, args, trigger); break;
          case 'fix': handleRunWorkflow(WorkflowType.FIX_BUG, args, trigger); break;
          case 'check': handleRunWorkflow(WorkflowType.FULL_CHECK, args, trigger); break;
          case 'route': handleRunWorkflow(WorkflowType.SMART_ROUTE, args, trigger); break;
          case 'pr': handleRunWorkflow(WorkflowType.GITHUB_PR, args, trigger); break;
          case 'deploy': handleRunWorkflow(WorkflowType.DEPLOY_CF, args || "production", trigger); break;
          case 'learn': handleRunWorkflow(WorkflowType.LEARN_SKILL, args, trigger); break;
          case 'self': handleRunWorkflow(WorkflowType.SELF_DIAGNOSE, "Self integrity check", trigger); break;
          case 'start': 
              setTgOutgoing(prev => [...prev, {botId, chatId, text: "CORE AI Orchestrator Online.\n\nAvailable commands:\n/diagnose\n/code <prompt>\n/route <task>\n/deploy\n/self\n/learn <resource>"}]);
              break;
          default:
              setTgOutgoing(prev => [...prev, {botId, chatId, text: `Unknown directive: ${cmd}. use /start for manual.`}]);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setState(prev => ({ ...prev, isRunning: true, currentStage: WorkflowType.VISION }));
      const result = await runVisionWorkflow(base64, file.type, input, addLog);
      setState(prev => ({ ...prev, isRunning: false, result }));
    };
    reader.readAsDataURL(file);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  // Dynamic Theme Text Color Logic
  const isLightTheme = currentTheme === AppTheme.CLASSIC || currentTheme === AppTheme.RENAISSANCE;
  const textColorClass = isLightTheme ? 'text-slate-800' : 'text-slate-200';
  const panelBgClass = isLightTheme ? 'bg-white/80 border-black/10' : 'bg-black/80 border-white/10';

  const themes = [
    { id: AppTheme.CYBERPUNK, label: 'CYBER', color: 'bg-cyan-500' },
    { id: AppTheme.CLASSIC, label: 'CLASSIC', color: 'bg-slate-300' },
    { id: AppTheme.RENAISSANCE, label: 'REN', color: 'bg-amber-600' },
    { id: AppTheme.OIL_PAINTING, label: 'OIL', color: 'bg-orange-800' },
    { id: AppTheme.REALISTIC, label: 'REAL', color: 'bg-emerald-500' },
  ];

  return (
    <div className={`relative w-full h-screen overflow-hidden font-sans select-none flex ${textColorClass} transition-colors duration-1000`}>
      <div className="absolute inset-0 z-0 bg-gray-900">
          <AgentScene 
            onAgentClick={(id) => handleRunWorkflow(WorkflowType.SMART_ROUTE, `Agent interaction: ${id}`)} 
            isProcessing={state.isRunning}
            isLearning={isFeedingBread}
            isGlitched={state.isGlitched}
            activeAgent={activeModel}
            agentSpeech={agentSpeech}
            agentStyles={agentStyles}
            theme={currentTheme}
          />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col pointer-events-none p-4 gap-4">
        <header className="flex justify-between items-start pointer-events-auto h-16">
           <div className="flex gap-4">
              <div className={`backdrop-blur-md border rounded-2xl p-3 flex items-center gap-4 shadow-2xl ${panelBgClass}`}>
                <div className={`w-3 h-3 rounded-full ${state.isRunning ? 'bg-amber-400 animate-pulse' : 'bg-cyan-500'}`}></div>
                <div>
                   <h1 className={`text-xs font-black tracking-tighter uppercase leading-none ${isLightTheme ? 'text-black' : 'text-white'}`}>ORCHESTRATOR::NODE_01</h1>
                   <div className="flex items-center gap-2 mt-1">
                       <p className={`text-[9px] font-mono tracking-widest uppercase ${isLightTheme ? 'text-black/50' : 'text-white/40'}`}>
                           {state.isRunning ? `BUSY // ${state.currentStage}` : 'READY'}
                       </p>
                       <div className={`w-[1px] h-2 ${isLightTheme ? 'bg-black/20' : 'bg-white/20'}`}></div>
                       <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-full border ${
                           apiStatus === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 
                           apiStatus === 'OFFLINE' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                       }`}>
                           <div className={`w-1 h-1 rounded-full ${
                               apiStatus === 'ONLINE' ? 'bg-emerald-500' : 
                               apiStatus === 'OFFLINE' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500 animate-ping'
                           }`}></div>
                           <span className="text-[7px] font-black tracking-widest leading-none">UPLINK::{apiStatus}</span>
                       </div>
                   </div>
                </div>
              </div>
           </div>
           
           <div className="flex gap-3">
              {/* Theme Selector */}
              <div className={`backdrop-blur-md border rounded-2xl p-1.5 flex gap-1 shadow-2xl ${panelBgClass}`}>
                  {themes.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setCurrentTheme(t.id)}
                        className={`px-3 py-1.5 rounded-xl flex items-center justify-center text-[9px] font-black tracking-wider transition-all hover:scale-105 ${
                          currentTheme === t.id 
                            ? `${t.color} text-white shadow-lg` 
                            : `${isLightTheme ? 'text-black/40 hover:bg-black/5' : 'text-white/30 hover:bg-white/10'}`
                        }`}
                        title={t.label}
                      >
                          {t.label}
                      </button>
                  ))}
              </div>

              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className={`w-10 h-10 rounded-2xl backdrop-blur-md border flex items-center justify-center transition-colors ${panelBgClass} ${isLightTheme ? 'text-black/50 hover:text-black' : 'text-white/30 hover:text-cyan-400'}`}
                title="Agent Configuration"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              </button>
              <button 
                onClick={() => setIsLiveActive(!isLiveActive)}
                className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${isLiveActive ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : `${panelBgClass} ${isLightTheme ? 'text-black/50 hover:text-red-500' : 'text-white/30 hover:text-white'}`}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-3m4-8a3 3 0 01-3 3H9a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v4z" /></svg>
              </button>
              <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${leftPanelOpen ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : `${panelBgClass} ${isLightTheme ? 'text-black/50 hover:text-black' : 'text-white/30 hover:text-white'}`}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </button>
           </div>
        </header>

        <main className="flex-1 flex gap-6 overflow-hidden relative">
            <div className={`transition-all duration-500 ${leftPanelOpen ? 'w-[340px] opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
               <TelegramWidget 
                  bots={bots}
                  onUpdateBots={handleBotsChange}
                  onCommand={handleTelegramCommand} 
                  onHealthChange={() => {}} 
                  logs={tgLogs} 
                  theme={currentTheme}
               />
            </div>
            
            <div className="flex-1 flex items-center justify-center relative">
               {isLiveActive && (
                 <div className="absolute inset-0 z-50 pointer-events-auto">
                    <LiveAudioInterface onClose={() => setIsLiveActive(false)} addLog={addLog} />
                 </div>
               )}
               {state.result && (
                  <div className={`w-full max-w-2xl backdrop-blur-3xl border rounded-3xl p-0 shadow-2xl pointer-events-auto animate-fade-in-up flex flex-col max-h-[70vh] ${panelBgClass}`}>
                      <div className={`flex justify-between items-center px-6 py-4 border-b rounded-t-3xl ${isLightTheme ? 'border-black/5 bg-black/5' : 'border-white/5 bg-white/5'}`}>
                          <span className="text-[10px] font-black font-mono text-cyan-500 uppercase tracking-[0.2em]">Payload_Output</span>
                          <div className="flex gap-2">
                             <button onClick={() => playTTS(state.result!)} className={`${isLightTheme ? 'text-black/50 hover:text-black' : 'text-white/20 hover:text-white'} p-1`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.982 5.982 0 0115 10a5.982 5.982 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.982 3.982 0 0013 10a3.982 3.982 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                             </button>
                             <button onClick={() => setState(s => ({...s, result: null}))} className={`${isLightTheme ? 'text-black/50 hover:text-black' : 'text-white/20 hover:text-white'}`}>✕</button>
                          </div>
                      </div>
                      <div className={`p-6 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed ${isLightTheme ? 'text-slate-700' : 'text-slate-300'}`}>
                          {state.result}
                      </div>
                  </div>
               )}
            </div>

            <div className={`transition-all duration-500 ${rightPanelOpen ? 'w-[400px] opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
               <TerminalWindow logs={state.logs} isProcessing={state.isRunning} theme={currentTheme} />
            </div>
        </main>

        <footer className="h-40 flex justify-center items-end pointer-events-auto">
            <div className={`w-full max-w-5xl backdrop-blur-2xl border rounded-3xl p-5 shadow-2xl flex gap-6 items-center ${panelBgClass}`}>
                <div className="flex-1 relative flex items-center">
                    <textarea 
                        className={`w-full border text-[13px] py-4 px-5 pr-12 rounded-2xl outline-none resize-none h-20 font-mono transition-all custom-scrollbar leading-relaxed ${isLightTheme ? 'bg-white/50 border-black/10 text-black placeholder:text-black/30 focus:border-cyan-500' : 'bg-black/50 border-white/5 text-white placeholder:text-white/10 focus:border-cyan-500/40'}`}
                        placeholder={isThinkingMode ? "DEEP_REASONING_MODE_ACTIVE..." : "INPUT_DIRECTIVE_VECTOR_HERE..."}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={`absolute right-4 transition-colors ${isLightTheme ? 'text-black/30 hover:text-cyan-600' : 'text-white/20 hover:text-cyan-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                    <button 
                        onClick={() => handleRunWorkflow(WorkflowType.SMART_ROUTE)}
                        disabled={state.isRunning || !input.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-black h-12 px-10 rounded-2xl text-[11px] font-black tracking-widest shadow-2xl disabled:opacity-20 uppercase"
                    >
                       EXECUTE
                    </button>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsThinkingMode(!isThinkingMode)}
                        className={`text-[9px] font-black px-3 py-1.5 rounded-xl transition-all border ${isThinkingMode ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : `${isLightTheme ? 'bg-black/5 border-black/5 text-black/40' : 'bg-white/5 border-white/5 text-white/30'}`}`}
                      >
                         THINKING_32K
                      </button>
                    </div>
                </div>
            </div>
        </footer>

        <LearnSkillModal isOpen={isLearnModalOpen} onClose={() => setIsLearnModalOpen(false)} onIngest={(val) => handleRunWorkflow(WorkflowType.LEARN_SKILL, val)} isProcessing={state.isRunning} />
        <AgentSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} agentStyles={agentStyles} onUpdateStyle={updateAgentStyle} />
      </div>
    </div>
  );
};

export default App;

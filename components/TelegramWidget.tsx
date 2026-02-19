
import React, { useState, useEffect, useRef } from 'react';
import { BotProfile, AppTheme } from '../types';

interface TelegramWidgetProps {
  bots: BotProfile[];
  onUpdateBots: (bots: BotProfile[]) => void;
  onCommand: (botId: string, chatId: string, cmd: string, args: string) => void;
  onHealthChange?: (isHealthy: boolean) => void;
  logs: { botId: string; message: string }[];
  theme?: AppTheme;
}

const TelegramWidget: React.FC<TelegramWidgetProps> = ({ 
  bots, 
  onUpdateBots, 
  onCommand, 
  onHealthChange, 
  logs,
  theme = AppTheme.CYBERPUNK
}) => {
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  
  const [simulatedInput, setSimulatedInput] = useState('');

  const offsetsRef = useRef<Record<string, number>>({});
  
  // Helpers for theme
  const isLightTheme = theme === AppTheme.CLASSIC || theme === AppTheme.RENAISSANCE;
  const bgClass = isLightTheme ? 'bg-white/80 border-black/10' : 'bg-black/80 border-white/10';
  const textMain = isLightTheme ? 'text-black/80' : 'text-white/80';
  const textDim = isLightTheme ? 'text-black/40' : 'text-white/40';
  const borderClass = isLightTheme ? 'border-black/5' : 'border-white/5';

  // Set active bot initially
  useEffect(() => {
    if (bots.length > 0 && !activeBotId) {
      setActiveBotId(bots[0].id);
    } else if (bots.length === 0) {
      setIsConfiguring(true);
    }
  }, [bots, activeBotId]);

  // Update health
  useEffect(() => {
    const anyError = bots.some(b => b.lastError);
    onHealthChange?.(!anyError);
  }, [bots, onHealthChange]);

  // Polling for Updates
  useEffect(() => {
    const intervalId = setInterval(async () => {
      let botsUpdated = false;
      const newBots = [...bots];

      for (let i = 0; i < newBots.length; i++) {
        const bot = newBots[i];
        if (bot.isActive && bot.isPolling && bot.botToken && bot.platform === 'telegram') {
           try {
             const offset = offsetsRef.current[bot.id] || 0;
             const url = `https://api.telegram.org/bot${bot.botToken}/getUpdates?offset=${offset + 1}&timeout=5`;
             
             let res;
             try {
                res = await fetch(url);
             } catch (networkErr: any) {
                // Handle Network Errors (Offline, DNS, etc)
                const errorMsg = "网络连接失败 (Network Error)";
                if (bot.lastError !== errorMsg) {
                    newBots[i] = { ...bot, lastError: errorMsg };
                    botsUpdated = true;
                }
                continue;
             }
             
             // Handle HTTP Status Errors
             if (!res.ok) {
                 let errorMsg = `HTTP Error: ${res.status}`;
                 if (res.status === 401) errorMsg = "授权失败 (401): Token 无效";
                 else if (res.status === 404) errorMsg = "未找到 (404): Bot 不存在或 Token 错误";
                 else if (res.status === 409) errorMsg = "冲突 (409): Webhook 占用中";
                 else if (res.status === 429) errorMsg = "请求过多 (429): 请稍候";

                 try {
                     const errData = await res.json();
                     if (errData.description) errorMsg = `API 错误: ${errData.description}`;
                 } catch (e) { /* Ignore JSON parse error on non-200 responses */ }

                 if (bot.lastError !== errorMsg) {
                     newBots[i] = { ...bot, lastError: errorMsg };
                     botsUpdated = true;
                 }
                 continue;
             }

             const data = await res.json();

             // Handle API logical errors
             if (!data.ok) {
                const errorMsg = data.description || "API 内部错误";
                if (bot.lastError !== errorMsg) {
                    newBots[i] = { ...bot, lastError: errorMsg };
                    botsUpdated = true;
                }
                continue;
             }

             // Clear error if successful
             if (bot.lastError) {
                newBots[i] = { ...bot, lastError: undefined };
                botsUpdated = true;
             }

             // Process Updates
             if (data.result.length > 0) {
               let maxUpdateId = offset;
               for (const update of data.result) {
                 maxUpdateId = Math.max(maxUpdateId, update.update_id);
                 if (update.message && update.message.text) {
                    const text = update.message.text;
                    const chatId = update.message.chat.id.toString();
                    
                    // Simple logic to capture chat ID on first message
                    if (!bot.chatId || bot.chatId !== chatId) {
                         newBots[i] = { ...newBots[i], chatId: chatId };
                         botsUpdated = true;
                    }

                    if (text.startsWith('/')) {
                        const parts = text.split(' ');
                        const cmd = parts[0].substring(1); 
                        const args = parts.slice(1).join(' ');
                        onCommand(bot.id, chatId, cmd, args);
                    }
                 }
               }
               offsetsRef.current[bot.id] = maxUpdateId;
             }
           } catch (err: any) {
             const errorMsg = err.message || "未知系统错误";
             if (bot.lastError !== errorMsg) {
                 newBots[i] = { ...bot, lastError: errorMsg };
                 botsUpdated = true;
             }
           }
        }
      }
      
      if (botsUpdated) {
          onUpdateBots(newBots);
      }
    }, 3000); 

    return () => clearInterval(intervalId);
  }, [bots, onCommand, onUpdateBots]);

  const activeBot = bots.find(b => b.id === activeBotId);
  const currentLogs = logs.filter(l => l.botId === activeBotId);

  const handleAddBot = () => {
    if (!newBotName || !newBotToken) return;
    const newBot: BotProfile = {
      id: crypto.randomUUID(),
      name: newBotName,
      platform: 'telegram',
      botToken: newBotToken,
      chatId: '',
      isActive: true,
      isPolling: true
    };
    onUpdateBots([...bots, newBot]);
    setActiveBotId(newBot.id);
    setNewBotName('');
    setNewBotToken('');
    setIsConfiguring(false);
  };

  const handleDeleteBot = (id: string) => {
    onUpdateBots(bots.filter(b => b.id !== id));
    if (activeBotId === id) setActiveBotId(null);
  };

  return (
    <div className={`${bgClass} backdrop-blur-xl rounded-2xl border overflow-hidden flex flex-col h-full shadow-2xl transition-colors duration-500`}>
      
      {/* Header */}
      <div className={`${isLightTheme ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'} px-4 py-3 border-b flex justify-between items-center select-none`}>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${activeBot?.lastError ? 'bg-red-500 animate-pulse' : 'bg-cyan-500 shadow-[0_0_5px_#06b6d4]'}`}></div>
          <span className={`font-black text-[9px] tracking-[0.2em] uppercase ${textDim}`}>通信安全_SECURE</span>
        </div>
        <button onClick={() => setIsConfiguring(!isConfiguring)} className={`text-[9px] uppercase font-black transition-colors ${textDim} hover:text-cyan-500`}>
          {isConfiguring ? '关闭' : '设置'}
        </button>
      </div>

      {isConfiguring ? (
        <div className={`p-4 flex flex-col gap-4 overflow-y-auto h-full custom-scrollbar ${isLightTheme ? 'bg-black/5' : 'bg-black/40'}`}>
          <div className="space-y-2">
            {bots.map(bot => (
              <div key={bot.id} className={`${isLightTheme ? 'bg-white border-black/5' : 'bg-white/5 border-white/5'} p-3 rounded-xl border ${bot.lastError ? 'border-red-500/50 bg-red-500/5' : ''} flex flex-col gap-2 transition-all hover:scale-[1.02]`}>
                <div className="flex justify-between items-center">
                    <div className={`font-bold text-[10px] font-mono ${textMain}`}>{bot.name}</div>
                    <button onClick={() => handleDeleteBot(bot.id)} className={`${textDim} hover:text-red-400 transition-colors`}>✕</button>
                </div>
                {bot.lastError && <div className="text-[8px] text-red-400 font-mono bg-red-950/20 p-1.5 rounded uppercase tracking-tighter">⚠️ {bot.lastError}</div>}
                {bot.chatId ? <div className="text-[8px] text-emerald-500 font-mono">LINKED: {bot.chatId}</div> : <div className="text-[8px] text-yellow-500 font-mono animate-pulse">WAITING FOR MSG...</div>}
              </div>
            ))}
          </div>
          
          <div className={`mt-auto pt-4 border-t ${borderClass} space-y-3`}>
             <div className="space-y-1">
                <label className={`text-[8px] uppercase font-black pl-1 ${textDim}`}>别名</label>
                <input className={`w-full border rounded-lg p-2.5 text-xs outline-none focus:border-cyan-500/30 transition-all ${isLightTheme ? 'bg-white text-black border-black/10' : 'bg-black/60 text-white border-white/10'}`} value={newBotName} onChange={e => setNewBotName(e.target.value)} />
             </div>
             <div className="space-y-1">
                <label className={`text-[8px] uppercase font-black pl-1 ${textDim}`}>Token</label>
                <input className={`w-full border rounded-lg p-2.5 text-xs outline-none focus:border-cyan-500/30 transition-all ${isLightTheme ? 'bg-white text-black border-black/10' : 'bg-black/60 text-white border-white/10'}`} value={newBotToken} type="password" onChange={e => setNewBotToken(e.target.value)} />
             </div>
             <button onClick={handleAddBot} className="w-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 text-[10px] py-3 rounded-xl font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all active:scale-95">添加上行链路</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-[10px] custom-scrollbar">
            {activeBot?.lastError && (
                <div className="border border-red-500/30 bg-red-500/5 p-3 rounded-xl text-red-400 text-[9px] animate-pulse font-black uppercase tracking-tighter">
                   严重: 链路中断 / {activeBot.lastError}
                </div>
            )}
            {!activeBot && <div className={`${textDim} text-center mt-10`}>No Uplink Active</div>}
            
            {currentLogs.map((log, i) => (
              <div key={i} className="flex gap-2 group">
                 <span className={`${textDim} shrink-0 select-none`}>{'>>'}</span>
                 <p className={`${isLightTheme ? 'text-black/70 group-hover:text-black' : 'text-white/60 group-hover:text-white'} leading-relaxed transition-colors break-all`}>{log.message}</p>
              </div>
            ))}
          </div>
          <div className={`p-3 border-t ${borderClass} ${isLightTheme ? 'bg-black/5' : 'bg-white/5'} flex gap-2`}>
             <input 
                className={`flex-1 text-[10px] rounded-xl px-4 py-2.5 outline-none border focus:border-cyan-500/30 transition-all font-mono ${isLightTheme ? 'bg-white text-black border-black/10' : 'bg-black/40 text-white border-white/10'}`}
                placeholder="模拟指令 (/diagnose)..." 
                value={simulatedInput} 
                onChange={e => setSimulatedInput(e.target.value)} 
                onKeyDown={e => {
                    if (e.key === 'Enter' && activeBotId) {
                        const cmd = simulatedInput.replace('/','').split(' ')[0];
                        const args = simulatedInput.split(' ').slice(1).join(' ');
                        onCommand(activeBotId, activeBot?.chatId || '0', cmd, args);
                        setSimulatedInput('');
                    }
                }} 
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramWidget;

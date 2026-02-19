
import React, { useState, useRef } from 'react';
import { AgentStyle } from '../types';
import { AGENT_PROFILES, DEFAULT_AGENT_ID } from '../agentProfiles';

interface AgentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentStyles: AgentStyle[];
  onUpdateStyle: (style: AgentStyle) => void;
}

const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({ isOpen, onClose, agentStyles, onUpdateStyle }) => {
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_AGENT_ID);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const activeProfile = AGENT_PROFILES.find(profile => profile.id === activeTab) || AGENT_PROFILES[0];
  const currentStyle: AgentStyle = agentStyles.find(s => s.id === activeTab) || {
    id: activeProfile.id,
    ...activeProfile.defaultStyle
  };

  const handleUpdate = (updates: Partial<AgentStyle>) => {
      onUpdateStyle({ ...currentStyle, ...updates });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
              handleUpdate({ textureUrl: reader.result as string, faceType: 'texture' });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden h-[80vh]">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <h2 className="text-xs font-black tracking-[0.2em] text-white uppercase">Neural_Shell_Config</h2>
             </div>
             <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">✕</button>
          </div>

          <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-48 border-r border-white/10 bg-black/20 p-4 space-y-2">
                  {AGENT_PROFILES.map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => setActiveTab(profile.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === profile.id ? 'bg-white/10 text-white border border-white/10' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                      >
                          <div className="flex flex-col">
                            <span>{profile.codename}</span>
                            <span className="text-[8px] normal-case tracking-normal opacity-60">{profile.displayName}</span>
                          </div>
                      </button>
                  ))}
              </div>

              {/* Content */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
                  
                  {/* Appearance Section */}
                  <div className="space-y-4">
                      <h3 className="text-[9px] text-white/40 uppercase font-black tracking-widest border-b border-white/5 pb-2">Geometry & Form</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-[9px] text-white/60 uppercase">Chassis Shape</label>
                              <div className="grid grid-cols-2 gap-2">
                                  {['sphere', 'box', 'octahedron', 'dodecahedron'].map((shape) => (
                                      <button 
                                        key={shape}
                                        onClick={() => handleUpdate({ shape: shape as any })}
                                        className={`px-2 py-2 text-[8px] uppercase border rounded-lg transition-all ${currentStyle.shape === shape ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-white/10 text-white/30'}`}
                                      >
                                          {shape}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="space-y-2">
                              <label className="text-[9px] text-white/60 uppercase">Appendages</label>
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleUpdate({ hasBody: !currentStyle.hasBody })}
                                    className={`flex-1 py-2 text-[8px] uppercase border rounded-lg ${currentStyle.hasBody ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-white/10 text-white/30'}`}
                                  >
                                      Body
                                  </button>
                                  <button 
                                    onClick={() => handleUpdate({ hasArms: !currentStyle.hasArms })}
                                    className={`flex-1 py-2 text-[8px] uppercase border rounded-lg ${currentStyle.hasArms ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-white/10 text-white/30'}`}
                                  >
                                      Arms
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Surface Section */}
                  <div className="space-y-4">
                      <h3 className="text-[9px] text-white/40 uppercase font-black tracking-widest border-b border-white/5 pb-2">Surface & Interface</h3>
                      
                      <div className="space-y-2">
                          <label className="text-[9px] text-white/60 uppercase">Core Color</label>
                          <input 
                            type="color" 
                            value={currentStyle.color} 
                            onChange={(e) => handleUpdate({ color: e.target.value })}
                            className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                          />
                      </div>

                      <div className="space-y-2">
                          <label className="text-[9px] text-white/60 uppercase">Face Module</label>
                          <div className="flex gap-2">
                              {['human', 'visor', 'monitor', 'texture'].map(ft => (
                                  <button
                                    key={ft}
                                    onClick={() => handleUpdate({ faceType: ft as any })}
                                    className={`flex-1 py-2 text-[8px] uppercase border rounded-lg ${currentStyle.faceType === ft ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'border-white/10 text-white/30'}`}
                                  >
                                      {ft}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {currentStyle.faceType === 'human' && (
                          <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                  <label className="text-[9px] text-white/60 uppercase">Skin Tone</label>
                                  <input
                                    type="color"
                                    value={currentStyle.skinTone || '#f1c7a8'}
                                    onChange={(e) => handleUpdate({ skinTone: e.target.value })}
                                    className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[9px] text-white/60 uppercase">Hair Color</label>
                                  <input
                                    type="color"
                                    value={currentStyle.hairColor || '#312e81'}
                                    onChange={(e) => handleUpdate({ hairColor: e.target.value })}
                                    className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                  />
                              </div>
                          </div>
                      )}

                      {currentStyle.faceType === 'texture' && (
                          <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                              <div className="flex justify-between items-center">
                                  <span className="text-[9px] text-white/60 uppercase">Custom Texture Upload</span>
                                  <button onClick={() => fileInputRef.current?.click()} className="text-[9px] text-cyan-400 hover:text-white uppercase font-bold">Select File</button>
                              </div>
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                              {currentStyle.textureUrl && (
                                  <div className="w-16 h-16 rounded-lg bg-cover bg-center border border-white/20" style={{ backgroundImage: `url(${currentStyle.textureUrl})` }}></div>
                              )}
                              <p className="text-[8px] text-white/20">Supports PNG/JPG. Image will be mapped to the agent's front face.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
          
          <div className="bg-black/40 p-4 border-t border-white/10 text-center">
              <span className="text-[8px] text-white/20 font-mono">CHANGES AUTO-SAVED TO LOCAL STORAGE</span>
          </div>
      </div>
    </div>
  );
};

export default AgentSettingsModal;

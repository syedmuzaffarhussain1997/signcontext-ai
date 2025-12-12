import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, ChatMessage } from './types';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  // Default to Fast Model (Flash) to avoid 429 Quota errors on initial load
  const [useFastModel, setUseFastModel] = useState(true); 
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // API Key Management
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [tempKey, setTempKey] = useState('');

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeTab]);

  // Helper to get the correct AI client instance
  const getAiClient = () => {
    const envKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;
    const effectiveKey = customApiKey || envKey;
    
    if (!effectiveKey) {
      throw new Error("Missing API Key. Please click the 'Key' button to add one.");
    }
    return new GoogleGenAI({ apiKey: effectiveKey });
  };

  const handleSaveKey = () => {
    setCustomApiKey(tempKey);
    localStorage.setItem('gemini_api_key', tempKey);
    setShowKeyModal(false);
    setError(null);
  };

  const handleClearKey = () => {
    setCustomApiKey('');
    setTempKey('');
    localStorage.removeItem('gemini_api_key');
    setShowKeyModal(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setMediaUrl(URL.createObjectURL(uploadedFile));
      setResult(null);
      setChatHistory([]);
      setError(null);
    }
  };

  const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    // Select model based on toggle
    const modelName = useFastModel ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';

    try {
      const ai = getAiClient();
      const mediaPart = await fileToGenerativePart(file);

      const prompt = `
        Analyze media for accessibility. 
        1. Detect sign language gestures.
        2. Transcribe speech.
        3. Analyze context (environment, tone, nuances).
        4. Explain reasoning briefly.

        Return JSON:
        {
          "signs": [{"timestamp": "MM:SS", "gesture": "...", "meaning": "...", "confidence": 0.0-1.0}],
          "transcript": [{"timestamp": "MM:SS", "speaker": "...", "text": "..."}],
          "context": {
            "environment": "...",
            "tone": "...",
            "nuances": ["..."],
            "culturalNotes": "...",
            "reasoning": "..."
          }
        }
      `;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          role: 'user',
          parts: [mediaPart, { text: prompt }]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              signs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestamp: { type: Type.STRING },
                    gesture: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                  }
                }
              },
              transcript: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestamp: { type: Type.STRING },
                    speaker: { type: Type.STRING },
                    text: { type: Type.STRING },
                  }
                }
              },
              context: {
                type: Type.OBJECT,
                properties: {
                  environment: { type: Type.STRING },
                  tone: { type: Type.STRING },
                  nuances: { type: Type.ARRAY, items: { type: Type.STRING } },
                  culturalNotes: { type: Type.STRING },
                  reasoning: { type: Type.STRING },
                }
              }
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        let cleanText = text.trim();
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
          const parsedResult = JSON.parse(cleanText) as AnalysisResult;
          setResult(parsedResult);
        } catch (parseErr) {
          console.error("JSON Parse Error:", parseErr);
          throw new Error("Analysis result was incomplete. Please try again.");
        }
      } else {
        throw new Error("No response generated.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        setError("Quota Exceeded (429). Please switch to 'Fast Mode' or provide your own API Key via the key icon above.");
      } else {
        setError(err.message || "Failed to analyze media.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim() || !file) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend, timestamp: new Date() };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput('');

    // Use the same model for chat as selected for analysis
    const modelName = useFastModel ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';

    try {
      const ai = getAiClient();
      const mediaPart = await fileToGenerativePart(file);
      
      const historyContext = chatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
      
      const prompt = `
        Context from previous analysis: ${JSON.stringify(result)}
        Chat History:
        ${historyContext}
        
        User Question: ${userMsg.text}
        
        Answer the user's question based on the video/audio file provided. Keep it concise and helpful.
      `;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [mediaPart, { text: prompt }]
        }
      });

      const modelMsg: ChatMessage = { 
        role: 'model', 
        text: response.text || "I couldn't generate a response.", 
        timestamp: new Date() 
      };
      
      setChatHistory((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      const errorText = (err.message?.includes('429') || err.message?.includes('quota')) 
        ? "Error: Quota exceeded. Please set your own API key." 
        : "Error: Could not process request.";
      
      const errorMsg: ChatMessage = { role: 'model', text: errorText, timestamp: new Date() };
      setChatHistory((prev) => [...prev, errorMsg]);
    }
  };

  const filteredSigns = (result?.signs || []).filter(s => s.confidence >= confidenceThreshold);
  
  const timelineItems = [
    ...((result?.transcript || []).map(t => ({ ...t, type: 'transcript' }))),
    ...filteredSigns.map(s => ({ ...s, type: 'sign' }))
  ].sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));

  const suggestedQuestions = [
    "What is the overall mood?",
    "Describe the speaker's surroundings.",
    "Are there any subtle gestures I missed?",
    "Summarize the key points."
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col font-sans relative">
      
      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">API Settings</h3>
            <p className="text-slate-400 text-sm mb-4">
              Enter your Google Gemini API Key to bypass the shared quota limits. 
              Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-400 underline">aistudio.google.com</a>.
            </p>
            <input 
              type="password" 
              placeholder="Paste AIza..." 
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white mb-4 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              {customApiKey && <button onClick={handleClearKey} className="px-4 py-2 text-red-400 hover:text-red-300">Clear Key</button>}
              <button onClick={handleSaveKey} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">Save Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              SignContext
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex text-xs text-slate-400 items-center gap-2">
              <span className={`px-2 py-1 rounded transition-colors ${useFastModel ? 'bg-emerald-900 text-emerald-300' : 'bg-indigo-900 text-indigo-300'}`}>
                {useFastModel ? 'Gemini 2.5 Flash' : 'Gemini 3 Pro'}
              </span>
            </div>
            <button 
              onClick={() => {
                setTempKey(customApiKey);
                setShowKeyModal(true);
              }}
              className={`p-2 rounded-full transition-colors ${customApiKey ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              title="API Key Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 gap-6 grid grid-cols-1 lg:grid-cols-2">
        
        {/* Left Column: Input & Preview */}
        <div className="flex flex-col gap-6">
          
          {/* Upload Area */}
          <div className={`
            border-2 border-dashed rounded-2xl p-8 text-center transition-all
            ${!file ? 'border-slate-600 bg-slate-800/50 hover:border-indigo-500 hover:bg-slate-800' : 'border-indigo-500/50 bg-slate-800'}
          `}>
            <input 
              type="file" 
              accept="video/*,audio/*" 
              onChange={handleFileUpload} 
              className="hidden" 
              id="file-upload"
            />
            
            {!file ? (
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="text-lg font-medium text-slate-200">Upload Video or Audio</span>
                <span className="text-sm text-slate-400">MP4, MOV, MP3, WAV supported</span>
              </label>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full">
                {file.type.startsWith('video') ? (
                  <video src={mediaUrl!} controls className="w-full rounded-lg max-h-[400px] bg-black" />
                ) : (
                  <div className="w-full bg-slate-900 rounded-lg p-6 flex items-center justify-center">
                     <audio src={mediaUrl!} controls className="w-full" />
                  </div>
                )}
                
                <div className="flex justify-between w-full items-center flex-wrap gap-2">
                  <span className="text-sm text-slate-400 truncate max-w-[200px]">{file.name}</span>
                  <div className="flex items-center gap-3">
                    {/* Model Switcher */}
                    <button 
                      onClick={() => setUseFastModel(!useFastModel)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        useFastModel 
                          ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/60' 
                          : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-200 hover:bg-indigo-900/60'
                      }`}
                      title={useFastModel ? "Switch to High Precision" : "Switch to Fast Mode"}
                    >
                      {useFastModel ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                          Fast Mode
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          Deep Logic
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                    >
                      {analyzing ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : 'Analyze Context'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Context Card (if result exists) */}
          {result && result.context && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 animate-fadeIn">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Contextual Reasoning
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Environment</p>
                  <p className="text-sm text-slate-200">{result.context.environment || 'N/A'}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tone</p>
                  <p className="text-sm text-slate-200">{result.context.tone || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(result.context.nuances || []).map((nuance, i) => (
                    <span key={i} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/30">
                      {nuance}
                    </span>
                  ))}
                </div>
                
                <div className="bg-amber-900/20 border-l-2 border-amber-600 p-3 rounded-r">
                  <p className="text-sm text-amber-200/80 italic">"{result.context.reasoning || 'No reasoning available'}"</p>
                </div>
                
                {result.context.culturalNotes && (
                  <p className="text-xs text-slate-400 mt-2">
                    <strong className="text-slate-300">Cultural Note:</strong> {result.context.culturalNotes}
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
             <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg text-red-200 text-sm flex items-center gap-3">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <span className="flex-1">{error}</span>
               {error.includes('Quota') && (
                 <button 
                   onClick={() => setShowKeyModal(true)}
                   className="whitespace-nowrap bg-red-800 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                 >
                   Set Key
                 </button>
               )}
             </div>
          )}
        </div>

        {/* Right Column: Output & Chat */}
        <div className="flex flex-col h-[600px] lg:h-auto bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden relative">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'analysis' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
            >
              Captions & Signs
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'chat' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
            >
              Ask Gemini
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 relative">
            
            {activeTab === 'analysis' ? (
              <>
                {!result ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-center px-6">
                      {analyzing 
                        ? 'Analyzing media content... (Large videos may take a minute)' 
                        : 'Upload media to see captions and sign translations.'}
                    </p>
                    {analyzing && !useFastModel && (
                       <p className="text-xs text-indigo-400 animate-pulse">Using Deep Reasoning (Pro Model)</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Settings / Filters */}
                    <div className="flex items-center justify-between mb-4 bg-slate-900/30 p-2 rounded">
                      <label className="text-xs text-slate-400 flex items-center gap-2">
                        Sign Confidence Threshold:
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1" 
                          value={confidenceThreshold} 
                          onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                          className="w-24 accent-indigo-500"
                        />
                        <span className="w-8 text-right">{Math.round(confidenceThreshold * 100)}%</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      {timelineItems.length === 0 && (
                        <p className="text-center text-slate-500 text-sm">No segments detected above confidence threshold.</p>
                      )}
                      
                      {timelineItems.map((item: any, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border-l-4 ${item.type === 'sign' ? 'bg-indigo-900/20 border-indigo-500' : 'bg-slate-700/30 border-slate-500'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-1 rounded">{item.timestamp}</span>
                            {item.type === 'sign' && (
                              <span className={`text-[10px] px-1.5 rounded uppercase font-bold 
                                ${item.confidence > 0.8 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}
                              `}>
                                Sign {(item.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          
                          {item.type === 'sign' ? (
                            <>
                              <p className="text-sm font-semibold text-indigo-300">{item.gesture}</p>
                              <p className="text-sm text-slate-300 mt-1">"{item.meaning}"</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-slate-400 mb-0.5">{item.speaker}</p>
                              <p className="text-sm text-slate-200">{item.text}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col">
                 <div className="flex-1 space-y-4 mb-4">
                   {chatHistory.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
                       <p className="text-center text-slate-500 text-sm">Ask Gemini for details missed in the analysis.</p>
                       <div className="flex flex-wrap gap-2 justify-center">
                         {suggestedQuestions.map((q, idx) => (
                           <button 
                             key={idx}
                             onClick={() => handleSendMessage(q)}
                             className="text-xs bg-slate-700 hover:bg-slate-600 text-indigo-300 border border-slate-600 px-3 py-1.5 rounded-full transition-colors"
                           >
                             {q}
                           </button>
                         ))}
                       </div>
                     </div>
                   )}
                   {chatHistory.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                         msg.role === 'user' 
                           ? 'bg-indigo-600 text-white rounded-br-none' 
                           : 'bg-slate-700 text-slate-200 rounded-bl-none'
                       }`}>
                         {msg.text}
                       </div>
                     </div>
                   ))}
                   <div ref={chatEndRef} />
                 </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          {activeTab === 'chat' && (
            <div className="p-3 border-t border-slate-700 bg-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Clarify this sign? What was said?"
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || !file}
                  className="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer / Disclaimer */}
      <footer className="bg-slate-900 border-t border-slate-800 p-4 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-slate-500">
            <span className="text-amber-500 font-bold">DISCLAIMER:</span> Not for medical use. AI interpretations of sign language and context may not be 100% accurate. Consult professional interpreters for critical situations.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

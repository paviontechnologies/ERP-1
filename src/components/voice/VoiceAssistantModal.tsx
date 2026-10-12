'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Table as TableIcon,
} from 'lucide-react';

interface DataCard {
  type: 'metric' | 'table' | 'alert' | 'confirmation';
  title: string;
  metrics?: { label: string; value: string; trend?: string; color?: string }[];
  headers?: string[];
  rows?: (string | number)[][];
  alertMessage?: string;
}

interface MessageHistoryItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  detectedLang?: string;
  intent?: string;
  dataCard?: DataCard;
  actionProposed?: boolean;
  proposedActionDetails?: any;
}

export function VoiceAssistantModal() {
  const { isVoiceOpen, setIsVoiceOpen, role, currentUser } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [language, setLanguage] = useState<'auto' | 'hi-IN' | 'en-US'>('auto');
  const [messages, setMessages] = useState<MessageHistoryItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Namaste ${currentUser.name}! I am your AI ERP Voice Assistant. You can ask me questions about sales, inventory, finance, payroll, or tell me to execute operations in English, Hindi, or Hinglish.`,
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Setup Web Speech API Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi-IN' ? 'hi-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (transcript.trim()) {
          handleSendMessage(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [language, transcript]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVoiceOpen) {
        setIsVoiceOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVoiceOpen, setIsVoiceOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type commands in the chat bar below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const speakText = (text: string) => {
    if (!speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('IN'));
    if (indianVoice) utterance.voice = indianVoice;

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (text: string, confirmed: boolean = false, slots?: any) => {
    if (!text.trim() && !slots) return;

    const userMsgId = String(Date.now());
    if (!confirmed) {
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, sender: 'user', text: text.trim() },
      ]);
      setChatInput('');
      setTranscript('');
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          role,
          confirmed,
          slots,
        }),
      });

      const data = await res.json();

      if (data.success && data.result) {
        const assistantMsg: MessageHistoryItem = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: data.result.displayText || data.result.spokenResponse,
          intent: data.result.intent,
          dataCard: data.result.dataCard,
          actionProposed: data.result.actionProposed,
          proposedActionDetails: data.result.proposedActionDetails,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        speakText(data.result.spokenResponse);
      } else {
        const errorMsg: MessageHistoryItem = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: data.error || 'Failed to process voice command',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), sender: 'assistant', text: 'Error connecting to ERP voice service.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Aaj company ki total sales kitni hain?',
    "Show me this month's revenue and expenses",
    'Show products with low stock',
    'Create a draft purchase order for 100 units of product X',
    'How many employees are present today?',
    'Which department exceeded its budget?',
    'Show all overdue customer invoices',
    'Show me sales orders that cannot be fulfilled because of low stock',
    'Find unpaid invoices for orders that have already been delivered',
    'Compare procurement spending with the finance budget',
  ];

  if (!isVoiceOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-white">Apex AI Voice ERP Assistant</h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Multilingual AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Operating as: <span className="text-slate-200 font-medium">{currentUser.name}</span> ({role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSpeechEnabled(!speechEnabled)}
              title={speechEnabled ? 'Mute Speech' : 'Enable Speech'}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {speechEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            </button>
            <button
              onClick={() => setIsVoiceOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-none shadow-md'
                }`}
              >
                {msg.intent && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1">
                    <span>INTENT: {msg.intent}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Data Card Representation */}
                {msg.dataCard && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      {msg.dataCard.title}
                    </h4>

                    {/* Metric Cards */}
                    {msg.dataCard.metrics && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {msg.dataCard.metrics.map((m, idx) => (
                          <div key={idx} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-[11px] text-slate-400 block">{m.label}</span>
                            <span
                              className={`text-sm font-bold block mt-0.5 ${
                                m.color === 'emerald'
                                  ? 'text-emerald-400'
                                  : m.color === 'rose'
                                  ? 'text-rose-400'
                                  : m.color === 'amber'
                                  ? 'text-amber-400'
                                  : 'text-white'
                              }`}
                            >
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Table View */}
                    {msg.dataCard.rows && msg.dataCard.headers && (
                      <div className="overflow-x-auto rounded-lg border border-slate-800 mt-2 bg-slate-900/40">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-800/80 text-slate-300">
                            <tr>
                              {msg.dataCard.headers.map((h, i) => (
                                <th key={i} className="px-3 py-2 font-medium">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-200">
                            {msg.dataCard.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-800/40">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="px-3 py-2 font-mono">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirmation Preview Card for High-Impact Actions */}
                {msg.actionProposed && (
                  <div className="mt-3 p-3 bg-amber-950/30 border border-amber-600/40 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Security Guardrail: Authorization Required</span>
                    </div>
                    <p className="text-xs text-amber-200/90">
                      Executing this operation will create an authoritative database record in Procurement with financial liability.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() =>
                          handleSendMessage(
                            `Confirm: ${msg.proposedActionDetails?.intent}`,
                            true,
                            msg.proposedActionDetails?.slots
                          )
                        }
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm & Execute Action
                      </button>
                      <button
                        onClick={() =>
                          setMessages((prev) => [
                            ...prev,
                            { id: String(Date.now()), sender: 'assistant', text: 'Operation cancelled by user.' },
                          ])
                        }
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking / Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Analyzing intent & querying PostgreSQL database...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions Chips */}
        <div className="px-6 py-2 border-t border-slate-800/80 bg-slate-900/60 overflow-x-auto flex gap-2 no-scrollbar">
          {quickPrompts.slice(0, 5).map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] whitespace-nowrap px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full border border-slate-700/60 transition-colors flex items-center gap-1"
            >
              <span>{prompt}</span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
            </button>
          ))}
        </div>

        {/* Voice Audio Recording Waveform & Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
          {isListening && (
            <div className="flex items-center justify-center gap-1.5 py-1 text-blue-400">
              <div className="w-1 h-3 bg-blue-500 animate-pulse rounded-full" />
              <div className="w-1 h-6 bg-blue-400 animate-pulse delay-75 rounded-full" />
              <div className="w-1 h-8 bg-indigo-400 animate-pulse delay-150 rounded-full" />
              <div className="w-1 h-5 bg-blue-400 animate-pulse delay-100 rounded-full" />
              <div className="w-1 h-2 bg-blue-500 animate-pulse rounded-full" />
              <span className="text-xs font-medium text-blue-400 ml-2">
                Listening in Hindi / English / Hinglish...
              </span>
            </div>
          )}

          {transcript && (
            <div className="text-xs text-slate-300 italic text-center px-4">
              "{transcript}"
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Mic Button */}
            <button
              onClick={toggleListening}
              className={`p-3 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-4 ring-rose-600/20 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 hover:scale-105'
              }`}
              title={isListening ? 'Stop listening' : 'Start speaking'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Chat Input Fallback */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(chatInput);
                  }
                }}
                placeholder="Ask in Hindi, English, or Hinglish (e.g. 'Aaj total sales kitni hain?')..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => handleSendMessage(chatInput)}
                disabled={!chatInput.trim() || isLoading}
                className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-blue-400 disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

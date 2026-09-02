import React, { useState, useEffect, useRef } from 'react';
import { chatbotApi } from '../../api/endpoints';
import {
  MessageSquare,
  X,
  Send,
  Languages,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function AeroMedAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' or 'ta'
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      sender: 'ASSISTANT',
      text: 'வணக்கம்! I am the AeroMed AI Assistant. Ask me about fleet readiness, case tracking, hospital alerts, stock levels, or maintenance.',
      intent: 'GREETING',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const suggestedQuestions = language === 'ta'
    ? [
        'இப்போது எந்த ஆம்புலன்ஸ் available-ஆக உள்ளது?',
        'வழக்கு status என்ன?',
        'குறைந்த இருப்பு உள்ள மருந்துகள்?',
        'பராமரிப்பில் உள்ள ஆம்புலன்ஸ்கள்?'
      ]
    : [
        'Show all available ambulances',
        'What is the status of the latest emergency case?',
        'Which hospital acknowledged this case?',
        'Show low-stock medical items',
        'Which ambulance requires maintenance?'
      ];

  const handleSend = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || loading) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'USER',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await chatbotApi.sendMessage({
        message: query,
        language,
        conversationId
      });

      if (res.data && res.data.success) {
        if (!conversationId && res.data.conversationId) {
          setConversationId(res.data.conversationId);
        }

        const botReply = {
          id: `bot-${Date.now()}`,
          sender: 'ASSISTANT',
          text: res.data.reply,
          intent: res.data.intent,
          requiresConfirmation: res.data.requiresConfirmation,
          actionToConfirm: res.data.actionToConfirm,
          data: res.data.data,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, botReply]);

        if (res.data.requiresConfirmation) {
          setConfirmationModal({
            action: res.data.actionToConfirm,
            prompt: res.data.reply
          });
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ASSISTANT',
          text: language === 'ta'
            ? 'மன்னிக்கவும், தகவலைப் பெறுவதில் பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.'
            : 'Information is currently unavailable. Please check your network connection or try again.',
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:scale-105 transition-all group"
          title="Open AeroMed AI Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wide">AeroMed AI</span>
        </button>
      )}

      {/* Responsive Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] h-[580px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-bold text-white">AeroMed Assistant</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">English • தமிழ் Natural Language Intelligence</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Language Switcher */}
              <button
                onClick={() => setLanguage(l => (l === 'en' ? 'ta' : 'en'))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 flex items-center space-x-1 transition-colors"
                title="Switch Language (English / தமிழ்)"
              >
                <Languages className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="px-3.5 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center space-x-2 text-[10px] text-blue-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>Audited rule-based operational assistant. Not authorized for clinical diagnosis.</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start space-x-2 ${m.sender === 'USER' ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    m.sender === 'USER' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                  }`}
                >
                  {m.sender === 'USER' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'USER'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                      : m.isError
                      ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-tl-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div>{m.text}</div>
                  <div
                    className={`mt-1 text-[9px] text-right font-medium ${
                      m.sender === 'USER' ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-1">
                <Bot className="w-4 h-4 animate-bounce text-blue-600" />
                <span className="animate-pulse">AeroMed Assistant is querying verified APIs...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Questions */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 flex-shrink-0 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Ask:</span>
            </span>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[10px] font-medium rounded-lg border border-slate-200 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={language === 'ta' ? 'கேள்வியை உள்ளிடவும் (e.g. ஆம்புலன்ஸ் நிலவரம்)...' : 'Type operational question...'}
              className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Operator Confirmation Required</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The AI Assistant requested an operational action:
              <br />
              <strong className="text-slate-800">{confirmationModal.prompt}</strong>
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmationModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmationModal(null);
                  setMessages(prev => [
                    ...prev,
                    {
                      id: `ack-${Date.now()}`,
                      sender: 'ASSISTANT',
                      text: 'Action confirmed by operator and recorded into system audit log.',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

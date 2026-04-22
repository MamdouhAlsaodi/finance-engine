import { useState, useRef, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart,
  Settings, Key, Send, Bot, User, Loader2, AlertCircle,
  ChevronDown, X, Sparkles, Activity, Wallet, CreditCard,
  ArrowUpRight, ArrowDownRight, RefreshCw, Trash2, Moon, Sun,
  LineChart, Target, Zap
} from 'lucide-react';

// ============ TYPES ============
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PortfolioItem {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  change: number;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'investment';
  description: string;
  amount: number;
  date: string;
  category: string;
}

// ============ MOCK DATA ============
const mockPortfolio: PortfolioItem[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, avgPrice: 142.50, currentPrice: 178.72, change: 2.34 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 30, avgPrice: 285.00, currentPrice: 328.40, change: 1.12 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 20, avgPrice: 98.50, currentPrice: 131.86, change: -0.45 },
  { symbol: 'TSLA', name: 'Tesla Inc.', shares: 25, avgPrice: 210.00, currentPrice: 248.42, change: 3.87 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 15, avgPrice: 128.00, currentPrice: 152.30, change: 0.92 },
];

const mockTransactions: Transaction[] = [
  { id: '1', type: 'income', description: 'Salary Deposit', amount: 8500, date: '2026-04-01', category: 'Salary' },
  { id: '2', type: 'expense', description: 'Office Rent', amount: 2200, date: '2026-04-03', category: 'Housing' },
  { id: '3', type: 'investment', description: 'Bought AAPL', amount: 3575, date: '2026-04-05', category: 'Stocks' },
  { id: '4', type: 'expense', description: 'Cloud Hosting', amount: 149, date: '2026-04-07', category: 'Tech' },
  { id: '5', type: 'income', description: 'Freelance Project', amount: 3200, date: '2026-04-10', category: 'Freelance' },
  { id: '6', type: 'expense', description: 'Groceries', amount: 340, date: '2026-04-12', category: 'Food' },
  { id: '7', type: 'investment', description: 'Bought MSFT', amount: 4275, date: '2026-04-14', category: 'Stocks' },
  { id: '8', type: 'expense', description: 'Gym Membership', amount: 89, date: '2026-04-15', category: 'Health' },
];

// ============ GEMINI API ============
async function analyzeWithGemini(apiKey: string, prompt: string, financialData: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a professional financial analyst AI. Analyze the following financial data and answer the user's question. Provide specific numbers, percentages, and actionable advice. Use markdown formatting.

Financial Data:
${financialData}

User Question: ${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated.';
}

function getFinancialContext(): string {
  const totalPortfolioValue = mockPortfolio.reduce((sum, s) => sum + s.shares * s.currentPrice, 0);
  const totalInvested = mockPortfolio.reduce((sum, s) => sum + s.shares * s.avgPrice, 0);
  const totalIncome = mockTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = mockTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalInvestments = mockTransactions.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);

  return `
Portfolio Value: $${totalPortfolioValue.toFixed(2)}
Total Invested: $${totalInvested.toFixed(2)}
Unrealized P/L: $${(totalPortfolioValue - totalInvested).toFixed(2)} (${((totalPortfolioValue - totalInvested) / totalInvested * 100).toFixed(1)}%)

Monthly Income: $${totalIncome.toFixed(2)}
Monthly Expenses: $${totalExpenses.toFixed(2)}
Monthly Investments: $${totalInvestments.toFixed(2)}
Net Cash Flow: $${(totalIncome - totalExpenses - totalInvestments).toFixed(2)}

Holdings:
${mockPortfolio.map(s => `- ${s.symbol} (${s.name}): ${s.shares} shares @ $${s.avgPrice} avg → $${s.currentPrice} (${s.change >= 0 ? '+' : ''}${s.change}%)`).join('\n')}

Recent Transactions:
${mockTransactions.map(t => `- [${t.type}] ${t.description}: $${t.amount} (${t.category}) on ${t.date}`).join('\n')}
`;
}

// ============ APP ============
export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant',
    content: '👋 Welcome to **Finance Engine**! I\'m your AI financial analyst.\n\nI can analyze your portfolio, track expenses, identify trends, and provide investment insights.\n\n**Quick actions:**\n- "Analyze my portfolio performance"\n- "What\'s my expense breakdown?"\n- "Give me investment recommendations"\n- "How can I improve my savings?"',
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  const totalPortfolioValue = mockPortfolio.reduce((sum, s) => sum + s.shares * s.currentPrice, 0);
  const totalInvested = mockPortfolio.reduce((sum, s) => sum + s.shares * s.avgPrice, 0);
  const pl = totalPortfolioValue - totalInvested;
  const plPercent = (pl / totalInvested) * 100;
  const totalIncome = mockTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = mockTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const sendMessage = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await analyzeWithGemini(apiKey, msg, getFinancialContext());
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: new Date() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: `❌ **Error:** ${err.message}\n\nPlease check your API key in Settings.`, timestamp: new Date() }]);
    }
    setLoading(false);
  };

  const quickActions = [
    { icon: <BarChart3 size={16} />, text: 'Portfolio analysis', color: 'text-blue-400' },
    { icon: <PieChart size={16} />, text: 'Expense breakdown', color: 'text-purple-400' },
    { icon: <Target size={16} />, text: 'Investment recommendations', color: 'text-emerald-400' },
    { icon: <Wallet size={16} />, text: 'Savings improvement', color: 'text-amber-400' },
  ];

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bg} transition-colors`}>
      {/* Header */}
      <header className={`border-b ${darkMode ? 'border-gray-800 bg-gray-950/80' : 'border-gray-200 bg-white/80'} backdrop-blur-xl sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <h1 className="font-bold text-lg">Finance Engine</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${apiKey ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {apiKey ? 'AI Connected' : 'No API Key'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg ${showSettings ? 'bg-blue-500/10 text-blue-400' : darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}>
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`border-b ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 max-w-xl">
              <Key className={`h-5 w-5 ${textMuted} flex-shrink-0`} />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API Key..."
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm border ${card} ${darkMode ? 'bg-gray-800 border-gray-700 placeholder-gray-500' : 'bg-white border-gray-300 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
              />
              <button onClick={() => { localStorage.removeItem('gemini_api_key'); setApiKey(''); }} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                <Trash2 size={18} />
              </button>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className={`text-xs ${textMuted} mt-2 ml-8`}>
              Get your free API key from{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-400 underline">Google AI Studio</a>.
              Your key is stored locally only.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Portfolio & Stats */}
        <div className="lg:w-80 flex-shrink-0 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className={`p-4 rounded-xl border ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className={textMuted} />
                <span className={`text-xs ${textMuted}`}>Portfolio Value</span>
              </div>
              <p className="text-2xl font-bold">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <span className={`text-xs font-medium ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'} flex items-center gap-1 mt-1`}>
                {pl >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {pl >= 0 ? '+' : ''}{plPercent.toFixed(1)}%
              </span>
            </div>

            <div className={`p-4 rounded-xl border ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className={textMuted} />
                <span className={`text-xs ${textMuted}`}>Income</span>
              </div>
              <p className="text-2xl font-bold">${totalIncome.toLocaleString()}</p>
              <span className="text-xs text-emerald-400">This month</span>
            </div>

            <div className={`p-4 rounded-xl border ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={14} className={textMuted} />
                <span className={`text-xs ${textMuted}`}>Expenses</span>
              </div>
              <p className="text-2xl font-bold">${totalExpenses.toLocaleString()}</p>
              <span className="text-xs text-red-400">This month</span>
            </div>

            <div className={`p-4 rounded-xl border ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={14} className={textMuted} />
                <span className={`text-xs ${textMuted}`}>Net Cash</span>
              </div>
              <p className="text-2xl font-bold">${(totalIncome - totalExpenses).toLocaleString()}</p>
              <span className="text-xs text-blue-400">Cash flow</span>
            </div>
          </div>

          {/* Holdings */}
          <div className={`rounded-xl border ${card} overflow-hidden`}>
            <div className="px-4 py-3 flex items-center justify-between border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}">
              <span className="text-sm font-semibold">Holdings</span>
              <span className={`text-xs ${textMuted}`}>{mockPortfolio.length} assets</span>
            </div>
            {mockPortfolio.map(stock => {
              const value = stock.shares * stock.currentPrice;
              const plStock = (stock.currentPrice - stock.avgPrice) * stock.shares;
              return (
                <div key={stock.symbol} className={`px-4 py-3 flex items-center justify-between border-b last:border-0 ${darkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
                  <div>
                    <p className="text-sm font-semibold">{stock.symbol}</p>
                    <p className={`text-xs ${textMuted}`}>{stock.shares} shares</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className={`text-xs font-medium ${plStock >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {plStock >= 0 ? '+' : ''}{plStock.toFixed(0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Transactions */}
          <div className={`rounded-xl border ${card} overflow-hidden`}>
            <div className="px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}">
              <span className="text-sm font-semibold">Transactions</span>
            </div>
            {mockTransactions.slice(0, 5).map(tx => (
              <div key={tx.id} className={`px-4 py-2.5 flex items-center justify-between border-b last:border-0 ${darkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : tx.type === 'expense' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {tx.type === 'income' ? '↑' : tx.type === 'expense' ? '↓' : '↗'}
                  </span>
                  <div>
                    <p className="text-xs font-medium">{tx.description}</p>
                    <p className={`text-[10px] ${textMuted}`}>{tx.date}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-red-400' : 'text-blue-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-[calc(100vh-120px)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-emerald-500 to-cyan-500'}`}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-md' : `${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} rounded-tl-md`}`}>
                  <div className="whitespace-pre-wrap prose prose-sm max-w-none [&_strong]:font-bold [&_*]:first:mt-0">
                    {msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className={`rounded-2xl rounded-tl-md px-4 py-3 ${card}`}>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    <span className={`text-sm ${textMuted}`}>Analyzing financial data...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {quickActions.map((action, i) => (
                <button key={i} onClick={() => sendMessage(action.text)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${card} hover:border-emerald-500/30 transition-all ${action.color}`}>
                  {action.icon} {action.text}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className={`flex gap-2 p-2 rounded-xl border ${card}`}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={apiKey ? "Ask about your finances..." : "Add API key in Settings to start..."}
              disabled={loading}
              className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg text-sm font-medium disabled:opacity-30 hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

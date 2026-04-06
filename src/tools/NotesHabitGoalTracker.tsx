import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Target, Activity, LayoutDashboard, Plus, Search, 
  MoreVertical, Star, Clock, Calendar, CheckCircle2, 
  Circle, AlertCircle, Sparkles, BrainCircuit, ListTodo, FileText, 
  User, Flag, Play, Check, X, Sun, Moon, CalendarDays, BarChart, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { GoogleGenAI } from '@google/genai';

// --- Types ---
type Priority = 'low' | 'medium' | 'high';
type NoteType = 'task' | 'note' | 'personal' | 'idea';
type Status = 'pending' | 'in-progress' | 'completed';

interface Subtask { id: string; title: string; completed: boolean; }
interface Note {
  id: string; title: string; content: string; type: NoteType; status: Status;
  priority: Priority; urgent: boolean; important: boolean; color: string;
  isPinned: boolean; subtasks: Subtask[]; createdAt: Date; dueDate?: string; reminder?: string;
}
interface Habit {
  id: string; name: string; category: string; color: string; streak: number;
  history: Record<string, boolean>; createdAt: Date;
}
interface Milestone { id: string; title: string; completed: boolean; }
interface Goal {
  id: string; title: string; description: string; targetDate: string;
  category: string; color: string; milestones: Milestone[]; createdAt: Date;
}
interface TimeBlock { id: string; time: string; task: string; }
interface Routine { id: string; timeOfDay: 'morning' | 'night'; task: string; completed: boolean; }

// --- Mock Data ---
const INITIAL_NOTES: Note[] = [
  { id: '1', title: 'Q3 Strategy', content: 'Draft proposal.', type: 'task', status: 'in-progress', priority: 'high', urgent: true, important: true, color: 'bg-blue-500', isPinned: true, createdAt: new Date(), dueDate: '2026-04-10', subtasks: [{ id: 's1', title: 'Research', completed: true }] },
  { id: '2', title: 'Passport Renewal', content: 'App num: 123456', type: 'personal', status: 'pending', priority: 'medium', urgent: false, important: true, color: 'bg-purple-500', isPinned: false, createdAt: new Date(), subtasks: [] }
];
const INITIAL_HABITS: Habit[] = [
  { id: '1', name: 'Read 20 pages', category: 'Learning', color: 'bg-emerald-500', streak: 5, history: {}, createdAt: new Date() },
  { id: '2', name: 'Workout', category: 'Health', color: 'bg-rose-500', streak: 2, history: {}, createdAt: new Date() },
];
const INITIAL_GOALS: Goal[] = [
  { id: '1', title: 'Launch MVP', description: 'Get beta live.', targetDate: '2026-05-01', category: 'Business', color: 'bg-indigo-500', createdAt: new Date(), milestones: [{ id: 'm1', title: 'Design UI', completed: true }, { id: 'm2', title: 'Develop Backend', completed: false }] }
];
const COLORS = ['bg-slate-500', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];

const IMPROVEMENT_DATA = [
  { name: 'Mon', tasks: 4, habits: 2 }, { name: 'Tue', tasks: 3, habits: 3 },
  { name: 'Wed', tasks: 5, habits: 4 }, { name: 'Thu', tasks: 2, habits: 3 },
  { name: 'Fri', tasks: 6, habits: 5 }, { name: 'Sat', tasks: 7, habits: 5 },
  { name: 'Sun', tasks: 8, habits: 6 },
];

export default function NotesHabitGoalTracker() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'notes' | 'habits' | 'goals' | 'planner'>('dashboard');
  
  // State
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([
    { id: 't1', time: '08:00 AM', task: 'Deep Work' }, { id: 't2', time: '10:00 AM', task: 'Meetings' }
  ]);
  const [routines, setRoutines] = useState<Routine[]>([
    { id: 'r1', timeOfDay: 'morning', task: 'Drink Water', completed: false },
    { id: 'r2', timeOfDay: 'night', task: 'Read 10 pages', completed: false }
  ]);
  const [dailyCheckIn, setDailyCheckIn] = useState({ mood: 'Good', energy: 80, done: false });
  
  // Modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  
  // Forms
  const [newNote, setNewNote] = useState<Partial<Note>>({ title: '', content: '', type: 'task', status: 'pending', priority: 'medium', color: 'bg-blue-500', urgent: false, important: false });
  const [newHabit, setNewHabit] = useState<Partial<Habit>>({ name: '', category: 'General', color: 'bg-emerald-500' });
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({ title: '', description: '', category: 'General', color: 'bg-indigo-500', targetDate: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // --- Handlers ---
  const handleAddNote = () => {
    if (!newNote.title) return;
    setNotes([...notes, { ...newNote, id: Date.now().toString(), subtasks: [], createdAt: new Date(), isPinned: false } as Note]);
    setShowNoteModal(false);
    setNewNote({ title: '', content: '', type: 'task', status: 'pending', priority: 'medium', color: 'bg-blue-500', urgent: false, important: false });
  };

  const handleAddHabit = () => {
    if (!newHabit.name) return;
    setHabits([...habits, { ...newHabit, id: Date.now().toString(), streak: 0, history: {}, createdAt: new Date() } as Habit]);
    setShowHabitModal(false);
    setNewHabit({ name: '', category: 'General', color: 'bg-emerald-500' });
  };

  const handleAddGoal = () => {
    if (!newGoal.title) return;
    setGoals([...goals, { ...newGoal, id: Date.now().toString(), milestones: [], createdAt: new Date() } as Goal]);
    setShowGoalModal(false);
    setNewGoal({ title: '', description: '', category: 'General', color: 'bg-indigo-500', targetDate: '' });
  };

  const toggleHabitToday = (habitId: string) => {
    const today = getTodayStr();
    setHabits(habits.map(h => {
      if (h.id === habitId) {
        const newHistory = { ...h.history };
        const wasCompleted = !!newHistory[today];
        wasCompleted ? delete newHistory[today] : newHistory[today] = true;
        return { ...h, history: newHistory, streak: wasCompleted ? Math.max(0, h.streak - 1) : h.streak + 1 };
      }
      return h;
    }));
  };

  const toggleRoutine = (id: string) => {
    setRoutines(routines.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData('noteId', id);
  const handleDrop = (e: React.DragEvent, status: Status) => {
    const id = e.dataTransfer.getData('noteId');
    setNotes(notes.map(n => n.id === id ? { ...n, status } : n));
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // AI
  const generateDailyBriefing = async () => {
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const pendingTasks = notes.filter(n => n.status !== 'completed').map(n => n.title).join(', ');
      const prompt = `Act as an elite productivity coach. Pending Tasks: ${pendingTasks || 'None'}. Provide a short, punchy, motivating daily briefing (2 paragraphs max). Highlight focus areas. Format with markdown.`;
      const response = await ai.models.generateContent({ model: 'gemini-3.1-pro-preview', contents: prompt });
      setAiBriefing(response.text || "Let's crush today!");
    } catch (err) {
      setAiBriefing("Failed to generate briefing. Check API key.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- Renderers ---
  const Modal = ({ isOpen, onClose, title, children }: any) => (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto custom-scrollbar space-y-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderDashboard = () => {
    const pendingNotes = notes.filter(n => n.status !== 'completed');
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Briefing */}
          <div className="lg:col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit className="w-32 h-32" /></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center"><Sparkles className="w-6 h-6 mr-2 text-indigo-200" /> AI Daily Briefing</h2>
                <button onClick={generateDailyBriefing} disabled={aiLoading} className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold transition-colors flex items-center">
                  {aiLoading ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  {aiBriefing ? 'Refresh' : 'Generate'}
                </button>
              </div>
              {aiBriefing ? <div className="prose prose-invert max-w-none text-indigo-50" dangerouslySetInnerHTML={{ __html: aiBriefing.replace(/\n/g, '<br/>') }} /> : <p className="text-indigo-100">Click generate to get your personalized daily strategy.</p>}
            </div>
          </div>

          {/* Daily Check-in */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 font-semibold mb-4 flex items-center"><User className="w-4 h-4 mr-2"/> Daily Check-In</h3>
            {dailyCheckIn.done ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-gray-900 dark:text-white">Checked in!</p>
                <p className="text-sm text-gray-500">Energy: {dailyCheckIn.energy}%</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Energy Level</label>
                  <input type="range" min="0" max="100" value={dailyCheckIn.energy} onChange={e => setDailyCheckIn({...dailyCheckIn, energy: parseInt(e.target.value)})} className="w-full accent-indigo-600" />
                </div>
                <button onClick={() => setDailyCheckIn({...dailyCheckIn, done: true})} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">Check In</button>
              </div>
            )}
          </div>
        </div>

        {/* Improvement Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-gray-500 dark:text-gray-400 font-semibold mb-4 flex items-center"><BarChart className="w-4 h-4 mr-2"/> Weekly Improvement</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={IMPROVEMENT_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Tasks Completed" />
                <Line type="monotone" dataKey="habits" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Habits Completed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderNotes = () => {
    const columns: { title: string; status: Status }[] = [
      { title: 'Pending', status: 'pending' },
      { title: 'In Progress', status: 'in-progress' },
      { title: 'Completed', status: 'completed' }
    ];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white" />
          </div>
          <button onClick={() => setShowNoteModal(true)} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4 mr-2" /> New Note
          </button>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {columns.map(col => (
            <div key={col.status} className="flex-1 min-w-[320px] bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50" onDrop={(e) => handleDrop(e, col.status)} onDragOver={handleDragOver}>
              <h3 className="font-bold mb-4 text-gray-700 dark:text-gray-300 capitalize flex items-center justify-between">
                {col.title} <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">{notes.filter(n => n.status === col.status).length}</span>
              </h3>
              <div className="space-y-4 min-h-[200px]">
                <AnimatePresence>
                  {notes.filter(n => n.status === col.status && (n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))).map(note => (
                    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={note.id} draggable onDragStart={(e: any) => handleDragStart(e, note.id)} className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm cursor-grab active:cursor-grabbing border border-gray-100 dark:border-gray-700 relative overflow-hidden ${note.status === 'completed' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                      <div className={`absolute top-0 left-0 w-1 h-full ${note.color}`}></div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${note.color} bg-opacity-10 text-${note.color.replace('bg-', '')}`}>{note.type}</span>
                          {note.priority === 'high' && <Flag className="w-3 h-3 text-red-500" />}
                        </div>
                        {note.urgent && note.important && <span className="flex items-center text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded"><AlertCircle className="w-3 h-3 mr-1"/> Urgent & Important</span>}
                      </div>
                      <h4 className={`font-bold text-gray-900 dark:text-white ${note.status === 'completed' ? 'line-through' : ''}`}>{note.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{note.content}</p>
                      <div className="flex gap-2 mt-3 text-xs text-gray-500">
                        {note.dueDate && <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {note.dueDate}</span>}
                        {note.reminder && <span className="flex items-center"><Bell className="w-3 h-3 mr-1"/> {note.reminder}</span>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHabits = () => {
    const todayStr = getTodayStr();
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0];
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Habit Tracker</h2>
          <button onClick={() => setShowHabitModal(true)} className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4 mr-2" /> New Habit
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {habits.map(habit => {
            const isDoneToday = !!habit.history[todayStr];
            return (
              <div key={habit.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <button onClick={() => toggleHabitToday(habit.id)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${isDoneToday ? habit.color + ' text-white scale-105' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}><Check className="w-6 h-6" /></button>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{habit.name}</h3>
                    <div className="flex items-center space-x-3 text-sm mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${habit.color} bg-opacity-10 text-${habit.color.replace('bg-', '')}`}>{habit.category}</span>
                      <span className="text-gray-500 flex items-center"><Activity className="w-3 h-3 mr-1 text-orange-500" /> {habit.streak} Day Streak</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl">
                  {last7Days.map(date => {
                    const done = !!habit.history[date];
                    return <div key={date} title={date} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${done ? habit.color + ' text-white' : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'}`}>{new Date(date).getDate()}</div>
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const renderGoals = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Goal Tracker</h2>
          <button onClick={() => setShowGoalModal(true)} className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4 mr-2" /> New Goal
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map(goal => {
            const progress = goal.milestones.length ? Math.round((goal.milestones.filter(m => m.completed).length / goal.milestones.length) * 100) : 0;
            return (
              <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${goal.color}`}></div>
                <div className="flex justify-between items-start mb-4 mt-2">
                  <div>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold mb-2 inline-block ${goal.color} bg-opacity-10 text-${goal.color.replace('bg-', '')}`}>{goal.category}</span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{goal.title}</h3>
                  </div>
                  <div className="text-right"><div className="text-2xl font-black text-gray-900 dark:text-white">{progress}%</div><div className="text-xs text-gray-500">Completed</div></div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{goal.description}</p>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-6"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={`h-full ${goal.color}`} /></div>
                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1"/> Target: {goal.targetDate}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const renderPlanner = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Planner</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold flex items-center mb-4 text-gray-900 dark:text-white"><Sun className="w-5 h-5 mr-2 text-amber-500"/> Morning Routine</h3>
              {routines.filter(r => r.timeOfDay === 'morning').map(r => (
                <div key={r.id} className="flex items-center mb-3">
                  <input type="checkbox" checked={r.completed} onChange={() => toggleRoutine(r.id)} className="mr-3 w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                  <span className={`text-gray-700 dark:text-gray-300 ${r.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{r.task}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold flex items-center mb-4 text-gray-900 dark:text-white"><Moon className="w-5 h-5 mr-2 text-indigo-500"/> Night Routine</h3>
              {routines.filter(r => r.timeOfDay === 'night').map(r => (
                <div key={r.id} className="flex items-center mb-3">
                  <input type="checkbox" checked={r.completed} onChange={() => toggleRoutine(r.id)} className="mr-3 w-5 h-5 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500" />
                  <span className={`text-gray-700 dark:text-gray-300 ${r.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{r.task}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold flex items-center mb-4 text-gray-900 dark:text-white"><Clock className="w-5 h-5 mr-2 text-blue-500"/> Time Blocking</h3>
            <div className="space-y-3">
              {timeBlocks.map(tb => (
                <div key={tb.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                  <div className="font-bold text-sm text-gray-500 w-20">{tb.time}</div>
                  <div className="flex-1 font-medium text-gray-900 dark:text-white">{tb.task}</div>
                </div>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors flex items-center justify-center font-medium">
                <Plus className="w-4 h-4 mr-2"/> Add Time Block
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 pt-6">
        <div className="flex items-center space-x-4 mb-2">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl"><CheckSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" /></div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Productivity Hub</h1>
            <p className="text-gray-600 dark:text-gray-400">Advanced Notes, Habits, Goals, and Daily Planner.</p>
          </div>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-2xl mb-8 overflow-x-auto custom-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'notes', label: 'Tasks & Notes', icon: FileText },
          { id: 'habits', label: 'Habits', icon: Activity },
          { id: 'goals', label: 'Goals', icon: Target },
          { id: 'planner', label: 'Daily Planner', icon: CalendarDays },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-white/50'}`}>
            <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'notes' && renderNotes()}
        {activeTab === 'habits' && renderHabits()}
        {activeTab === 'goals' && renderGoals()}
        {activeTab === 'planner' && renderPlanner()}
      </motion.div>

      {/* Modals */}
      <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} title="Create New Note/Task">
        <input type="text" placeholder="Title" value={newNote.title} onChange={e => setNewNote({...newNote, title: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 outline-none text-gray-900 dark:text-white" />
        <textarea placeholder="Content" value={newNote.content} onChange={e => setNewNote({...newNote, content: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 outline-none text-gray-900 dark:text-white min-h-[100px]" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Type</label>
            <select value={newNote.type} onChange={e => setNewNote({...newNote, type: e.target.value as NoteType})} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none">
              <option value="task">Task</option><option value="note">Note</option><option value="personal">Personal</option><option value="idea">Idea</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Priority</label>
            <select value={newNote.priority} onChange={e => setNewNote({...newNote, priority: e.target.value as Priority})} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="text-xs text-gray-500 block mb-1">Due Date</label><input type="date" value={newNote.dueDate || ''} onChange={e => setNewNote({...newNote, dueDate: e.target.value})} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Reminder</label><input type="time" value={newNote.reminder || ''} onChange={e => setNewNote({...newNote, reminder: e.target.value})} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" /></div>
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-2">Eisenhower Matrix (Optional)</label>
          <div className="flex gap-4">
            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={newNote.urgent} onChange={e => setNewNote({...newNote, urgent: e.target.checked})} className="mr-2 rounded text-blue-600" /> Urgent</label>
            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={newNote.important} onChange={e => setNewNote({...newNote, important: e.target.checked})} className="mr-2 rounded text-blue-600" /> Important</label>
          </div>
        </div>
        <div className="mb-6">
          <label className="text-xs text-gray-500 block mb-2">Color Tag</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => <button key={c} onClick={() => setNewNote({...newNote, color: c})} className={`w-6 h-6 rounded-full ${c} ${newNote.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800' : ''}`} />)}
          </div>
        </div>
        <button onClick={handleAddNote} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">Create Note</button>
      </Modal>

      <Modal isOpen={showHabitModal} onClose={() => setShowHabitModal(false)} title="Create New Habit">
        <input type="text" placeholder="Habit Name (e.g., Drink Water)" value={newHabit.name} onChange={e => setNewHabit({...newHabit, name: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 outline-none text-gray-900 dark:text-white" />
        <input type="text" placeholder="Category (e.g., Health)" value={newHabit.category} onChange={e => setNewHabit({...newHabit, category: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 outline-none text-gray-900 dark:text-white" />
        <div className="mb-6">
          <label className="text-xs text-gray-500 block mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => <button key={c} onClick={() => setNewHabit({...newHabit, color: c})} className={`w-6 h-6 rounded-full ${c} ${newHabit.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800' : ''}`} />)}
          </div>
        </div>
        <button onClick={handleAddHabit} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors">Create Habit</button>
      </Modal>

      <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title="Create New Goal">
        <input type="text" placeholder="Goal Title" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 outline-none text-gray-900 dark:text-white" />
        <textarea placeholder="Description" value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 outline-none text-gray-900 dark:text-white min-h-[80px]" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="text-xs text-gray-500 block mb-1">Category</label><input type="text" value={newGoal.category} onChange={e => setNewGoal({...newGoal, category: e.target.value})} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Target Date</label><input type="date" value={newGoal.targetDate} onChange={e => setNewGoal({...newGoal, targetDate: e.target.value})} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" /></div>
        </div>
        <div className="mb-6">
          <label className="text-xs text-gray-500 block mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => <button key={c} onClick={() => setNewGoal({...newGoal, color: c})} className={`w-6 h-6 rounded-full ${c} ${newGoal.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800' : ''}`} />)}
          </div>
        </div>
        <button onClick={handleAddGoal} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">Create Goal</button>
      </Modal>
    </div>
  );
}

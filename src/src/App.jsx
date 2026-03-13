/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Film, 
  Copy, 
  Trash2, 
  Sparkles, 
  ChevronDown, 
  History, 
  Check, 
  AlertCircle,
  Video,
  Camera,
  Move,
  Palette,
  Clock,
  Music,
  Tag,
  Monitor,
  Layout,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Constants & Types ---

const PLATFORMS = [
  { id: 'Google Veo 3.1', name: 'Google Veo 3.1', icon: <Sparkles size={20} /> },
  { id: 'Sora 2', name: 'Sora 2', icon: <Monitor size={20} /> },
  { id: 'Runway', name: 'Runway', icon: <Video size={20} /> },
  { id: 'Kling', name: 'Kling', icon: <Camera size={20} /> },
  { id: 'Pika', name: 'Pika', icon: <Film size={20} /> },
  { id: 'Hailuo', name: 'Hailuo', icon: <Move size={20} /> },
];

const PLATFORM_TIPS: Record<string, string> = {
  "Runway": "Use motion brush. Describe camera movement precisely. Keep under 500 chars.",
  "Sora 2": "Include physics details. Describe spatial relationships. Works great with dialogue.",
  "Google Veo 3.1": "Specify spatial audio channels (left, right, center). Name surface materials for realistic sound.",
  "Kling": "Great for realistic human motion. Describe facial expressions in detail.",
  "Pika": "Keep visual prompt concise. Add style reference keywords like 'Pixar' or 'Studio Ghibli'.",
  "Hailuo": "Best for realistic motion. Describe movement trajectory in detail."
};

const PLATFORM_LIMITS: Record<string, number> = {
  "Runway": 500,
  "Sora 2": 1000,
  "Google Veo 3.1": 800,
  "Kling": 600,
  "Pika": 400,
  "Hailuo": 700
};

const GENRES = ["Cinematic drama", "Sci-fi", "Horror", "Fantasy", "Action", "Documentary", "Romance", "Thriller", "Animation", "Music video"];
const SHOTS = ["Extreme close-up", "Close-up", "Medium shot", "Wide shot", "Extreme wide shot", "Bird's eye view", "Low angle", "Dutch angle", "Over-the-shoulder", "POV shot"];
const MOVEMENTS = ["Static", "Slow push in", "Pull back", "Orbit/arc shot", "Drone rising", "Handheld shake", "Tracking shot", "Dolly zoom", "Crane shot", "Pan left", "Pan right", "Tilt up", "Tilt down"];
const STYLES = ["Photorealistic", "Cinematic film grain", "35mm film", "IMAX quality", "Anime", "3D animation", "Stop motion", "Watercolor", "Oil painting", "Vintage 8mm", "VHS retro", "Black and white", "Neo-noir"];
const LIGHTING = ["Natural", "Dramatic side lighting", "Soft diffused", "Neon glow", "Candlelight", "Moonlight", "Harsh sunlight", "Foggy/misty", "Backlit silhouette", "Studio lighting", "Underwater caustics"];
const PALETTES = ["Warm golden tones", "Cool blue tones", "Desaturated muted", "High contrast B&W", "Teal and orange", "Pastel soft", "Deep jewel tones", "Vibrant saturated", "Neon cyberpunk"];
const DURATIONS = ["5 seconds", "10 seconds", "15 seconds", "Fast cut", "Slow motion", "Time lapse", "Hyperlapse"];
const MOOD_TAGS = ["Epic", "Melancholic", "Tense", "Peaceful", "Mysterious", "Romantic", "Terrifying", "Euphoric", "Nostalgic", "Surreal", "Gritty", "Whimsical"];

const TEMPLATES = [
  {
    id: 'epic-battle',
    emoji: '⚔️',
    name: 'Epic Battle',
    category: 'Fantasy',
    scene: 'A massive medieval army charging across a grassy plain towards a dark fortress.',
    genre: 'Fantasy',
    shot: 'Wide shot',
    movement: 'Orbit/arc shot',
    style: 'Cinematic film grain',
    lighting: 'Dramatic side lighting',
    color: 'Deep jewel tones',
    moods: ['Epic', 'Tense'],
  },
  {
    id: 'neon-city',
    emoji: '🌆',
    name: 'Neon City',
    category: 'Sci-fi',
    scene: 'A rain-slicked futuristic street with glowing neon signs and flying vehicles.',
    genre: 'Sci-fi',
    shot: 'Low angle',
    movement: 'Tracking shot',
    style: 'Neo-noir',
    lighting: 'Neon glow',
    color: 'Neon cyberpunk',
    moods: ['Mysterious', 'Gritty'],
  },
  {
    id: 'silent-goodbye',
    emoji: '💔',
    name: 'Silent Goodbye',
    category: 'Drama',
    scene: 'Two people standing on a foggy train platform, one slowly turning away.',
    genre: 'Cinematic drama',
    shot: 'Medium shot',
    movement: 'Slow push in',
    style: '35mm film',
    lighting: 'Foggy/misty',
    color: 'Desaturated muted',
    moods: ['Melancholic', 'Nostalgic'],
  },
  {
    id: 'cosmic-wonder',
    emoji: '🌌',
    name: 'Cosmic Wonder',
    category: 'Sci-fi',
    scene: 'An astronaut floating in deep space, looking at a vibrant nebula.',
    genre: 'Sci-fi',
    shot: "Bird's eye view",
    movement: 'Orbit/arc shot',
    style: 'IMAX quality',
    lighting: 'Backlit silhouette',
    color: 'Cool blue tones',
    moods: ['Epic', 'Surreal', 'Peaceful'],
  },
  {
    id: 'horror-hallway',
    emoji: '👁️',
    name: 'Horror Hallway',
    category: 'Horror',
    scene: 'A flickering light at the end of a long, dark hospital corridor.',
    genre: 'Horror',
    shot: 'POV shot',
    movement: 'Slow push in',
    style: 'Cinematic film grain',
    lighting: 'Harsh sunlight',
    color: 'High contrast B&W',
    moods: ['Terrifying', 'Tense'],
  },
  {
    id: 'golden-dawn',
    emoji: '🌅',
    name: 'Golden Dawn',
    category: 'Documentary',
    scene: 'Sun rising over a vast mountain range with mist in the valleys.',
    genre: 'Documentary',
    shot: 'Extreme wide shot',
    movement: 'Drone rising',
    style: 'Photorealistic',
    lighting: 'Natural',
    color: 'Warm golden tones',
    moods: ['Peaceful', 'Nostalgic'],
  },
];

const SYSTEM_PROMPT = `You are an expert AI video prompt engineer.
When given a rough AI video prompt, you will:
1. Return an improved master prompt
2. Return 3 creative variations
Each prompt should be vivid, cinematic, and optimized for the selected platform.
Always include specific camera movement, lighting, mood, color grading, and spatial audio details.
Format your response as JSON:
{
  "improved": "...",
  "variation1": { "title": "...", "prompt": "..." },
  "variation2": { "title": "...", "prompt": "..." },
  "variation3": { "title": "...", "prompt": "..." }
}
Return ONLY the JSON, no markdown, no explanation.`;

interface AIResponse {
  improved: string;
  variation1: { title: string; prompt: string };
  variation2: { title: string; prompt: string };
  variation3: { title: string; prompt: string };
}

interface HistoryItem {
  id: string;
  timestamp: number;
  platform: string;
  formState: any;
  prompt: string;
  aiResults?: AIResponse;
}

export default function App() {
  // --- State ---
  const [platform, setPlatform] = useState(PLATFORMS[0].id);
  const [scene, setScene] = useState('');
  const [subject, setSubject] = useState('');
  const [genre, setGenre] = useState('');
  const [shot, setShot] = useState('');
  const [movement, setMovement] = useState('');
  const [style, setStyle] = useState('');
  const [lighting, setLighting] = useState('');
  const [color, setColor] = useState('');
  const [pace, setPace] = useState('');
  const [audio, setAudio] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  
  const [isImproving, setIsImproving] = useState(false);
  const [aiResults, setAiResults] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // --- Effects ---
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('cineprompt_history_v2');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cineprompt_history_v2', JSON.stringify(history.slice(0, 10)));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  }, [history]);

  // --- Helpers ---
  const assembledPrompt = useMemo(() => {
    let parts = [];
    if (scene) parts.push(scene);
    if (subject) parts.push("Subject: " + subject);
    if (genre) parts.push(genre + " style");
    if (shot) parts.push(shot);
    if (movement) parts.push(movement);
    if (lighting) parts.push(lighting);
    if (style) parts.push(style);
    if (color) parts.push(color + " color grading");
    if (selectedMoods.length) parts.push("mood: " + selectedMoods.join(", "));
    if (pace) parts.push(pace);
    
    let basePrompt = parts.length > 0 ? parts.join(", ") + "." : "";
    if (audio) {
      if (basePrompt) basePrompt += "\n\n";
      basePrompt += "Audio: " + audio;
    }
    
    return basePrompt;
  }, [scene, subject, genre, shot, movement, lighting, style, color, selectedMoods, pace, audio]);

  const fullPromptWithTip = useMemo(() => {
    return `${assembledPrompt}\n\nPlatform tip (${platform}): ${PLATFORM_TIPS[platform]}`;
  }, [assembledPrompt, platform]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClearAll = () => {
    setScene('');
    setSubject('');
    setGenre('');
    setShot('');
    setMovement('');
    setStyle('');
    setLighting('');
    setColor('');
    setPace('');
    setAudio('');
    setSelectedMoods([]);
    setAiResults(null);
    setError(null);
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev => 
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  };

  const improveWithAI = async () => {
    if (!assembledPrompt || assembledPrompt.length < 10) {
      setError("Please add more details to your prompt before improving.");
      return;
    }

    setIsImproving(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Platform: ${platform}\nPrompt: ${assembledPrompt}`,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              improved: { type: Type.STRING },
              variation1: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING }
                },
                required: ["title", "prompt"]
              },
              variation2: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING }
                },
                required: ["title", "prompt"]
              },
              variation3: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING }
                },
                required: ["title", "prompt"]
              }
            },
            required: ["improved", "variation1", "variation2", "variation3"]
          }
        }
      });

      const response = await model;
      const result = JSON.parse(response.text) as AIResponse;
      setAiResults(result);
      setShowComparison(true);
      
      // Add to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        platform,
        formState: { scene, subject, genre, shot, movement, style, lighting, color, pace, audio, selectedMoods },
        prompt: assembledPrompt,
        aiResults: result
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 10));

    } catch (err) {
      console.error(err);
      setError("Failed to improve prompt. Please check your API key or try again.");
    } finally {
      setIsImproving(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setPlatform(item.platform);
    setScene(item.formState.scene);
    setSubject(item.formState.subject);
    setGenre(item.formState.genre);
    setShot(item.formState.shot);
    setMovement(item.formState.movement);
    setStyle(item.formState.style);
    setLighting(item.formState.lighting);
    setColor(item.formState.color);
    setPace(item.formState.pace);
    setAudio(item.formState.audio);
    setSelectedMoods(item.formState.selectedMoods);
    setAiResults(item.aiResults || null);
    setShowHistory(false);
  };

  const loadTemplate = (template: any) => {
    setScene(template.scene);
    setGenre(template.genre);
    setShot(template.shot);
    setMovement(template.movement);
    setStyle(template.style);
    setLighting(template.lighting);
    setColor(template.color);
    setSelectedMoods(template.moods);
    setShowTemplates(false);
  };

  const currentLimit = PLATFORM_LIMITS[platform] || 500;
  const remainingChars = currentLimit - assembledPrompt.length;
  const charPercentage = Math.min((assembledPrompt.length / currentLimit) * 100, 100);
  const isOverLimit = assembledPrompt.length > currentLimit;

  const getBarColor = () => {
    if (isOverLimit) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    if (charPercentage > 90) return 'bg-orange-500';
    if (charPercentage > 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = () => {
    if (isOverLimit) return 'text-red-400';
    if (charPercentage > 90) return 'text-orange-400';
    if (charPercentage > 70) return 'text-amber-400';
    return 'text-emerald-400/70';
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-cinematic-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center text-cinematic-black shadow-lg shadow-gold/20">
              <Film size={24} />
            </div>
            <div>
              <h1 className="text-2xl text-gold leading-none">CinePrompt AI</h1>
              <p className="text-xs text-white/50 uppercase tracking-widest mt-1">Build cinematic prompts for any AI video tool</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 hover:border-gold/50 hover:bg-white/5 transition-all text-sm"
            >
              <Layout size={16} />
              <span>Templates</span>
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 hover:border-gold/50 hover:bg-white/5 transition-all text-sm"
            >
              <History size={16} />
              <span>History</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-7 space-y-8">
          {/* Platform Selector */}
          <section>
            <h2 className="text-sm uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
              <Monitor size={14} className="text-gold" />
              Target Platform
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    platform === p.id 
                      ? 'bg-gold/10 border-gold text-gold gold-glow' 
                      : 'bg-cinematic-gray border-white/5 text-white/60 hover:border-white/20'
                  }`}
                >
                  <div className={`${platform === p.id ? 'text-gold' : 'text-white/40'}`}>
                    {p.icon}
                  </div>
                  <span className="font-medium text-sm">{p.name}</span>
                </button>
              ))}
            </div>
            <motion.p 
              key={platform}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-xs text-gold/70 italic bg-gold/5 p-2 rounded border border-gold/10"
            >
              Tip: {PLATFORM_TIPS[platform]}
            </motion.p>
          </section>

          {/* Form Fields */}
          <div className="bg-cinematic-gray rounded-2xl p-6 border border-white/5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Scene Description */}
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Scene Description</label>
                <textarea 
                  value={scene}
                  onChange={(e) => setScene(e.target.value)}
                  placeholder="Describe the overall scene and action..."
                  className="w-full h-32 bg-cinematic-black border border-white/10 rounded-xl p-4 text-sm gold-border-focus resize-none"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Subject / Character</label>
                <input 
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. A lone samurai, a futuristic robot..."
                  className="w-full bg-cinematic-black border border-white/10 rounded-xl px-4 py-3 text-sm gold-border-focus"
                />
              </div>

              {/* Genre */}
              <div className="relative">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Genre</label>
                <select 
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-cinematic-black border border-white/10 rounded-xl px-4 py-3 text-sm gold-border-focus appearance-none"
                >
                  <option value="">Select Genre</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 bottom-3.5 text-white/30 pointer-events-none" />
              </div>

              {/* Camera Shot */}
              <div className="relative">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Camera Shot</label>
                <select 
                  value={shot}
                  onChange={(e) => setShot(e.target.value)}
                  className="w-full bg-cinematic-black border border-white/10 rounded-xl px-4 py-3 text-sm gold-border-focus appearance-none"
                >
                  <option value="">Select Shot</option>
                  {SHOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 bottom-3.5 text-white/30 pointer-events-none" />
              </div>

              {/* Camera Movement */}
              <div className="relative">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Camera Movement</label>
                <select 
                  value={movement}
                  onChange={(e) => setMovement(e.target.value)}
                  className="w-full bg-cinematic-black border border-white/10 rounded-xl px-4 py-3 text-sm gold-border-focus appearance-none"
                >
                  <option value="">Select Movement</option>
                  {MOVEMENTS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 bottom-3.5 text-white/30 pointer-events-none" />
              </div>

              {/* Visual Style */}
              <div className="relative">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Visual Style</label>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-cinematic-black border border-white/10 rounded-xl px-4 py-3 text-sm gold-border-focus appearance-none"
                >
                  <option value="">Select Style</option>
                  {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 bottom-3.5 text-white/30 pointer-events-none" />
              </div>

              {/* Lighting */}
              <div className="relative">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Lighting Mood</label>
                <select 
                  value={lighting}
                  onChange={(e) => setLighting(e.target.value)}
                  className="w-full bg-cinematic-black border border-white/10 rounded-xl px-4 py-3 text-sm gold-border-focus appearance-none"
                >
                  <option value="">Select Lighting</option>
                  {LIGHTING.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 bottom-3.5 text-white/30 pointer-events-none" />
              </div>

              {/* Color Palette */}
              <div className="relative">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Color Palette</label>
                <select 
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-cinematic-black border border-white/10 rounded-xl px-4 py-3 text-sm gold-border-focus appearance-none"
                >
                  <option value="">Select Palette</option>
                  {PALETTES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 bottom-3.5 text-white/30 pointer-events-none" />
              </div>

              {/* Duration */}
              <div className="relative">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Duration / Pace</label>
                <select 
                  value={pace}
                  onChange={(e) => setPace(e.target.value)}
                  className="w-full bg-cinematic-black border border-white/10 rounded-xl px-4 py-3 text-sm gold-border-focus appearance-none"
                >
                  <option value="">Select Duration</option>
                  {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 bottom-3.5 text-white/30 pointer-events-none" />
              </div>

              {/* Audio */}
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Audio / Sound</label>
                <input 
                  type="text"
                  value={audio}
                  onChange={(e) => setAudio(e.target.value)}
                  placeholder="e.g. orchestral swells, wind howling, rain on stone"
                  className="w-full bg-cinematic-black border border-white/10 rounded-xl px-4 py-3 text-sm gold-border-focus"
                />
              </div>

              {/* Mood Tags */}
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-3">Mood Tags</label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_TAGS.map(mood => (
                    <button
                      key={mood}
                      onClick={() => toggleMood(mood)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        selectedMoods.includes(mood)
                          ? 'bg-gold text-cinematic-black border-gold shadow-lg shadow-gold/20'
                          : 'bg-cinematic-black text-white/50 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & AI */}
        <div className="lg:col-span-5 space-y-8">
          {/* Live Preview */}
          <section className="sticky top-28">
            <h2 className="text-sm uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-gold" />
              Generated Prompt
            </h2>
            
            <div className="bg-cinematic-gray rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 space-y-4">
                <div className="relative group">
                  <div className={`min-h-[200px] bg-cinematic-black/50 border rounded-xl p-5 text-sm leading-relaxed font-mono whitespace-pre-wrap transition-colors ${
                    isOverLimit ? 'border-red-500/50 text-red-200' : 'border-white/5 text-white/80'
                  }`}>
                    {assembledPrompt || "Start building your cinematic prompt..."}
                  </div>
                  
                  {/* Character Limit Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-xl overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${charPercentage}%` }}
                      className={`h-full transition-all duration-500 ${getBarColor()}`}
                    />
                  </div>

                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <span className={`text-[10px] uppercase tracking-widest font-bold transition-colors duration-500 ${getTextColor()}`}>
                      {isOverLimit ? "Over limit!" : `${remainingChars} chars remaining`}
                    </span>
                    <span className="text-[10px] text-white/20 font-mono">
                      ({assembledPrompt.length}/{currentLimit})
                    </span>
                    {isOverLimit && <AlertCircle size={10} className="text-red-400 animate-pulse" />}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleCopy(assembledPrompt, 'main')}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl transition-all text-sm font-medium"
                  >
                    {copied === 'main' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    <span>{copied === 'main' ? 'Copied!' : 'Copy Prompt'}</span>
                  </button>
                  <button 
                    onClick={handleClearAll}
                    className="flex items-center justify-center gap-2 px-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-3 rounded-xl transition-all text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    <span>Clear</span>
                  </button>
                </div>

                <button 
                  onClick={improveWithAI}
                  disabled={isImproving || !assembledPrompt}
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-cinematic-black transition-all relative overflow-hidden ${
                    isImproving || !assembledPrompt 
                      ? 'bg-white/10 text-white/30 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-gold via-[#f0d060] to-gold hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-gold/20'
                  }`}
                >
                  {isImproving ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-cinematic-black/30 border-t-cinematic-black rounded-full animate-spin" />
                      <span>Gemini is thinking...</span>
                    </div>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>IMPROVE WITH AI</span>
                    </>
                  )}
                </button>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Results */}
            <AnimatePresence>
              {aiResults && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-8 space-y-6"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">AI Master Results</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  {/* Improved Master */}
                  <div className="bg-gold/5 border border-gold/20 rounded-2xl p-6 relative group">
                    <div className="absolute -top-3 left-6 bg-gold text-cinematic-black px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      Improved Master
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed italic mb-4">
                      "{aiResults.improved}"
                    </p>
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => handleCopy(aiResults.improved, 'improved')}
                        className="flex items-center gap-2 text-xs text-gold hover:text-white transition-colors"
                      >
                        {copied === 'improved' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied === 'improved' ? 'Copied' : 'Copy Master'}</span>
                      </button>
                      <button 
                        onClick={() => setShowComparison(true)}
                        className="flex items-center gap-2 text-xs text-white/40 hover:text-gold transition-colors"
                      >
                        <Layout size={14} />
                        <span>Compare All</span>
                      </button>
                    </div>
                  </div>

                  {/* Variations */}
                  <div className="grid grid-cols-1 gap-4">
                    {[aiResults.variation1, aiResults.variation2, aiResults.variation3].map((v, i) => (
                      <div key={i} className="bg-cinematic-gray border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">{v.title}</h3>
                          <button 
                            onClick={() => handleCopy(v.prompt, `v${i}`)}
                            className="text-white/30 hover:text-gold transition-colors"
                          >
                            {copied === `v${i}` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed">
                          {v.prompt}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-cinematic-gray border-l border-white/10 z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="text-gold" />
                  <h2 className="text-xl">Prompt History</h2>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <ChevronDown size={24} className="rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                    <History size={48} />
                    <p>No history yet</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full text-left bg-cinematic-black border border-white/5 p-4 rounded-xl hover:border-gold/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{item.platform}</span>
                        <span className="text-[10px] text-white/30">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-white/60 line-clamp-3 group-hover:text-white/90 transition-colors">
                        {item.prompt}
                      </p>
                    </button>
                  ))
                )}
              </div>

              {history.length > 0 && (
                <div className="p-6 border-t border-white/10">
                  <button 
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('cineprompt_history_v2');
                    }}
                    className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    <span>Clear History</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Templates Drawer */}
      <AnimatePresence>
        {showTemplates && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplates(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 h-[80vh] bg-cinematic-gray border-t border-white/10 z-[101] shadow-2xl flex flex-col rounded-t-[32px] overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-cinematic-black/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center text-gold">
                    <Layout size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-gold">Cinematic Templates</h2>
                    <p className="text-sm text-white/40">Select a preset to jumpstart your production</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTemplates(false)}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {TEMPLATES.map((t) => (
                    <div 
                      key={t.id}
                      className="bg-cinematic-black border border-white/5 rounded-2xl p-6 flex flex-col hover:border-gold/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">{t.emoji}</span>
                        <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold uppercase tracking-widest text-white/40">{t.category}</span>
                      </div>
                      <h3 className="text-lg font-serif text-white group-hover:text-gold transition-colors mb-2">{t.name}</h3>
                      <p className="text-sm text-white/50 line-clamp-2 mb-4 flex-1 italic">"{t.scene}"</p>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {t.moods.map(m => (
                          <span key={m} className="px-2 py-0.5 bg-gold/5 border border-gold/10 rounded text-[10px] text-gold/70">{m}</span>
                        ))}
                      </div>

                      <button
                        onClick={() => loadTemplate(t)}
                        className="w-full py-3 bg-white/5 hover:bg-gold hover:text-cinematic-black rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        Use Template <Move size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      <AnimatePresence>
        {showComparison && aiResults && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComparison(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-10 lg:inset-20 bg-cinematic-gray rounded-[32px] border border-white/10 z-[201] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-cinematic-black/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center text-gold">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-gold">Prompt Comparison</h2>
                    <p className="text-sm text-white/40">Compare the master result with creative variations</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowComparison(false)}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Master */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-gold font-bold uppercase tracking-widest text-xs">Improved Master</h3>
                      <button 
                        onClick={() => handleCopy(aiResults.improved, 'comp-master')}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gold"
                      >
                        {copied === 'comp-master' ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                    <div className="bg-cinematic-black border border-gold/30 rounded-2xl p-6 min-h-[200px] text-lg leading-relaxed italic text-white/90">
                      "{aiResults.improved}"
                    </div>
                  </div>

                  {/* Variations Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    {[aiResults.variation1, aiResults.variation2, aiResults.variation3].map((v, i) => (
                      <div key={i} className="bg-cinematic-black/50 border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">{v.title}</h4>
                          <button 
                            onClick={() => handleCopy(v.prompt, `comp-v${i}`)}
                            className="text-white/30 hover:text-gold transition-colors"
                          >
                            {copied === `comp-v${i}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                          </button>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed">
                          {v.prompt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-8 border-t border-white/10 bg-cinematic-black/30 flex justify-end">
                <button 
                  onClick={() => setShowComparison(false)}
                  className="px-8 py-3 bg-gold text-cinematic-black rounded-xl font-bold hover:scale-105 transition-all"
                >
                  Done Comparing
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-cinematic-black/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 text-white/20">
            <span className="text-[10px] uppercase tracking-[0.4em]">Runway</span>
            <span className="text-[10px] uppercase tracking-[0.4em]">Sora</span>
            <span className="text-[10px] uppercase tracking-[0.4em]">Veo</span>
            <span className="text-[10px] uppercase tracking-[0.4em]">Kling</span>
            <span className="text-[10px] uppercase tracking-[0.4em]">Pika</span>
          </div>
          <p className="text-xs text-white/20 uppercase tracking-[0.4em]">
            &copy; 2026 CinePrompt AI • Professional Film Prompt Engineering
          </p>
        </div>
      </footer>
    </div>
  );
}

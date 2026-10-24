import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles, Plus, Trash2, Printer, Volume2, RotateCw, BookOpen, AlertCircle,
  Heart, Key, BarChart3, RefreshCw, Layers, MessageSquare, Lightbulb, Search, Mic, Square
} from 'lucide-react';

// --- CONSTANTS ---
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TTS_VOICE = 'Sulafat'; // 따뜻한 톤. 'Kore'(단호), 'Achernar'(부드러움) 등으로 변경 가능

const CATEGORIES = ['등교 / 아침 루틴', '간식 & 식사 예절', '할 일 & 공부 독촉', '미디어 & 스마트폰', '훈육 / 생활 습관'];

const PRESET_EXAMPLES = [
  { category: CATEGORIES[0], phrases: ['하랑아, 내일 학교가방 미리 싸놓자.', '오늘 학교 갔다 와서 옷 아무 데나 벗어놓지 마.', '양치 세 번 하고 세수 깔끔하게 해야지.'] },
  { category: CATEGORIES[1], phrases: ['오늘 무슨 과자 사 먹었어? 얼마였어?', '음식 오래 남겨 놓으면 맛 떨어져, 지금 맛있게 먹자.', '밥 먹을 때 핸드폰 보지 말고 식사에 집중하자.'] },
  { category: CATEGORIES[2], phrases: ['맨날 봤던 책 말고, 기적의 계산법 먼저 해.', '장난 그만치고 할 일부터 끝내자.', '아윤아, 사랑아! 각자 자리로 돌아가서 공부할 시간이야.'] },
  { category: CATEGORIES[3], phrases: ['누가 TV 계속 틀어만 놓으라 그랬어? 끄자.', '약속한 동영상 시간 끝났다. 그만 보고 꺼줘.'] }
];

const DEFAULT_CARDS = [
  { id: 'c1', kor: '하랑아, 내일 학교가방 미리 싸놓자.', eng: "Harang, sweetie, let's pack your school bag for tomorrow ahead of time, okay?", pron: '하랑, 스위티, 렛츠 팩 유어 스쿨 백 포 터모로우 어헤드 오브 타임, 오케이?', alt: 'Harang, honey, can you get your backpack ready for tomorrow?', category: CATEGORIES[0], tone: 'Sweet & Friendly', tip: 'honey, sweetie 같은 사랑스러운 호칭을 넣으면 거부감이 줄어듭니다.', favorite: true },
  { id: 'c2', kor: '오늘 무슨 과자 사 먹었어? 얼마였어?', eng: 'What tasty snacks did you buy today, huh? How much was it?', pron: '왓 테이스티 스낵스 디쥬 바이 투데이, 허? 하우 머치 워즈 잇?', alt: 'What snacks did you get today? Sounds good!', category: CATEGORIES[1], tone: 'Playful', tip: 'tasty를 더해 흥미를 유발하고, huh?로 다정하게 물어보세요.', favorite: false },
  { id: 'c3', kor: '음식 오래 남겨 놓으면 맛 떨어져, 지금 맛있게 먹자.', eng: "Eat up while it's still warm and yummy! It won't taste as good if we leave it out.", pron: '이트 업 와일 잇츠 스틸 웜 앤 여미! 잇 원트 테이스트 애즈 굿 이프 위 리브 잇 아웃.', alt: "Let's enjoy it right now before it cools down.", category: CATEGORIES[1], tone: 'Encouraging', tip: '부정적인 표현보다 "따뜻할 때 맛있게 먹자"는 긍정형 문장으로 바꾸는 것이 좋습니다.', favorite: true },
  { id: 'c4', kor: '장난 그만치고 빨리빨리 할 일부터 하자.', eng: "Alright my loves, silly time is over! Let's get back to work. Here we go!", pron: '얼라잇 마이 러브스, 실리 타임 이즈 오버! 렛츠 겟 백 투 워크. 히어 위 고!', alt: "Focus time! Let's finish what we need to do first.", category: CATEGORIES[2], tone: 'Sweet & Friendly', tip: '"silly time is over"는 원어민 부모들이 장난을 유쾌하게 끊어줄 때 자주 쓰는 표현입니다.', favorite: false },
  { id: 'c5', kor: '누가 TV 계속 틀어만 놓으라 그랬어?', eng: 'Hey sweetie, who left the TV running like that? Let me turn it off for you.', pron: '헤이 스위티, 후 레프트 더 티비 러닝 라이크 댓? 렛 미 턴 잇 오프 포 유.', alt: "Let's turn off the TV for now if nobody is watching.", category: CATEGORIES[3], tone: 'Firm but Kind', tip: '뒤에 "내가 꺼줄게(Let me turn it off)"를 붙이면 다그치는 느낌이 완화됩니다.', favorite: false },
  { id: 'c6', kor: '왜 여러 번 말하게 하니?', eng: 'Honey, please listen the first time Mommy asks, okay?', pron: '허니, 플리즈 리슨 더 퍼스트 타임 마미 애스크스, 오케이?', alt: 'How many times do I have to ask, sweetie?', category: CATEGORIES[4], tone: 'Firm but Kind', tip: '"첫 번째 말할 때 들어줘"라고 긍정적인 가이드를 주는 화법입니다.', favorite: true }
];

const TABS = [
  { id: 'input', label: '1. 대화 입력', Icon: MessageSquare },
  { id: 'cards', label: '2. 회화 카드', Icon: Layers },
  { id: 'print', label: '3. 프린트 시트', Icon: Printer },
  { id: 'stats', label: '4. 대화 패턴 리포트', Icon: BarChart3 },
  { id: 'voice', label: '5. 음성 통역', Icon: Mic }
];

const loadLS = (key, fallback) => {
  try { return localStorage.getItem(key) ?? fallback; } catch (e) { return fallback; }
};

export default function App() {
  // --- STATE ---
  const [apiKey, setApiKey] = useState(() => loadLS('gemini_api_key', ''));
  const [activeTab, setActiveTab] = useState('input');

  const [inputMode, setInputMode] = useState('bulk');
  const [bulkText, setBulkText] = useState('');
  const [dailyTexts, setDailyTexts] = useState({ Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '' });
  const [targetAges, setTargetAges] = useState('7세 & 10세');
  const [selectedTone, setSelectedTone] = useState('Sweet & Friendly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState('');

  const [cards, setCards] = useState(() => {
    try {
      const saved = localStorage.getItem('parent_english_cards');
      return saved ? JSON.parse(saved) : DEFAULT_CARDS;
    } catch (e) { return DEFAULT_CARDS; }
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [flippedCards, setFlippedCards] = useState({});

  const [quizCard, setQuizCard] = useState(null);
  const [showQuizAnswer, setShowQuizAnswer] = useState(false);

  // TTS State
  const [speakSpeed, setSpeakSpeed] = useState('normal'); // 'normal' | 'slow'
  const [speakingKey, setSpeakingKey] = useState(null);
  const [ttsError, setTtsError] = useState('');
  const [voices, setVoices] = useState([]);
  const audioCtxRef = useRef(null);
  const audioCacheRef = useRef(new Map());
  const currentSourceRef = useRef(null);

  // Voice Translate State
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceItems, setVoiceItems] = useState([]);
  const [voiceDraft, setVoiceDraft] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const settingsRef = useRef({});
  settingsRef.current = { apiKey, targetAges, selectedTone };
  const SpeechRecognitionAPI =
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

  // --- PERSIST ---
  useEffect(() => {
    try { localStorage.setItem('parent_english_cards', JSON.stringify(cards)); } catch (e) { /* ignore */ }
  }, [cards]);

  useEffect(() => {
    try { localStorage.setItem('gemini_api_key', apiKey); } catch (e) { /* ignore */ }
  }, [apiKey]);

  useEffect(() => {
    if (cards.length > 0) setQuizCard(cards[Math.floor(Math.random() * cards.length)]);
  }, [cards]);

  // --- TTS ---
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const bestVoice = useMemo(() => {
    const en = voices.filter((v) => v.lang.startsWith('en'));
    const prefer = ['Natural', 'Google US English', 'Samantha', 'Aria', 'Jenny', 'Ava', 'Allison'];
    for (const key of prefer) {
      const found = en.find((v) => v.name.includes(key) && v.lang === 'en-US');
      if (found) return found;
    }
    return en.find((v) => v.lang === 'en-US') || en[0] || null;
  }, [voices]);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    try { currentSourceRef.current?.stop(); } catch (e) { /* 이미 종료됨 */ }
    setSpeakingKey(null);
  };

  // 브라우저 기본 음성 (대체용)
  const playBrowserTTS = (text, slow) =>
    new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        alert('이 브라우저는 음성 합성을 지원하지 않습니다.');
        return resolve();
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      if (bestVoice) u.voice = bestVoice;
      u.rate = slow ? 0.65 : 0.9;
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.speak(u);
    });

  // Gemini TTS (자연스러운 원어민 음성)
  const playGeminiTTS = async (text, slow) => {
    const cacheKey = `${slow ? 's' : 'n'}|${TTS_VOICE}|${text}`;
    const ctx =
      audioCtxRef.current ||
      (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 }));
    if (ctx.state === 'suspended') await ctx.resume();

    let buffer = audioCacheRef.current.get(cacheKey);
    if (!buffer) {
      const prompt = `Say the following in a warm, natural American mom voice talking lovingly to her kids${
        slow ? ', slowly and clearly, with short pauses between phrases' : ''
      }: ${text}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } }
            }
          })
        }
      );
      if (!res.ok) throw new Error(`TTS Error: ${res.status}`);

      const data = await res.json();
      const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) throw new Error('오디오 데이터가 없습니다.');

      // base64 → 16bit PCM(24kHz, mono) → AudioBuffer
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const pcm = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
      buffer = ctx.createBuffer(1, pcm.length, 24000);
      const ch = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
      audioCacheRef.current.set(cacheKey, buffer);
    }

    return new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = resolve;
      currentSourceRef.current = source;
      source.start();
    });
  };

  // 카드마다 key를 달리해서 "재생 중" 표시 & 토글 정지
  const speakText = async (text, key = 'default') => {
    if (speakingKey === key) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    setTtsError('');
    setSpeakingKey(key);
    const slow = speakSpeed === 'slow';

    try {
      if (apiKey.trim()) await playGeminiTTS(text, slow);
      else await playBrowserTTS(text, slow);
    } catch (err) {
      console.error(err);
      setTtsError('AI 음성을 불러오지 못해 기본 음성으로 재생했어요.');
      await playBrowserTTS(text, slow);
    } finally {
      setSpeakingKey((k) => (k === key ? null : k));
    }
  };

  // --- VOICE → ENGLISH ---
  const updateVoiceItem = (id, patch) =>
    setVoiceItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const translateVoice = async (id, kor) => {
    const { apiKey: key, targetAges: ages, selectedTone: tone } = settingsRef.current;
    if (!key.trim()) {
      updateVoiceItem(id, { status: 'nokey' });
      return;
    }
    const systemPrompt = `
You are an expert bilingual parenting coach and native English speaker.
Translate the Korean sentence a parent just said into natural, warm native English that a parent would really say to kids (Target age: ${ages}). Tone: "${tone}".
Return ONE JSON object in this exact schema:
{
  "eng": "Primary native English expression",
  "pron": "Korean Hangul pronunciation of eng, spaced by phrase, as naturally spoken",
  "alt": "Alternative expression",
  "category": "Exactly one of: ${CATEGORIES.join(' | ')}",
  "tip": "Short Korean tip on nuance or key idiom"
}`;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: kor }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('응답 데이터를 읽을 수 없습니다.');
      const parsed = JSON.parse(text);
      const r = Array.isArray(parsed) ? parsed[0] : parsed;
      updateVoiceItem(id, {
        status: 'done',
        eng: r.eng || '',
        pron: r.pron || '',
        alt: r.alt || '',
        category: CATEGORIES.includes(r.category) ? r.category : CATEGORIES[4],
        tip: r.tip || '다정하고 부드러운 어조로 말해보세요.'
      });
    } catch (err) {
      console.error(err);
      updateVoiceItem(id, { status: 'error', error: err.message });
    }
  };

  const handleFinalVoice = (text) => {
    const kor = (text || '').trim();
    if (!kor) return;
    const id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setVoiceItems((prev) => [{ id, kor, status: 'loading', saved: false }, ...prev]);
    translateVoice(id, kor);
  };

  const stopListening = () => {
    listeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch (e) { /* ignore */ }
    setIsListening(false);
    setInterimText('');
  };

  const startListening = () => {
    if (!SpeechRecognitionAPI) return;
    stopSpeaking();
    setVoiceError('');
    const rec = new SpeechRecognitionAPI();
    rec.lang = 'ko-KR';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) handleFinalVoice(t);
        else interim += t;
      }
      setInterimText(interim);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setVoiceError('마이크 권한이 필요해요. 주소창 옆 자물쇠 아이콘에서 마이크를 허용해 주세요.');
      } else if (e.error === 'network') {
        setVoiceError('음성 인식 서버에 연결하지 못했어요. 인터넷 연결을 확인하고, Brave나 일부 브라우저라면 Chrome에서 열어 주세요.');
      } else if (e.error === 'audio-capture') {
        setVoiceError('마이크를 찾지 못했어요. 마이크 연결과, 컴퓨터 설정에서 브라우저의 마이크 사용 허용 여부를 확인해 주세요.');
      } else {
        setVoiceError(`음성 인식 오류: ${e.error}`);
      }
      listeningRef.current = false;
      setIsListening(false);
    };
    rec.onend = () => {
      // 브라우저가 잠깐 침묵 후 자동 종료하면, 듣는 중일 때는 다시 시작
      if (listeningRef.current) {
        try { rec.start(); } catch (e) { /* ignore */ }
      } else {
        setIsListening(false);
        setInterimText('');
      }
    };

    recognitionRef.current = rec;
    listeningRef.current = true;
    try {
      rec.start();
      setIsListening(true);
    } catch (e) {
      listeningRef.current = false;
      setVoiceError(`마이크를 시작하지 못했어요: ${e.message || e.name}`);
    }
  };

  const saveVoiceCard = (item) => {
    setCards((prev) => [
      {
        id: `voice_${item.id}`,
        kor: item.kor,
        eng: item.eng,
        pron: item.pron,
        alt: item.alt,
        category: item.category,
        tone: selectedTone,
        tip: item.tip,
        favorite: false
      },
      ...prev
    ]);
    updateVoiceItem(item.id, { saved: true });
  };

  // 다른 탭으로 이동하면 마이크 끄기
  useEffect(() => {
    if (activeTab !== 'voice') stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // --- HANDLERS ---
  const handleLoadPreset = (preset) => {
    const t = preset.phrases.join('\n');
    setBulkText((prev) => (prev ? `${prev}\n${t}` : t));
  };
  const toggleFlip = (id) => setFlippedCards((p) => ({ ...p, [id]: !p[id] }));
  const toggleFavorite = (id) => setCards((p) => p.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)));
  const deleteCard = (id) => setCards((p) => p.filter((c) => c.id !== id));

  const handleGenerate = async () => {
    const phrases = inputMode === 'bulk'
      ? bulkText.split('\n').filter((p) => p.trim())
      : Object.values(dailyTexts).filter((p) => p.trim());

    if (phrases.length === 0) {
      alert('변환할 한글 문장을 한 개 이상 입력해 주세요!');
      return;
    }

    setIsGenerating(true);
    setApiError('');

    const systemPrompt = `
You are an expert bilingual parenting coach and native English speaker.
Your goal is to convert everyday Korean parenting statements into natural, warm, encouraging native English expressions suitable for parents speaking to kids (Target age: ${targetAges}).
Adopt the tone: "${selectedTone}".

For each Korean sentence, output a JSON array of objects in this exact schema:
[
  {
    "kor": "Original Korean sentence",
    "eng": "Primary native English expression (warm & natural)",
    "pron": "Korean Hangul pronunciation of the primary English expression, spaced by phrase, as naturally spoken (e.g. 허니, 플리즈 리슨 더 퍼스트 타임)",
    "alt": "Alternative expression or nuance variation",
    "category": "Exactly one of: ${CATEGORIES.join(' | ')}",
    "tone": "${selectedTone}",
    "tip": "Short Korean tip on intonation, parenting nuance, or key native idiom used"
  }
]
`;
    const userPrompt = `Translate and refine these Korean parent statements into natural native English cards for my kids:\n${phrases.join('\n')}`;

    try {
      if (apiKey.trim()) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );
        if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) throw new Error('응답 데이터를 읽을 수 없습니다.');

        const parsed = JSON.parse(jsonText);
        const newCards = parsed.map((item, idx) => ({
          id: `gen_${Date.now()}_${idx}`,
          kor: item.kor || '한국어 표현',
          eng: item.eng || 'Native English expression',
          pron: item.pron || '',
          alt: item.alt || '',
          category: CATEGORIES.includes(item.category) ? item.category : CATEGORIES[4],
          tone: item.tone || selectedTone,
          tip: item.tip || '다정하고 부드러운 어조로 말해보세요.',
          favorite: false
        }));
        setCards((prev) => [...newCards, ...prev]);
        setActiveTab('cards');
      } else {
        // API 키가 없을 때의 간단한 데모 엔진
        await new Promise((r) => setTimeout(r, 1200));
        const mock = phrases.map((kor, idx) => {
          let cat = CATEGORIES[4];
          if (/가방|아침|학교/.test(kor)) cat = CATEGORIES[0];
          else if (/과자|밥|음식/.test(kor)) cat = CATEGORIES[1];
          else if (/TV|폰|동영상/.test(kor)) cat = CATEGORIES[3];
          else if (/공부|할 일|계산법/.test(kor)) cat = CATEGORIES[2];
          return {
            id: `mock_${Date.now()}_${idx}`,
            kor,
            eng: `Sweetie, ${kor.length > 10 ? "let's take care of this together, okay?" : 'can you do this right now, honey?'}`,
            pron: kor.length > 10 ? '스위티, 렛츠 테이크 케어 오브 디스 투게더, 오케이?' : '스위티, 캔 유 두 디스 라잇 나우, 허니?',
            alt: 'How about we do this step-by-step together?',
            category: cat,
            tone: selectedTone,
            tip: '[시뮬레이션 모드] API 키를 입력하시면 더 정교한 원어민 뉘앙스 분석과 자연스러운 AI 음성이 적용됩니다.',
            favorite: false
          };
        });
        setCards((prev) => [...mock, ...prev]);
        setActiveTab('cards');
      }
    } catch (err) {
      console.error(err);
      setApiError(err.message || 'Gemini API 호출에 실패하였습니다. API 키를 확인해 주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredCards = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return cards.filter((c) => {
      const matchCat = selectedCategory === 'All' || c.category === selectedCategory || (selectedCategory === 'Favorites' && c.favorite);
      return matchCat && (c.kor.toLowerCase().includes(q) || c.eng.toLowerCase().includes(q));
    });
  }, [cards, selectedCategory, searchQuery]);

  const statsData = useMemo(() => {
    const total = cards.length;
    if (!total) return [];
    const counts = {};
    cards.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count, percentage: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [cards]);

  const speedToggle = (
    <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold shrink-0">
      {[['normal', '보통 속도'], ['slow', '🐢 천천히']].map(([val, label]) => (
        <button
          key={val}
          onClick={() => setSpeakSpeed(val)}
          className={`px-3 py-1 rounded-md transition ${speakSpeed === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-amber-100">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-white shadow-md shadow-amber-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">엄마표 영어회화 패턴 카드 생성기</h1>
              <p className="text-xs text-slate-500">7세 & 10세 맞춤 다정한 원어민 부모 표현 스튜디오</p>
            </div>
          </div>
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === id ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {id === 'cards' ? `${label} (${cards.length})` : label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full print:p-0">
        {/* API KEY BAR */}
        <div className="mb-6 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-900">Gemini API 키 설정:</span>
              <span className="text-amber-800 ml-1">
                {apiKey
                  ? 'API 키 연결됨 · AI 원어민 뉘앙스 + 자연스러운 AI 음성 사용 중'
                  : 'API 키 없이도 데모로 사용할 수 있어요 (음성은 기본 브라우저 음성)'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="password"
              placeholder="Gemini API Key 입력..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 flex-1 sm:w-60"
            />
            {apiKey && (
              <button onClick={() => setApiKey('')} className="text-amber-700 hover:text-amber-900 font-semibold text-xs px-2">
                지우기
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: INPUT */}
        {activeTab === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-500" />
                      일주일 동안 아이들에게 한 한글 대화 입력
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">평소 말했던 직설적인 표현도 원어민 다정한 표현으로 다듬어드립니다.</p>
                  </div>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                    {[['bulk', '한 번에 줄글로'], ['daily', '요일별 기록']].map(([m, l]) => (
                      <button
                        key={m}
                        onClick={() => setInputMode(m)}
                        className={`px-3 py-1 rounded-md transition ${inputMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {inputMode === 'bulk' ? (
                  <div>
                    <textarea
                      rows={8}
                      placeholder={'예시:\n하랑아 내일 학교 가방 미리 싸놓자.\n오늘 무슨 과자 사 먹었어? 얼마였어?\n음식 오래 남겨 놓으면 맛 떨어져.'}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                    />
                    <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                      <span>엔터(Enter)로 구분하여 여러 문장을 작성해 주세요.</span>
                      <span>{bulkText.split('\n').filter((p) => p.trim()).length}개 문장 입력됨</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <label className="text-xs font-bold text-amber-700 block mb-1">{day} (요일별 대화)</label>
                        <input
                          type="text"
                          placeholder="오늘 아이에게 했던 한마디..."
                          value={dailyTexts[day]}
                          onChange={(e) => setDailyTexts({ ...dailyTexts, [day]: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">아이 연령 설정</label>
                    <input
                      type="text"
                      value={targetAges}
                      onChange={(e) => setTargetAges(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">변환 어조 (Tone Style)</label>
                    <select
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="Sweet & Friendly">다정하고 따뜻한 어조 (Sweet & Friendly)</option>
                      <option value="Firm but Kind">단호하지만 친절한 어조 (Firm but Kind)</option>
                      <option value="Encouraging">동기부여 & 칭찬 어조 (Encouraging)</option>
                      <option value="Playful">장난스럽고 재미있는 어조 (Playful)</option>
                    </select>
                  </div>
                </div>

                {apiError && (
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{apiError}</span>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="mt-6 w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-400 hover:from-amber-600 hover:to-rose-500 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-200/50 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isGenerating ? (
                    <><RotateCw className="w-4 h-4 animate-spin" />원어민 부모 어조로 AI 분석 & 카드로 변환 중...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" />원어민 회화 패턴 카드로 생성하기</>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  7~10세 자주 쓰는 추천 프리셋 예시
                </h3>
                <p className="text-xs text-slate-500 mb-4">원하는 카테고리를 클릭하면 대화창에 문장이 빠르게 채워집니다.</p>
                <div className="space-y-3">
                  {PRESET_EXAMPLES.map((preset) => (
                    <div key={preset.category} className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-900">{preset.category}</span>
                        <button
                          onClick={() => handleLoadPreset(preset)}
                          className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-0.5 bg-white border border-amber-300 px-2 py-0.5 rounded-md hover:bg-amber-100 transition"
                        >
                          <Plus className="w-3 h-3" /> 담기
                        </button>
                      </div>
                      <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                        {preset.phrases.map((p) => <li key={p} className="truncate">{p}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-4 text-xs text-sky-900 space-y-1.5">
                <span className="font-bold block text-sky-950">💡 엄마표 영어 말하기 Tip</span>
                <p className="text-sky-800 leading-relaxed">
                  카드의 <strong>원어민 발음 듣기</strong>를 먼저 누르고, 초록색 <strong>한글 발음</strong>을 보며 따라 말해 보세요.
                  어려우면 <strong>🐢 천천히</strong> 속도로 들으면 됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CARDS */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['All', 'Favorites', ...CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'Favorites' ? '⭐ 즐겨찾기' : cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {speedToggle}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="한글/영어 표현 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <button
                  onClick={() => setActiveTab('print')}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  프린트 시트 보기
                </button>
              </div>
            </div>

            {ttsError && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{ttsError}</div>
            )}

            {filteredCards.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">생성된 회화 카드가 없습니다</h3>
                <p className="text-xs text-slate-400 mt-1">대화 입력 탭에서 새로운 문장을 추가하거나 검색어를 변경해 보세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCards.map((card) => {
                  const isFlipped = flippedCards[card.id];
                  const isSpeaking = speakingKey === card.id;
                  return (
                    <div key={card.id} className="relative h-72">
                      <div
                        className={`w-full h-full cursor-pointer rounded-2xl border ${
                          card.favorite ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 bg-white'
                        } shadow-sm hover:shadow-md relative`}
                        onClick={() => toggleFlip(card.id)}
                      >
                        {/* FRONT */}
                        <div className={`absolute inset-0 p-5 rounded-2xl flex-col justify-between ${isFlipped ? 'hidden' : 'flex'}`}>
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">{card.category}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(card.id); }}
                                  className="text-slate-300 hover:text-amber-500 p-1 transition"
                                >
                                  <Heart className={`w-4 h-4 ${card.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                                  className="text-slate-300 hover:text-rose-500 p-1 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-slate-400 mb-1">한글 패턴</p>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-3">"{card.kor}"</h4>
                          </div>
                          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                              <RotateCw className="w-3 h-3" /> 클릭하면 원어민 표현이 보입니다
                            </span>
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{card.tone}</span>
                          </div>
                        </div>

                        {/* BACK */}
                        <div className={`absolute inset-0 p-5 rounded-2xl bg-slate-900 text-white flex-col justify-between overflow-hidden ${isFlipped ? 'flex' : 'hidden'}`}>
                          <div>
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 shrink-0">Native Parent</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); speakText(card.eng, card.id); }}
                                className={`p-1 flex items-center gap-1 text-xs rounded-lg px-2 transition ${
                                  isSpeaking ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300 hover:text-amber-100'
                                }`}
                              >
                                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                                {isSpeaking ? '재생 중 (누르면 정지)' : '원어민 발음 듣기'}
                              </button>
                            </div>
                            <p className="text-sm font-bold text-amber-200 leading-snug mb-1">"{card.eng}"</p>
                            {card.pron && <p className="text-[11px] text-emerald-300 mb-2 leading-snug">🗣️ {card.pron}</p>}
                            {card.alt && (
                              <p className="text-[11px] text-slate-300 line-clamp-2 italic border-l-2 border-slate-700 pl-2 my-1">Alt: "{card.alt}"</p>
                            )}
                            {card.tip && (
                              <p className="text-[10px] text-slate-400 mt-2 bg-slate-800/80 p-2 rounded-lg leading-relaxed">💡 {card.tip}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500">클릭하여 뒤집기 🔄</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRINT */}
        {activeTab === 'print' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
              <div>
                <h3 className="text-sm font-bold text-slate-900">🖨️ A4 한눈에 보는 프린트 & 가위선 시트</h3>
                <p className="text-xs text-slate-500">냉장고나 아이들 방문에 붙여놓고 한글 발음을 보며 바로 말해보는 연습 카드입니다.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                A4로 출력 / PDF 저장
              </button>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-md max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-none">
              <div className="border-2 border-amber-300 bg-amber-50/50 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-amber-950">다정한 엄마표 영어 표현 플래시 카드</h2>
                  <p className="text-xs text-amber-800 mt-0.5">✂️ 점선을 따라 오려 냉장고나 벽에 붙여두고 매일 다정하게 말해 보세요! ({targetAges} 맞춤)</p>
                </div>
                <div className="bg-amber-500 text-white text-[11px] font-bold px-3 py-1 rounded-full">Weekly Practice</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
                {cards.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 relative flex flex-col justify-between min-h-[160px] print:break-inside-avoid"
                  >
                    <span className="absolute -top-3 right-4 bg-white px-1 text-slate-400 text-xs">✂️</span>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{card.category}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">{card.tone}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mb-2 leading-snug">"{card.kor}"</p>
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 mb-2">
                        <p className="text-xs font-extrabold text-amber-900 leading-snug">"{card.eng}"</p>
                        {card.pron && <p className="text-[10px] text-emerald-700 mt-1">🗣️ {card.pron}</p>}
                        {card.alt && (
                          <p className="text-[10px] text-slate-500 mt-1 border-t border-slate-100 pt-1">또는: "{card.alt}"</p>
                        )}
                      </div>
                    </div>
                    <p className="text-[9.5px] text-slate-500 italic">💡 Tip: {card.tip}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                <span>엄마표 대화 패턴 회화 카드 • Print & Practice Sheet</span>
                <span>Generated by Parent English Pattern Studio</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: VOICE TRANSLATE */}
        {activeTab === 'voice' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 h-fit">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-amber-500" />
                  말하면 바로 영어로
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  아이에게 하고 싶은 말을 한국어로 말하면, 한 문장씩 자연스러운 영어와 한글 발음으로 바꿔 드려요.
                </p>
              </div>

              <button
                onClick={isListening ? stopListening : startListening}
                disabled={!SpeechRecognitionAPI}
                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-white shadow-md transition disabled:opacity-40 ${
                  isListening ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-amber-500 to-rose-400 hover:from-amber-600 hover:to-rose-500'
                }`}
              >
                {isListening ? (<><Square className="w-4 h-4" />듣는 중... (누르면 멈춤)</>) : (<><Mic className="w-4 h-4" />마이크 켜고 말하기</>)}
              </button>

              {!SpeechRecognitionAPI && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                  이 브라우저는 음성 인식을 지원하지 않아요. Chrome, Edge, Safari에서 열거나, 아래에 직접 입력해 주세요.
                </p>
              )}
              {voiceError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{voiceError}</p>
              )}

              {(isListening || interimText) && (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-xs text-slate-500 min-h-[3rem]">
                  {interimText || '말씀해 주세요...'}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="또는 직접 입력해서 번역..."
                  value={voiceDraft}
                  onChange={(e) => setVoiceDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      handleFinalVoice(voiceDraft);
                      setVoiceDraft('');
                    }
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  onClick={() => { handleFinalVoice(voiceDraft); setVoiceDraft(''); }}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  번역
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">듣기 속도</span>
                {speedToggle}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                연령·어조는 '1. 대화 입력' 탭의 설정이 적용돼요. 번역에는 Gemini API 키가 필요합니다.
              </p>
            </div>

            <div className="lg:col-span-2 space-y-3">
              {ttsError && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{ttsError}</div>
              )}
              {voiceItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <Mic className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-700">아직 통역된 문장이 없어요</h3>
                  <p className="text-xs text-slate-400 mt-1">마이크를 켜고 아이에게 하고 싶은 말을 한 문장씩 말해 보세요.</p>
                </div>
              ) : (
                voiceItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <p className="text-xs text-slate-500">🎤 "{item.kor}"</p>

                    {item.status === 'loading' && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5">
                        <RotateCw className="w-3 h-3 animate-spin" /> 영어로 번역 중...
                      </p>
                    )}
                    {item.status === 'nokey' && (
                      <p className="text-xs text-rose-600">번역하려면 위쪽에 Gemini API 키를 입력해 주세요.</p>
                    )}
                    {item.status === 'error' && (
                      <p className="text-xs text-rose-600">번역에 실패했어요: {item.error}</p>
                    )}
                    {item.status === 'done' && (
                      <>
                        <p className="text-sm font-bold text-amber-900 leading-snug">"{item.eng}"</p>
                        {item.pron && <p className="text-xs text-emerald-700">🗣️ {item.pron}</p>}
                        {item.alt && <p className="text-[11px] text-slate-500 italic">Alt: "{item.alt}"</p>}
                        {item.tip && <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2">💡 {item.tip}</p>}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => { stopListening(); speakText(item.eng, item.id); }}
                            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                              speakingKey === item.id ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-amber-200 hover:bg-slate-800'
                            }`}
                          >
                            <Volume2 className={`w-3.5 h-3.5 ${speakingKey === item.id ? 'animate-pulse' : ''}`} />
                            {speakingKey === item.id ? '재생 중 (누르면 정지)' : '원어민 발음 듣기'}
                          </button>
                          <button
                            onClick={() => saveVoiceCard(item)}
                            disabled={item.saved}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {item.saved ? '카드로 저장됨' : '회화 카드로 저장'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: STATS & QUIZ */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                  주간 대화 패턴 분포 분석
                </h3>
                <p className="text-xs text-slate-500 mt-1">엄마가 이번 주 아이에게 주로 어떤 대화를 건넸는지 카테고리별 비중입니다.</p>
              </div>

              {statsData.length === 0 ? (
                <p className="text-xs text-slate-400">분석할 회화 카드가 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {statsData.map((s) => (
                    <div key={s.category} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800">{s.category}</span>
                        <span className="text-amber-600">{s.count}개 ({s.percentage}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full transition-all duration-500"
                          style={{ width: `${s.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                <span className="font-bold block mb-1">💡 맞춤 피드백:</span>
                <p className="leading-relaxed">
                  지시할 때는 <strong>"Do your math"</strong> 보다는 <strong>"Let's do our math together, sweetie!"</strong> 처럼
                  청유형 문장과 다정한 호칭을 섞어서 사용해 보세요.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    오늘의 엄마표 영어 퀴즈
                  </h3>
                  <button
                    onClick={() => {
                      stopSpeaking();
                      setQuizCard(cards[Math.floor(Math.random() * cards.length)]);
                      setShowQuizAnswer(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    title="다른 문제 보기"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {quizCard ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded inline-block mb-2">{quizCard.category}</span>
                      <p className="text-xs font-bold text-slate-800">"{quizCard.kor}"</p>
                      <p className="text-[11px] text-slate-400 mt-2">이 말을 원어민 다정한 표현으로 말한다면?</p>
                    </div>

                    {showQuizAnswer ? (
                      <div className="bg-slate-900 text-white rounded-xl p-4 text-center space-y-2">
                        <p className="text-xs font-bold text-amber-300">"{quizCard.eng}"</p>
                        {quizCard.pron && <p className="text-[11px] text-emerald-300">🗣️ {quizCard.pron}</p>}
                        <div className="flex justify-center">{speedToggle}</div>
                        <button
                          onClick={() => speakText(quizCard.eng, 'quiz')}
                          className={`inline-flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg ${
                            speakingKey === 'quiz' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-amber-200'
                          }`}
                        >
                          <Volume2 className="w-3 h-3" />
                          {speakingKey === 'quiz' ? '재생 중 (누르면 정지)' : '원어민 발음 듣기'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowQuizAnswer(true)}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                      >
                        정답 확인하기 👁️
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">카드를 등록하면 퀴즈가 시작됩니다.</p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
                매일 한 문장씩 말하기 연습으로 자연스럽게 입에 익혀보세요!
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 print:hidden">
        <p>엄마표 영어회화 패턴 카드 스튜디오 • 7세 & 10세 다정한 원어민 부모 표현 지원</p>
      </footer>
    </div>
  );
}

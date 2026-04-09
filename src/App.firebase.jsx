import * as React from 'react';
const { useState, useEffect, useMemo, useRef } = React;

import {
    Layout, ClipboardList, Package,
    PlayCircle, CheckCircle2, AlertTriangle,
    Settings, Plus, Trash2,
    BarChart3, Download,
    ArrowRight, Wifi, WifiOff,
    Clock, StopCircle, AlertOctagon,
    Map as MapIcon, Upload, Move,
    Camera, X, ChevronRight, ChevronLeft,
    Maximize2, Check, Play, SkipForward,
    FileText, Share2, FileSpreadsheet,
    Pencil, Save, ArrowUp, ArrowDown,
    Brush, Type, Square, Circle, MoveDiagonal, Undo2, Mic, Sparkles, Image as ImageIcon,
    FileUp, FileJson, DownloadCloud, RefreshCw,
    User, Calendar, LogOut, Users, Edit, Grip, LayoutGrid, MapPin, Eye, Filter, List,
    Bot, Zap, TrendingUp, Activity, Target, Timer, Layers, AlertCircle, Loader2, Database, ShieldCheck, Copy, Radio, PenTool, RotateCw,
    Palette, BookOpen, CheckSquare, Megaphone, Flag, PlaySquare, Component, Award, Printer, Hash, ListChecks, Pause, Bell, BellRing,
    MinusCircle, Ban, HelpCircle, ArrowUpDown, CalendarDays, History, Search,
    ClipboardCheck, LayoutList, ImageDown, FolderDown, ChevronDown, ChevronUp,
    XCircle, Wrench, Coffee
} from 'lucide-react';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';

// --- Firebase Imports (SDK v9) ---
import { initializeApp } from "firebase/app";
import {
    getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot,
    serverTimestamp
} from "firebase/firestore";
import {
    getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken
} from "firebase/auth";

// --- Global Constants & Config ---
const APP_DATA_ID = "final-inspection-v1";

const USER_DEFINED_CONFIG = {
    apiKey: "AIzaSyDiIS-TDH6MgXaLvG9T2VRioFDomQ_zQ9E",
    authDomain: "inspection-time-c4fd3.firebaseapp.com",
    projectId: "inspection-time-c4fd3",
    storageBucket: "inspection-time-c4fd3.firebasestorage.app",
    messagingSenderId: "750297489065",
    appId: "1:750297489065:web:b19e30920b2c68182fd3b8",
    measurementId: "G-MP8Z6ZFLZT"
};

const FIREBASE_CONFIG = (USER_DEFINED_CONFIG.apiKey && USER_DEFINED_CONFIG.apiKey.length > 0)
    ? USER_DEFINED_CONFIG
    : (typeof __firebase_config !== 'undefined' && __firebase_config ? JSON.parse(__firebase_config) : {});

// --- Utilities ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatTime = (sec) => {
    if (isNaN(sec)) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getSafeTime = (ts) => {
    try {
        if (!ts) return Date.now();
        if (typeof ts === 'number') return ts;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (typeof ts.toDate === 'function') return ts.toDate().getTime();
        if (typeof ts.seconds === 'number') return ts.seconds * 1000;
        const d = new Date(ts).getTime();
        if (!isNaN(d)) return d;
    } catch (error) {
        console.warn('getSafeTime parsing error:', error);
    }
    return Date.now();
};

const toDatetimeLocal = (timestamp) => {
    const d = new Date(getSafeTime(timestamp));
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toDateShort = (timestamp) => {
    if (!timestamp) return '-';
    const d = new Date(getSafeTime(timestamp));
    return `${d.getMonth() + 1}/${d.getDate()}`;
};

const toTimeShort = (timestamp) => {
    if (!timestamp) return '-';
    const d = new Date(getSafeTime(timestamp));
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const toDateJp = (timestamp) => {
    if (!timestamp) return '    年  月  日';
    const d = new Date(getSafeTime(timestamp));
    return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日`;
};

const toDateTimeJp = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(getSafeTime(timestamp));
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日 ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const colToIndex = (colStr) => {
    if (!colStr) return -1;
    const cleanStr = colStr.toUpperCase().replace(/[^A-Z]/g, '');
    let num = 0;
    for (let i = 0; i < cleanStr.length; i++) {
        num = num * 26 + (cleanStr.charCodeAt(i) - 64);
    }
    return num - 1;
};

const base64ToUint8Array = (base64) => {
    const raw = base64.split(',')[1];
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

const resizeImage = (file) => new Promise((resolve) => { const r = new FileReader(); r.onload = (e) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); const MAX = 640; let w = i.width; let h = i.height; if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX } } else { if (h > MAX) { w *= MAX / h; h = MAX } } c.width = w; c.height = h; const ctx = c.getContext('2d'); if (ctx) { ctx.drawImage(i, 0, 0, w, h); resolve(c.toDataURL('image/jpeg', 0.3)); } else resolve(i.src); }; i.src = e.target?.result; }; r.readAsDataURL(file); });
const getBase64 = (file) => new Promise((resolve) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve(r.result); r.onerror = () => resolve(""); });

// --- Font Size Configuration ---
const FI_FONT_SIZE_AREAS = [
  { key: 'global', label: '全体ベース', default: 100, min: 70, max: 160, desc: 'アプリ全体の基準文字サイズ' },
  { key: 'header', label: 'ヘッダー・タブ', default: 100, min: 70, max: 160, desc: '上部ナビゲーション' },
  { key: 'inspection', label: '検査実行画面', default: 100, min: 70, max: 160, desc: '検査モーダル・チェックリスト' },
  { key: 'tables', label: 'テーブル・リスト', default: 100, min: 70, max: 160, desc: '検査リスト・完了履歴・分析' },
  { key: 'settings', label: '設定画面', default: 100, min: 70, max: 160, desc: 'マスタ設定' },
];

const applyFontSizes = (fontSizes = {}) => {
  const globalScale = (fontSizes.global || 100) / 100;
  document.documentElement.style.fontSize = (16 * globalScale) + 'px';
  const styleId = 'dynamic-font-sizes';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = styleId; document.head.appendChild(styleEl); }
  const areas = ['header', 'tables', 'settings'];
  const rules = areas.map(area => {
    const scale = (fontSizes[area] || 100) / 100;
    return scale !== 1 ? `[data-fs="${area}"] { zoom: ${scale}; }` : '';
  }).filter(Boolean);
  const inspScale = (fontSizes.inspection || 100) / 100;
  if (inspScale !== 1) rules.push(`[data-fs="inspection"] { zoom: ${inspScale}; width: ${100/inspScale}vw; height: ${100/inspScale}vh; left:0; top:0; transform-origin: top left; }`);
  styleEl.textContent = rules.join('\n');
};

// 検査エリアの初期設定
const INITIAL_MAP_ZONES = [
    { id: 'zone_inspection_1', name: '検査エリア1', x: 2, y: 5, w: 22, h: 40, color: 'bg-blue-50/80 border-blue-300', isPersonal: true },
    { id: 'zone_inspection_2', name: '検査エリア2', x: 26, y: 5, w: 22, h: 40, color: 'bg-blue-50/80 border-blue-300', isPersonal: true },
    { id: 'zone_touchup', name: 'タッチアップ', x: 50, y: 5, w: 22, h: 40, color: 'bg-amber-50/80 border-amber-300', isPersonal: false },
    { id: 'zone_temp_storage', name: '一時保管', x: 74, y: 5, w: 22, h: 40, color: 'bg-slate-50/80 border-slate-300', isPersonal: false },
    { id: 'zone_shipping', name: '出荷待機', x: 2, y: 50, w: 94, h: 40, color: 'bg-emerald-50/80 border-emerald-300', isPersonal: false },
];

const ZONE_COLORS = [
    { name: '青', class: 'bg-blue-50/80 border-blue-300' },
    { name: '緑', class: 'bg-emerald-50/80 border-emerald-300' },
    { name: '黄', class: 'bg-amber-50/80 border-amber-300' },
    { name: '赤', class: 'bg-rose-50/80 border-rose-300' },
    { name: '灰', class: 'bg-slate-50/80 border-slate-300' },
];

const INSPECTION_CATEGORIES = [
    '準備',
    '外観チェック項目',
    '機能確認',
    '特注仕様確認',
    'タッチアップ確認',
    '付属品確認'
];

// --- Voice Assistant Utilities ---
let ttsUnlocked_fi = false;
const unlockTTSForIOS_fi = () => {
  if (ttsUnlocked_fi || !window.speechSynthesis) return;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) { ttsUnlocked_fi = true; return; }
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0; u.lang = 'ja-JP';
  window.speechSynthesis.speak(u);
  ttsUnlocked_fi = true;
};
let iosResumeInterval_fi = null;
const startIOSResumeFix_fi = () => {
  if (iosResumeInterval_fi) return;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return;
  iosResumeInterval_fi = setInterval(() => { if (window.speechSynthesis?.speaking) window.speechSynthesis.resume(); }, 5000);
};
const stopIOSResumeFix_fi = () => { if (iosResumeInterval_fi) { clearInterval(iosResumeInterval_fi); iosResumeInterval_fi = null; } };

const speak_fi = (text, onEnd, options = {}) => {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  startIOSResumeFix_fi();
  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP'; utterance.rate = options.rate || 1.1; utterance.volume = options.volume ?? 1.0;
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang.startsWith('ja'));
    if (jaVoice) utterance.voice = jaVoice;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = () => { onEnd?.(); };
    window.speechSynthesis.speak(utterance);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => { doSpeak(); window.speechSynthesis.onvoiceschanged = null; };
    setTimeout(() => { if (window.speechSynthesis.getVoices().length === 0) doSpeak(); }, 500);
  } else doSpeak();
};

let isSpeakingTTS_fi = false;
const speakAsync_fi = (text, options = {}) => new Promise(resolve => {
  isSpeakingTTS_fi = true;
  speak_fi(text, () => { isSpeakingTTS_fi = false; resolve(); }, options);
});

const waitForTTSEnd_fi = () => new Promise(resolve => {
  if (!isSpeakingTTS_fi) { resolve(); return; }
  const check = setInterval(() => { if (!isSpeakingTTS_fi) { clearInterval(check); setTimeout(resolve, 300); } }, 100);
  setTimeout(() => { clearInterval(check); isSpeakingTTS_fi = false; resolve(); }, 5000);
});

const listenOnce_fi = async (options = {}) => {
  await waitForTTSEnd_fi();
  return new Promise((resolve) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (options.onError) options.onError('音声認識非対応');
      resolve(null); return;
    }
    const recognition = new SR();
    recognition.lang = 'ja-JP'; recognition.continuous = false; recognition.interimResults = true;
    let resolved = false;
    const timeout = options.timeout || 10000;
    const timer = setTimeout(() => { if (!resolved) { resolved = true; try { recognition.stop(); } catch {} resolve(options.defaultValue ?? null); } }, timeout);
    recognition.onaudiostart = () => { if (options.onListening) options.onListening(); };
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) { if (!resolved) { resolved = true; clearTimeout(timer); resolve(last[0].transcript); } }
      else { if (options.onInterim) options.onInterim(last[0].transcript); }
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' && options.onError) options.onError('マイクの使用が許可されていません');
      else if (e.error === 'network' && options.onError) options.onError('音声認識サービスに接続できません');
      if (!resolved) { resolved = true; clearTimeout(timer); resolve(null); }
    };
    recognition.onend = () => { if (!resolved) { resolved = true; clearTimeout(timer); resolve(options.defaultValue ?? null); } };
    try { recognition.start(); } catch(e) { if (options.onError) options.onError('音声認識の開始に失敗'); resolve(null); }
  });
};

const normalizeVoiceText_fi = (text) => {
  if (!text) return '';
  let t = text;
  const homophones = {
    '皇帝': '工程', '号艇': '工程', '後程': '工程', '高低': '工程', '肯定': '工程', 'こうてい': '工程',
    '交代': '工程', '好転': '工程', '公定': '工程', '行程': '工程', '校庭': '工程',
    '代目': '台目', 'だいめ': '台目', '大目': '台目', '題目': '台目',
  };
  Object.entries(homophones).forEach(([k, v]) => { if (k !== v) t = t.replace(new RegExp(k, 'g'), v); });
  t = t.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  t = t.replace(/[Ａ-Ｚａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const kanjiMap = { '零': 0, '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100 };
  const hiraMap = { 'いち': '1', 'に': '2', 'さん': '3', 'し': '4', 'よん': '4', 'ご': '5', 'ろく': '6', 'なな': '7', 'しち': '7', 'はち': '8', 'きゅう': '9', 'く': '9', 'じゅう': '10' };
  Object.entries(hiraMap).sort((a,b) => b[0].length - a[0].length).forEach(([k, v]) => { t = t.replace(new RegExp(k, 'g'), v); });
  t = t.replace(/([一二三四五六七八九]?)百([一二三四五六七八九]?十?[一二三四五六七八九]?)/g, (_, h, rest) => {
    let val = (h ? kanjiMap[h] : 1) * 100;
    const tenMatch = rest.match(/([一二三四五六七八九]?)十([一二三四五六七八九]?)/);
    if (tenMatch) { val += (tenMatch[1] ? kanjiMap[tenMatch[1]] : 1) * 10; if (tenMatch[2]) val += kanjiMap[tenMatch[2]]; }
    else { for (const c of rest) { if (kanjiMap[c] !== undefined && kanjiMap[c] < 10) val += kanjiMap[c]; } }
    return String(val);
  });
  t = t.replace(/([一二三四五六七八九]?)十([一二三四五六七八九]?)/g, (_, tens, ones) => String((tens ? kanjiMap[tens] : 1) * 10 + (ones ? kanjiMap[ones] : 0)));
  t = t.replace(/[零〇一二三四五六七八九]/g, c => String(kanjiMap[c]));
  return t;
};

// Voice command matchers for final inspection
const matchOK_fi = (text) => { if (!text) return false; const t = normalizeVoiceText_fi(text); return /^(OK|オーケー|オッケー|おっけー|おーけー|オーケー|ok|はい)$/i.test(t?.trim()) || /完了|かんりょう|終わり|おわり|done/i.test(t); };
const matchNG_fi = (text) => { if (!text) return false; const t = normalizeVoiceText_fi(text); return /^(NG|エヌジー|不合格|ダメ|だめ)$/i.test(t?.trim()); };
const matchStart_fi = (text) => { if (!text) return false; const t = normalizeVoiceText_fi(text); return /開始|かいし|スタート|start/i.test(t); };
const matchNext_fi = (text) => { if (!text) return false; const t = normalizeVoiceText_fi(text); return /^(次|つぎ|next)$/i.test(t?.trim()) || /次へ|つぎへ/i.test(t); };
const matchBack_fi = (text) => { if (!text) return false; const t = normalizeVoiceText_fi(text); return /戻る|もどる|前|まえ|back/i.test(t); };
const matchSkip_fi = (text) => { if (!text) return false; const t = normalizeVoiceText_fi(text); return /スキップ|該当なし|がいとうなし|skip|パス/i.test(t); };
const matchCancel_fi = (text) => { if (!text) return false; const t = normalizeVoiceText_fi(text); return /キャンセル|取り消し|とりけし|cancel/i.test(t); };
const matchStop_fi = (text) => { if (!text) return false; const t = normalizeVoiceText_fi(text); return /中断|ちゅうだん|止め|やめ|ストップ|stop/i.test(t); };

// Parse unit-specific commands: "1番目開始", "1台目OK", "2番NG"
const parseUnitCmd_fi = (text) => {
  if (!text) return null;
  const t = normalizeVoiceText_fi(text);
  // "N番目開始", "N台目開始", "N番開始", "N番OK", "N台目OK" etc
  const m = t.match(/(\d+)\s*(?:番目?|台目?)\s*(開始|スタート|OK|オーケー|完了|NG|エヌジー)/i);
  if (m) {
    const unitNum = parseInt(m[1]);
    const action = m[2];
    let type = 'start';
    if (/OK|オーケー|完了/i.test(action)) type = 'complete';
    else if (/NG|エヌジー/i.test(action)) type = 'ng';
    else if (/開始|スタート/i.test(action)) type = 'start';
    return { unit: unitNum, type };
  }
  return null;
};

// Parse category jump: "外観に飛んで", "機能確認へ"
const parseCategoryJump_fi = (text, categories) => {
  if (!text || !categories) return null;
  const t = normalizeVoiceText_fi(text);
  for (const cat of categories) {
    const shortCat = cat.replace(/チェック項目|確認/g, '');
    if (t.includes(cat) || (shortCat.length >= 2 && t.includes(shortCat))) return cat;
  }
  return null;
};

const INITIAL_CSV_MAPPING = { orderNo: 'A', model: 'B', quantity: 'C', dueDate: 'D', entryAt: 'E', appearanceNote: 'F', hasTail: 'G', serialNoStart: 'H' };

const INITIAL_ITEM_CSV_MAPPING = { category: 'A', title: 'B', description: 'C', targetPart: 'D', targetTime: 'E', checkType: 'F', tags: 'G', specialCondition: 'H', defaultCount: 'I' };

const INITIAL_BREAK_ALERTS = [
    { id: 'break_1', time: '12:00', enabled: true, message: 'お昼休憩の時間です。作業を一時停止してください。' },
    { id: 'break_2', time: '17:00', enabled: true, message: '定時です。作業のキリが良いところで一時停止してください。' }
];

const INITIAL_COMPLAINT_OPTIONS = [
    '手順が分かりにくい',
    '治具が使いにくい / 見つからない',
    '図面が見づらい / 指示が不明確',
    '部品が取り出しにくい',
    '作業スペースが狭い',
    '時間が足りない',
    '疲労 / 休憩が必要'
];

const INITIAL_DEFECT_PROCESS_OPTIONS = ['前班', '高木班', '南班', '設計', '調達', '機械'];

const FINAL_INSPECTION_DATA = [
    { id: 'init_1', category: '準備', title: '書類準備・確認', description: '図面、仕様書、前工程のチェックシート等の必要書類を準備し、内容を確認する。', tags: ['important'], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'init_2', category: '準備', title: '計測器・治具準備', description: 'ノギス、マイクロメータ、トルクレンチ等の計測器および検査用治具を準備する。', tags: [], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'app_1', category: '外観チェック項目', title: '指図・型式・機番の確認', description: '確認方法：手配書・出荷案内・現品の照合', tags: ['important'], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'app_2', category: '外観チェック項目', title: '各種図番の確認', description: '確認方法：手配書と図番の一致', tags: [], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'app_3', category: '外観チェック項目', title: 'モータ型式の確認', description: '確認方法：手配書・外観図・パラメータ表・現品との一致 (パラメータ表#1850の数値確認含む)', tags: [], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'app_4', category: '外観チェック項目', title: '塗装色の確認', description: '確認方法：手配書・現品との一致・色見本との照合【色見本 有・無】', tags: [], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'app_5', category: '外観チェック項目', title: 'ネームプレートの確認', description: '確認方法：標準 ・ CE（○を付ける） 手配書にて確認', tags: [], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'app_6', category: '外観チェック項目', title: 'ネームプレート型式・機番', description: '確認方法：手配書・最終検査チェックシート・現品の照合', tags: ['important'], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'func_1', category: '機能確認', title: '通電確認', description: '確認方法：電源投入し、異常音・異臭・発熱なきこと', tags: ['important'], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'func_2', category: '機能確認', title: '非常停止動作', description: '確認方法：非常停止ボタン押下で即時停止すること', tags: ['important'], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'func_3', category: '機能確認', title: 'ドアインターロック動作', description: '確認方法：ドア開放時に動作しないこと', tags: ['important', 'claim'], checkType: 'individual', targetPart: 'main', targetTime: 60 },
    { id: 'sp_1', category: '特注仕様確認', title: '特注色の確認', description: '確認方法：色見本との照合（指定色であること）', tags: [], checkType: 'individual', targetPart: 'both', targetTime: 60, specialCondition: '特注色' },
    { id: 'acc_1', category: '付属品', title: '検査成績書', description: '確認方法：機番、データの一致', tags: ['important'], checkType: 'individual', targetPart: 'both', targetTime: 60 },
    { id: 'acc_2', category: '付属品', title: '付属品ボックス', description: '確認方法：ボルト、治具等の員数確認', tags: [], checkType: 'count', targetPart: 'both', targetTime: 60 },
];

const INITIAL_TEMPLATE = {
    id: 'final_inspection_std',
    name: '最終検査 標準シート',
    steps: FINAL_INSPECTION_DATA
};

// --- Printable Report Helpers ---
function buildRowItems(stepsByCategory) {
    const items = [];
    for (const [category, steps] of Object.entries(stepsByCategory)) {
        items.push({ type: "cat", category });
        for (const step of steps) {
            items.push({ type: "step", step });
        }
    }
    return items;
}

// --- Printable Report Component ---
const PrintableReport = ({
    lot,
    mainWorker,
    touchupWorker,
    defects,
    stepsByCategory,
    displayQuantity,
    toDateTimeJp,
    reportNo,
    includeAiImage,
    includePackagingPhotos
}) => {
    const rowItems = useMemo(() => buildRowItems(stepsByCategory), [stepsByCategory]);

    // AI解析データを持つタスクのみを抽出
    const aiAnalysisResults = useMemo(() => {
        if (!lot.tasks || !includeAiImage) return [];
        return Object.entries(lot.tasks)
            .filter(([_, task]) => task.aiAnalysis && task.aiAnalysis.imageUrl)
            .map(([taskId, task]) => {
                const parts = taskId.split('-');
                const stepId = parts[0];
                const unitIdxStr = parts[1];
                const step = lot.steps?.find(s => s.id === stepId) || { title: '不明な工程' };
                const unitDisplay = unitIdxStr !== 'undefined' ? `(機番#${parseInt(unitIdxStr) + 1})` : '';
                return {
                    title: `${step.title} ${unitDisplay}`,
                    ai: task.aiAnalysis
                };
            });
    }, [lot.tasks, lot.steps, includeAiImage]);

    const pages = useMemo(() => {
        const newPages = [];
        let currentPageItems = [];
        let currentHeight = 0;

        const PAGE1_MAX = 35;
        const PAGE_OTHER_MAX = 46;
        let currentMax = PAGE1_MAX;

        rowItems.forEach(item => {
            let pt = 1;
            if (item.type === 'cat') {
                pt = 1.0;
            } else if (item.type === 'step') {
                const desc = item.step.description || '';
                const linesByLength = Math.ceil(desc.length / 35);
                const linesByBreak = desc.split('\n').length;
                const lines = Math.max(1, linesByLength, linesByBreak);
                pt = Math.max(1.2, lines * 0.7 + 0.3);
            }

            if (currentHeight + pt > currentMax && currentPageItems.length > 0) {
                newPages.push(currentPageItems);
                currentPageItems = [item];
                currentHeight = pt;
                currentMax = PAGE_OTHER_MAX;
            } else {
                currentPageItems.push(item);
                currentHeight += pt;
            }
        });

        if (currentPageItems.length > 0) {
            newPages.push(currentPageItems);
        }

        return newPages.length > 0 ? newPages : [[]];
    }, [rowItems]);

    const renderTableBlock = (items) => (
        <table className="w-full border-collapse border border-black text-[10px] table-fixed">
            <thead>
                <tr className="bg-gray-100">
                    <th className="border border-black p-1 whitespace-nowrap text-[8px]">検査項目</th>
                    <th className="border border-black p-1 whitespace-nowrap text-[8px]">確認方法</th>
                    {Array.from({ length: displayQuantity }).map((_, i) => (
                        <th key={`num-${i}`} className="border border-black p-1 w-5 text-[8px]">{i + 1}</th>
                    ))}
                </tr>
            </thead>

            <tbody>
                {items.map((it, idx) => {
                    if (it.type === "cat") {
                        return (
                            <tr key={`cat-${idx}`} className="bg-gray-200 print-break-inside-avoid">
                                <td colSpan={2 + displayQuantity} className="border border-black p-1 font-bold text-left pl-2 text-[9px]">
                                    {it.category}
                                </td>
                            </tr>
                        );
                    }

                    const step = it.step;
                    return (
                        <tr key={`step-${step.id}`} className="print-break-inside-avoid">
                            <td className="border border-black p-1 align-middle whitespace-nowrap text-[8px]">
                                <div className="flex items-center gap-1">
                                    <span className="font-bold">{step.title}</span>
                                    {step.targetPart !== 'both' && (
                                        <span className="text-[7px] border border-gray-500 rounded px-1 bg-white shrink-0">
                                            {step.targetPart === 'main' ? '本体' : 'テール'}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="border border-black p-1 text-gray-600 align-middle whitespace-nowrap text-[8px]">
                                {step.description}
                            </td>

                            {Array.from({ length: displayQuantity }).map((_, i) => {
                                const stepIndex = lot.steps.findIndex(s => s.id === step.id);
                                const task = lot.tasks?.[`${step.id}-${i}`] || lot.tasks?.[`${stepIndex}-${i}`];
                                let mark = '';
                                if (i < lot.quantity) {
                                    if (task?.status === 'completed') mark = '✓';
                                    else if (task?.status === 'skipped') mark = '－';
                                }
                                return (
                                    <td
                                        key={i}
                                        className={`border border-black p-1 text-center align-middle ${i >= lot.quantity ? "bg-slate-100" : ""}`}
                                    >
                                        <span className="text-[8px] font-bold">{mark}</span>
                                    </td>
                                );
                            })}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    const renderHeaderAndInfo = () => (
        <>
            <div className="flex justify-between items-start mb-2 border-b-2 border-black pb-2 info-area">
                <div>
                    <div className="text-xs font-bold text-gray-500 mb-1 whitespace-nowrap">最終検査・タッチアップ後</div>
                    <div className="text-xl font-serif font-bold whitespace-nowrap">
                        最終検査チェックシート {lot.hasTail ? "(オプション)" : ""}
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-[10px] border border-black p-1 min-w-[100px] whitespace-nowrap flex flex-col justify-center">
                        <div>開始: {toDateTimeJp(lot.workStartTime)}</div>
                        <div>終了: {toDateTimeJp(lot.completedAt)}</div>
                    </div>

                    <div className="flex border border-black text-center text-xs h-14 items-stretch divide-x divide-black stamp-container">
                        <div className="w-12 h-full flex flex-col stamp-box">
                            <div className="bg-gray-100 border-b border-black px-1 py-0.5 text-[10px]">承認</div>
                            <div className="flex-1 flex items-center justify-center"></div>
                        </div>
                        <div className="w-12 h-full flex flex-col stamp-box">
                            <div className="bg-gray-100 border-b border-black px-1 py-0.5 text-[10px]">職長</div>
                            <div className="flex-1 flex items-center justify-center"></div>
                        </div>
                        <div className="w-12 h-full flex flex-col stamp-box">
                            <div className="bg-gray-100 border-b border-black px-1 py-0.5 text-[10px]">担当</div>
                            <div className="flex-1 flex items-center justify-center font-bold break-all p-1 text-[9px] leading-tight">
                                {mainWorker}
                            </div>
                        </div>
                        <div className="w-12 h-full flex flex-col stamp-box">
                            <div className="bg-gray-100 border-b border-black px-1 py-0.5 text-[10px] whitespace-nowrap overflow-hidden">ﾀｯﾁｱｯﾌﾟ</div>
                            <div className="flex-1 flex items-center justify-center font-bold break-all p-1 text-[9px] leading-tight">
                                {touchupWorker}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex border border-black mb-2 info-area">
                <div className="w-[25%] border-r border-black p-2 space-y-1 text-xs">
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-12 bg-gray-100 text-center mr-1 shrink-0 text-[10px]">指図</span>
                        <span className="font-bold text-sm break-words">{lot.orderNo}</span>
                    </div>
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-12 bg-gray-100 text-center mr-1 shrink-0 text-[10px]">型式</span>
                        <span className="break-words font-bold text-xs">{lot.model}</span>
                    </div>
                    <div className="flex border-b border-gray-300 pb-1">
                        <span className="font-bold w-12 bg-gray-100 text-center mr-1 shrink-0 text-[10px]">テール</span>
                        <span className="break-words text-[10px]">{lot.hasTail ? 'あり' : '-'}</span>
                    </div>
                    <div className="flex">
                        <span className="font-bold w-12 bg-gray-100 text-center mr-1 shrink-0 text-[10px]">台数</span>
                        <span className="text-[10px]">{lot.quantity} 台</span>
                    </div>
                </div>

                <div className="w-[45%] border-r border-black p-2">
                    <div className="font-bold border-b border-black mb-2 text-center bg-gray-100 text-sm">機番</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs font-bold">
                        {Array.from({ length: Math.max(lot.quantity, 1) }).map((_, i) => (
                            <div key={i} className="flex border-b border-gray-300 items-center">
                                <span className="w-6 text-center border-r border-gray-300 bg-gray-50 shrink-0 text-[10px] font-normal text-gray-500">
                                    {i + 1}
                                </span>
                                <span className="pl-1 break-all">{lot.unitSerialNumbers?.[i] || ""}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-[30%] p-2">
                    <div className="font-bold border-b border-black mb-2 text-center bg-gray-100 text-xs">備考欄</div>
                    <div className="text-[10px]">
                        {defects && (
                            <div className="mb-2">
                                <span className="font-bold text-red-600">【不具合事項】</span>
                                <div className="whitespace-pre-wrap ml-1 border border-red-200 p-1 bg-red-50">{defects}</div>
                            </div>
                        )}
                        <div>
                            <span className="font-bold">【記事】</span>
                            <div className="whitespace-pre-wrap ml-1">{lot.appearanceNote}</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="print-pages" id="printable-report-wrapper">
            <div className="print-scale" style={{ ["--print-scale"]: 1 }}>
                {pages.map((pageItems, index) => (
                    <div key={index} className="print-page">
                        <div className="print-page-no">No. {index + 1}/{pages.length}</div>
                        <div className="flex flex-col h-full">
                            {index === 0 && renderHeaderAndInfo()}
                            <div className="flex-1 overflow-hidden">
                                {renderTableBlock(pageItems)}
                                {index === pages.length - 1 && (
                                    <div className="mt-4 border-t-2 border-black pt-2 flex justify-between text-xs print-break-inside-avoid">
                                        <div>判定: <span className="text-xl font-bold ml-2">合格</span></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="print-report-no">帳票番号：{reportNo}</div>
                    </div>
                ))}

                {/* AI解析結果の出力用ページ */}
                {includeAiImage && aiAnalysisResults.length > 0 && (
                    <div className="print-page">
                        <div className="print-page-no">参考添付 AI画像解析エビデンス</div>
                        <h3 className="text-lg font-bold border-b border-black mb-4 pb-2">【添付】 AI画像解析結果</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {aiAnalysisResults.map((res, i) => (
                                <div key={i} className="border border-gray-400 p-2 break-inside-avoid shadow-sm rounded">
                                    <div className="font-bold text-xs bg-gray-100 p-1 mb-2 border-b border-gray-300">
                                        対象工程: {res.title}
                                    </div>
                                    <div className="relative border rounded overflow-hidden bg-slate-50 flex items-center justify-center p-1 min-h-[150px]">
                                        <div className="relative inline-block">
                                            <img src={res.ai.imageUrl} alt="AI Result" className="max-w-full max-h-[150px] object-contain block" />

                                            {/* 型式のバウンディングボックス */}
                                            {res.ai.modelBox && res.ai.modelBox.length === 4 && (
                                                <div
                                                    className="absolute border-2 border-blue-500 bg-blue-500/10 box-border pointer-events-none"
                                                    style={{
                                                        top: `${res.ai.modelBox[0] / 10}%`,
                                                        left: `${res.ai.modelBox[1] / 10}%`,
                                                        height: `${(res.ai.modelBox[2] - res.ai.modelBox[0]) / 10}%`,
                                                        width: `${(res.ai.modelBox[3] - res.ai.modelBox[1]) / 10}%`
                                                    }}
                                                >
                                                    <span className="absolute -top-5 left-[-2px] bg-blue-500 text-white text-[8px] font-bold px-1 rounded-t whitespace-nowrap">
                                                        型式
                                                    </span>
                                                </div>
                                            )}

                                            {/* 機番のバウンディングボックス */}
                                            {res.ai.serialBox && res.ai.serialBox.length === 4 && (
                                                <div
                                                    className="absolute border-2 border-amber-500 bg-amber-500/10 box-border pointer-events-none"
                                                    style={{
                                                        top: `${res.ai.serialBox[0] / 10}%`,
                                                        left: `${res.ai.serialBox[1] / 10}%`,
                                                        height: `${(res.ai.serialBox[2] - res.ai.serialBox[0]) / 10}%`,
                                                        width: `${(res.ai.serialBox[3] - res.ai.serialBox[1]) / 10}%`
                                                    }}
                                                >
                                                    <span className="absolute -top-5 left-[-2px] bg-amber-500 text-white text-[8px] font-bold px-1 rounded-t whitespace-nowrap">
                                                        機番
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[10px]">
                                        <div className="font-bold border-b border-gray-300 pb-1 mb-1 flex items-center gap-1">
                                            判定結果: {res.ai.match ?
                                                <span className="text-emerald-600 font-bold">【OK】型式・機番の一致を確認</span> :
                                                <span className="text-rose-600 font-bold">【NG】目視での確認要</span>
                                            }
                                        </div>
                                        <div className="text-gray-600 whitespace-pre-wrap leading-tight mt-1">{res.ai.reason}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 荷姿写真の出力用ページ */}
                {includePackagingPhotos && lot.packagingPhotos && Object.keys(lot.packagingPhotos).length > 0 && (
                    <div className="print-page">
                        <div className="print-page-no">参考添付 荷姿エビデンス</div>
                        <h3 className="text-lg font-bold border-b border-black mb-4 pb-2">【添付】 荷姿・付属品写真</h3>
                        <div className="grid grid-cols-2 gap-6">
                            {Object.entries(lot.packagingPhotos).map(([topic, photosData], i) => {
                                // 互換性のため文字列の場合は配列にする
                                const photoArray = Array.isArray(photosData) ? photosData : [photosData];
                                return photoArray.map((base64, idx) => (
                                    <div key={`${i}-${idx}`} className="border-2 border-slate-300 p-3 break-inside-avoid shadow-sm rounded-xl bg-white">
                                        <div className="font-bold text-sm bg-slate-100 p-2 mb-3 border-b-2 border-slate-300 flex items-center gap-2">
                                            <Camera className="w-4 h-4 text-slate-500" />
                                            {topic} {photoArray.length > 1 ? `(${idx + 1}/${photoArray.length})` : ''}
                                        </div>
                                        <div className="rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center p-2 h-[250px]">
                                            <img src={base64} alt={`${topic}-${idx}`} className="max-w-full max-h-[250px] object-contain block drop-shadow-md" />
                                        </div>
                                    </div>
                                ));
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub Components ---

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = '実行', confirmColor = 'bg-blue-600' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-600 mb-6 whitespace-pre-wrap">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold">キャンセル</button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-white rounded-lg font-bold shadow ${confirmColor} hover:opacity-90`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const LotCard = ({ lot, workers, mapZones, onOpenExecution, onEdit, onDelete, showActions = true, compact = false }) => {
    const zoneName = mapZones?.find(z => z.id === lot.mapZoneId)?.name || '';
    const isPaused = Object.values(lot.tasks || {}).some(t => t.status === 'paused');

    const today = new Date().toISOString().split('T')[0];
    const isOverdue = lot.dueDate && lot.dueDate < today;
    const isDueSoon = lot.dueDate === today;

    let borderStyle = 'border-slate-300';
    let ringStyle = '';

    if (lot.status === 'processing') {
        borderStyle = isPaused ? 'border-amber-400' : 'border-blue-500';
        ringStyle = isPaused ? 'ring-2 ring-amber-100' : 'ring-2 ring-blue-100';
    } else if (isOverdue) {
        borderStyle = 'border-rose-500';
        ringStyle = 'ring-2 ring-rose-100';
    } else if (isDueSoon) {
        borderStyle = 'border-amber-400';
        ringStyle = 'ring-2 ring-amber-100';
    }

    return (
        <div
            draggable={lot.status !== 'completed'}
            onDragStart={(e) => { e.dataTransfer.setData('lotId', lot.id); e.stopPropagation(); }}
            onClick={() => lot.status !== 'completed' && onOpenExecution(lot)}
            className={`relative w-full cursor-grab active:cursor-grabbing ${compact ? 'mb-1.5 p-2' : 'mb-3 p-3'} shadow-sm bg-white border rounded-lg hover:shadow-md transition-all group ${borderStyle} ${ringStyle} h-auto`}
        >
            <div className={`flex justify-between items-start gap-1.5 ${compact ? 'mb-1' : 'mb-2'}`}>
                <div className="flex-1 min-w-0">
                    <div className={`font-bold text-slate-800 flex items-center gap-1.5 flex-wrap ${compact ? 'mb-1' : 'mb-1.5'}`}>
                        <span className={`${compact ? 'text-sm' : 'text-base'} truncate`}>{lot.orderNo}</span>
                        <span className={`font-normal bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-full ${compact ? 'text-[0.5625rem]' : 'text-xs'}`}>{lot.model}</span>
                        {lot.priority === 'high' && <span className="bg-rose-100 text-rose-600 border border-rose-200 text-[0.5625rem] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse whitespace-nowrap"><AlertTriangle className="w-2.5 h-2.5" />急ぎ</span>}
                        {lot.hasTail && <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[0.5625rem] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap"><Component className="w-2.5 h-2.5" />テール有</span>}
                        {lot.specialConditions && lot.specialConditions.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                                {lot.specialConditions.map(sc => (
                                    <span key={sc} className="bg-amber-100 text-amber-700 border border-amber-200 text-[0.5625rem] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap"><Sparkles className="w-2.5 h-2.5" />{sc}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="text-[0.625rem] text-slate-500 flex flex-wrap gap-1.5">
                        <span className="bg-slate-50 border px-1.5 py-0.5 rounded whitespace-nowrap">{lot.quantity}台</span>
                        <span className="bg-slate-50 border px-1.5 py-0.5 rounded whitespace-nowrap">
                            {compact ? toTimeShort(getSafeTime(lot.entryAt)) : `${toDateShort(getSafeTime(lot.entryAt))} ${toTimeShort(getSafeTime(lot.entryAt))} 入荷`}
                        </span>
                        {!compact && lot.dueDate && (
                            <span className={`${isOverdue ? 'bg-rose-100 text-rose-700 border-rose-200 font-bold animate-pulse' : isDueSoon ? 'bg-amber-100 text-amber-700 border-amber-200 font-bold' : 'bg-blue-50 text-blue-600'} px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-1`}>
                                {isOverdue && <AlertCircle className="w-3 h-3" />}
                                {isDueSoon && <Clock className="w-3 h-3" />}
                                納期: {lot.dueDate}
                            </span>
                        )}
                        {!compact && lot.appearanceNote && <span className="text-slate-600 font-bold flex items-center gap-0.5 border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 truncate max-w-full"><FileText className="w-3 h-3 shrink-0" /> <span className="truncate">{lot.appearanceNote}</span></span>}
                    </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`font-bold rounded-full whitespace-nowrap ${compact ? 'text-[0.5625rem] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'} ${lot.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : lot.status === 'processing' ? (isPaused ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700') : 'bg-slate-100 text-slate-500'}`}>
                        {lot.status === 'completed' ? '完了' : lot.status === 'processing' ? (isPaused ? '⏸ 一時停止' : '作業中') : '待機'}
                    </span>
                    {showActions && !compact && (
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(lot); }} className="p-1.5 bg-white border rounded hover:bg-blue-50 text-slate-500 shadow-sm transition-colors" title="編集"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(lot.id); }} className="p-1.5 bg-white border rounded hover:bg-rose-50 text-rose-400 shadow-sm transition-colors" title="削除"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    )}
                </div>
            </div>

            {!compact && (lot.workerId || lot.mapZoneId) && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 truncate min-w-0">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                            {mapZones.find(z => z.id === lot.mapZoneId)?.isPersonal
                                ? mapZones.find(z => z.id === lot.mapZoneId)?.name
                                : (workers.find(w => w.id === lot.workerId)?.name || '未割当')
                            }
                        </span>
                    </div>
                    {zoneName && <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full text-blue-600 font-bold text-[0.625rem] shrink-0 ml-2"><MapPin className="w-3 h-3" /> {zoneName}</div>}
                </div>
            )}
        </div>
    );
};

// --- Photo Manager Modal (一括ダウンロード・削除) ---
const PhotoManagerModal = ({ lots, completedLots, onClose, onSave }) => {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [expandedId, setExpandedId] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // 画像を持つロットだけフィルタ
    const allLots = useMemo(() => [...(lots || []), ...(completedLots || [])], [lots, completedLots]);

    const getPhotoStats = (lot) => {
        let packagingCount = 0;
        let aiCount = 0;
        if (lot.packagingPhotos) {
            Object.values(lot.packagingPhotos).forEach(arr => {
                const photos = Array.isArray(arr) ? arr : [arr];
                packagingCount += photos.filter(p => p && p.startsWith('data:')).length;
            });
        }
        if (lot.tasks) {
            Object.values(lot.tasks).forEach(task => {
                if (task?.aiAnalysis?.imageUrl) aiCount++;
            });
        }
        return { packagingCount, aiCount, total: packagingCount + aiCount };
    };

    const lotsWithPhotos = useMemo(() =>
        allLots.filter(l => getPhotoStats(l).total > 0).sort((a, b) => (b.entryAt || 0) - (a.entryAt || 0)),
    [allLots]);

    const selectedStats = useMemo(() => {
        let packaging = 0, ai = 0;
        lotsWithPhotos.filter(l => selectedIds.has(l.id)).forEach(l => {
            const s = getPhotoStats(l);
            packaging += s.packagingCount;
            ai += s.aiCount;
        });
        return { packaging, ai, total: packaging + ai };
    }, [selectedIds, lotsWithPhotos]);

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    const toggleAll = () => {
        if (selectedIds.size === lotsWithPhotos.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(lotsWithPhotos.map(l => l.id)));
    };

    const sanitize = (str) => (str || '').replace(/[\\/:*?"<>|]/g, '_');

    const handleDownload = async () => {
        if (selectedIds.size === 0) return;
        setIsDownloading(true);
        try {
            const zip = new JSZip();
            const now = new Date();
            const rootName = `photos_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

            for (const lot of lotsWithPhotos.filter(l => selectedIds.has(l.id))) {
                const folderName = sanitize(`${lot.orderNo}_${lot.model}`);
                const folder = zip.folder(`${rootName}/${folderName}`);

                // 荷姿写真
                if (lot.packagingPhotos) {
                    Object.entries(lot.packagingPhotos).forEach(([topic, photos]) => {
                        const arr = Array.isArray(photos) ? photos : [photos];
                        arr.forEach((base64, idx) => {
                            if (base64 && base64.startsWith('data:')) {
                                const fileName = sanitize(`${lot.orderNo}_${lot.model}_荷姿_${topic}_${idx + 1}`) + '.jpg';
                                folder.file(fileName, base64ToUint8Array(base64));
                            }
                        });
                    });
                }

                // AI認識画像
                if (lot.tasks && lot.steps) {
                    Object.entries(lot.tasks).forEach(([key, task]) => {
                        if (task?.aiAnalysis?.imageUrl) {
                            const parts = key.split('-');
                            const unitIdx = parts.pop();
                            const stepId = parts.join('-');
                            const step = lot.steps.find(s => s.id === stepId);
                            const stepName = step ? step.title : stepId;
                            const serial = lot.unitSerialNumbers?.[Number(unitIdx)] || `#${Number(unitIdx) + 1}`;
                            const fileName = sanitize(`${lot.orderNo}_${lot.model}_AI認識_${stepName}_${serial}`) + '.jpg';
                            folder.file(fileName, base64ToUint8Array(task.aiAnalysis.imageUrl));
                        }
                    });
                }
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${rootName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            console.error('ZIP生成エラー', e);
            alert('ダウンロード中にエラーが発生しました。');
        }
        setIsDownloading(false);
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            for (const lot of lotsWithPhotos.filter(l => selectedIds.has(l.id))) {
                const update = {};
                if (lot.packagingPhotos && Object.keys(lot.packagingPhotos).length > 0) {
                    update.packagingPhotos = {};
                }
                if (lot.tasks) {
                    const newTasks = { ...lot.tasks };
                    let changed = false;
                    Object.entries(newTasks).forEach(([key, task]) => {
                        if (task?.aiAnalysis?.imageUrl) {
                            const { imageUrl, ...rest } = task.aiAnalysis;
                            newTasks[key] = { ...task, aiAnalysis: Object.keys(rest).length > 0 ? rest : null };
                            changed = true;
                        }
                    });
                    if (changed) update.tasks = newTasks;
                }
                if (Object.keys(update).length > 0) {
                    await onSave(lot.id, update);
                }
            }
            setSelectedIds(new Set());
            setDeleteConfirm(false);
        } catch (e) {
            console.error('削除エラー', e);
            alert('削除中にエラーが発生しました。');
        }
        setIsDeleting(false);
    };

    const getPreviewImages = (lot) => {
        const images = [];
        if (lot.packagingPhotos) {
            Object.entries(lot.packagingPhotos).forEach(([topic, photos]) => {
                const arr = Array.isArray(photos) ? photos : [photos];
                arr.forEach((base64, idx) => {
                    if (base64 && base64.startsWith('data:'))
                        images.push({ type: '荷姿', label: `${topic} (${idx + 1})`, src: base64 });
                });
            });
        }
        if (lot.tasks && lot.steps) {
            Object.entries(lot.tasks).forEach(([key, task]) => {
                if (task?.aiAnalysis?.imageUrl) {
                    const parts = key.split('-');
                    const unitIdx = parts.pop();
                    const stepId = parts.join('-');
                    const step = lot.steps.find(s => s.id === stepId);
                    const serial = lot.unitSerialNumbers?.[Number(unitIdx)] || `#${Number(unitIdx) + 1}`;
                    images.push({ type: 'AI認識', label: `${step?.title || stepId} (${serial})`, src: task.aiAnalysis.imageUrl });
                }
            });
        }
        return images;
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                    <h2 className="font-bold text-lg flex items-center gap-2"><ImageDown className="w-5 h-5 text-blue-600" /> 画像データの管理</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                </div>

                {/* Toolbar */}
                <div className="p-3 border-b bg-blue-50 flex flex-wrap items-center gap-3 shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedIds.size === lotsWithPhotos.length && lotsWithPhotos.length > 0}
                            onChange={toggleAll} className="w-4 h-4 accent-blue-600" />
                        <span className="text-sm font-bold">全選択</span>
                    </label>
                    <span className="text-sm text-slate-600">
                        選択中: {selectedIds.size}件
                        {selectedIds.size > 0 && ` (荷姿${selectedStats.packaging}枚 + AI${selectedStats.ai}枚 = 計${selectedStats.total}枚)`}
                    </span>
                    <div className="ml-auto flex gap-2">
                        <button onClick={handleDownload} disabled={selectedIds.size === 0 || isDownloading}
                            className="px-4 py-2 bg-blue-600 disabled:bg-slate-300 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow hover:bg-blue-700">
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderDown className="w-4 h-4" />}
                            一括ダウンロード
                        </button>
                        <button onClick={() => setDeleteConfirm(true)} disabled={selectedIds.size === 0 || isDeleting}
                            className="px-4 py-2 bg-rose-600 disabled:bg-slate-300 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow hover:bg-rose-700">
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            一括削除
                        </button>
                    </div>
                </div>

                {/* Lot List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {lotsWithPhotos.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">画像データのあるロットがありません</div>
                    ) : lotsWithPhotos.map(lot => {
                        const stats = getPhotoStats(lot);
                        const isExpanded = expandedId === lot.id;
                        const previews = isExpanded ? getPreviewImages(lot) : [];
                        return (
                            <div key={lot.id} className="border rounded-lg overflow-hidden">
                                <div className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : lot.id)}>
                                    <input type="checkbox" checked={selectedIds.has(lot.id)}
                                        onChange={(e) => { e.stopPropagation(); toggleSelect(lot.id); }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 accent-blue-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold">{lot.orderNo}</span>
                                            <span className="text-slate-500">{lot.model}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${lot.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {lot.status === 'completed' ? '完了' : lot.status === 'processing' ? '作業中' : '待機'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            荷姿: {stats.packagingCount}枚 / AI認識: {stats.aiCount}枚
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </div>
                                {isExpanded && previews.length > 0 && (
                                    <div className="p-3 bg-slate-50 border-t grid grid-cols-4 sm:grid-cols-6 gap-2">
                                        {previews.map((img, i) => (
                                            <div key={i} className="relative group">
                                                <img src={img.src} alt={img.label} className="w-full aspect-square object-cover rounded border" />
                                                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] p-1 rounded-b leading-tight">
                                                    <div className={`font-bold ${img.type === 'AI認識' ? 'text-cyan-300' : 'text-amber-300'}`}>{img.type}</div>
                                                    <div className="truncate">{img.label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm && (
                    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="font-bold text-lg text-rose-600 flex items-center gap-2 mb-3"><AlertTriangle /> 画像の一括削除</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                選択した <strong>{selectedIds.size}件</strong> のロットから画像データを削除します。<br />
                                (荷姿 {selectedStats.packaging}枚 + AI認識 {selectedStats.ai}枚 = 計{selectedStats.total}枚)<br /><br />
                                <span className="text-rose-600 font-bold">この操作は取り消せません。先にダウンロードすることをお勧めします。</span>
                            </p>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border rounded font-bold text-slate-600 hover:bg-slate-50">キャンセル</button>
                                <button onClick={handleDelete} disabled={isDeleting}
                                    className="px-6 py-2 bg-rose-600 text-white rounded font-bold shadow hover:bg-rose-700 flex items-center gap-2">
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    削除する
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Packaging Photo Modal ---
const PackagingPhotoModal = ({ lot, topics, onClose, onSave }) => {
    // lot.packagingPhotos: { [topic]: string[] } 複数枚対応
    const [photos, setPhotos] = useState(() => {
        const initial = { ...lot.packagingPhotos };
        // 移行互換性: 古い単一文字列データがあれば配列に変換
        Object.keys(initial).forEach(k => {
            if (typeof initial[k] === 'string') {
                initial[k] = [initial[k]];
            }
        });
        return initial;
    });

    const fileInputRefs = useRef({});

    // 設定からトピック名と指定枚数をパースする
    const parsedTopics = useMemo(() => {
        return topics.map(t => {
            const parts = t.split(',');
            const name = parts[0].trim();
            let count = 1; // デフォルトは1枚
            if (parts.length > 1) {
                const countSetting = parts[1].trim().toUpperCase();
                count = countSetting === 'ALL' ? lot.quantity : (parseInt(countSetting, 10) || 1);
            }
            return { name, count, original: t };
        });
    }, [topics, lot.quantity]);

    const handlePhotoCapture = async (topicName, event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const resizedBase64 = await resizeImage(file);
            setPhotos(prev => {
                const currentList = prev[topicName] || [];
                return { ...prev, [topicName]: [...currentList, resizedBase64] };
            });
        } catch (e) {
            console.error("写真読み込みエラー", e);
            alert("画像の処理に失敗しました。");
        }
    };

    const handleDeletePhoto = (topicName, index) => {
        setPhotos(prev => {
            const currentList = [...(prev[topicName] || [])];
            currentList.splice(index, 1);
            if (currentList.length === 0) {
                const newP = { ...prev };
                delete newP[topicName];
                return newP;
            }
            return { ...prev, [topicName]: currentList };
        });
    };

    const handleSave = () => {
        onSave({ packagingPhotos: photos });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 shrink-0 border-b pb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><ImageIcon className="w-6 h-6 text-indigo-600" /> 荷姿写真撮影 ({lot.orderNo})</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4">
                    {parsedTopics.map(pt => {
                        const currentPhotos = photos[pt.name] || [];
                        const isDone = currentPhotos.length >= pt.count;

                        return (
                            <div key={pt.name} className="flex flex-col gap-3 bg-slate-50 border border-slate-200 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                        {pt.name}
                                        <span className="text-sm font-normal text-slate-500 bg-white px-2 py-0.5 rounded border">
                                            ({currentPhotos.length} / {pt.count}枚)
                                        </span>
                                    </h3>
                                    {isDone && <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold flex items-center gap-1"><Check className="w-3 h-3" /> 完了</span>}
                                </div>

                                <div className="flex flex-wrap gap-4 items-center">
                                    {currentPhotos.map((p, idx) => (
                                        <div key={idx} className="relative group rounded-lg overflow-hidden border-2 border-indigo-200 w-32 h-24 shrink-0 bg-white shadow-sm flex items-center justify-center hover:border-indigo-400 transition-colors">
                                            <img src={p} alt={`${pt.name}-${idx}`} className="max-w-full max-h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => handleDeletePhoto(pt.name, idx)} className="bg-red-500 text-white p-2 rounded-full shadow hover:bg-red-600 transform hover:scale-110 transition-transform"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <div className="absolute top-1 text-[10px] left-1 bg-black/50 text-white px-1.5 rounded-sm">{idx + 1}</div>
                                        </div>
                                    ))}

                                    {!isDone && (
                                        <button onClick={() => fileInputRefs.current[pt.name]?.click()} className="w-32 h-24 shrink-0 border-2 border-dashed border-indigo-300 rounded-lg bg-indigo-50/50 hover:bg-indigo-100 text-indigo-600 flex flex-col items-center justify-center gap-1 transition-all hover:border-indigo-500">
                                            <Camera className="w-6 h-6 opacity-70" />
                                            <span className="font-bold text-[10px]">追加撮影</span>
                                        </button>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        ref={el => fileInputRefs.current[pt.name] = el}
                                        onChange={(e) => { handlePhotoCapture(pt.name, e); e.target.value = null; }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-4 shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 text-slate-500 hover:bg-slate-100 rounded-lg font-bold transition-colors">キャンセル</button>
                    <button onClick={handleSave} className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all flex items-center gap-2"><Save className="w-5 h-5" /> 荷姿写真を保存して閉じる</button>
                </div>
            </div>
        </div>
    );
};

const ReportModal = ({ lot, onClose }) => {
    const [customReportNo, setCustomReportNo] = useState(lot.orderNo);

    const mainWorker = useMemo(() => {
        if (!lot || !lot.tasks) return '';
        const counts = {};
        Object.values(lot.tasks).forEach(t => {
            if (t.workerName) counts[t.workerName] = (counts[t.workerName] || 0) + 1;
        });
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '');
    }, [lot]);

    const touchupWorker = useMemo(() => {
        if (!lot || !lot.tasks) return '';
        const counts = {};

        const touchupStepIds = lot.steps.filter(s => s.category.includes('タッチアップ')).map(s => s.id);
        const touchupStepIndices = lot.steps.map((s, i) => s.category.includes('タッチアップ') ? i : -1).filter(i => i !== -1);

        if (touchupStepIds.length === 0 && touchupStepIndices.length === 0) return '';

        Object.keys(lot.tasks).forEach(key => {
            const parts = key.split('-');
            const unitIdxStr = parts.pop();
            const stepIdOrIdx = parts.join('-');

            const isTouchup = touchupStepIds.includes(stepIdOrIdx) || touchupStepIndices.includes(parseInt(stepIdOrIdx));

            if (isTouchup) {
                const t = lot.tasks[key];
                if (t.workerName) counts[t.workerName] = (counts[t.workerName] || 0) + 1;
            }
        });

        if (Object.keys(counts).length === 0) return '';
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '');
    }, [lot]);

    const stepsByCategory = useMemo(() => {
        const groups = {};
        lot.steps.forEach(step => {
            if (step.category === '準備') return;
            if (!groups[step.category]) groups[step.category] = [];
            groups[step.category].push(step);
        });
        return groups;
    }, [lot]);

    const displayQuantity = Math.max(10, lot.quantity);

    const defects = useMemo(() => {
        if (!lot.interruptions || lot.interruptions.length === 0) return null;
        return lot.interruptions
            .filter(i => i.type === 'defect')
            .map(i => {
                let line = `・${i.label} (担当: ${i.workerName})`;
                if (i.causeProcess) line += ` [原因: ${i.causeProcess}]`;
                if (i.photos && i.photos.length > 0) line += ` 📷${i.photos.length}枚`;
                return line;
            })
            .join('\n');
    }, [lot]);

    const PRINT_STYLES = `
        .print-pages { width: 210mm; margin: 0 auto; background: white; }
        .print-scale { transform-origin: top center; transform: scale(var(--print-scale, 1)); width: calc(210mm / var(--print-scale, 1)); margin: 0 auto; }
        .print-page { position: relative; width: 210mm; height: 297mm; padding: 15mm 5mm 15mm 5mm; margin-bottom: 20px; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); overflow: hidden; color: #000; }
        .print-page-no { position: absolute; right: 5mm; top: 5mm; font-size: 10px; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .print-report-no { position: absolute; right: 5mm; bottom: 5mm; font-size: 10px; white-space: nowrap; }
        .print-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        .stamp-container { height: 20mm !important; }
        .stamp-box { height: 100% !important; }
        @media print {
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; background: white; width: 100%; }
            .print-pages { margin: 0 auto; width: 100%; max-width: 210mm; }
            .print-page { box-shadow: none; margin-bottom: 0; page-break-after: always; break-after: page; margin-left: auto; margin-right: auto; }
            .print-page:last-child { page-break-after: auto; break-after: auto; }
            .screen-only, .no-print { display: none !important; }
        }
    `;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("ポップアップがブロックされました。ブラウザの設定で許可してください。");
            return;
        }
        const content = document.getElementById('printable-report-wrapper');
        if (!content) { printWindow.close(); return; }

        const documentTitle = `${lot.orderNo || '不明'}_${lot.model || '不明'}`;

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${documentTitle}</title><script src="https://cdn.tailwindcss.com"></script><style>${PRINT_STYLES} body { font-family: sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .border, .border-b, .border-t, .border-l, .border-r, .divide-x > * + * { border-color: black !important; } .screen-only { padding: 20px; background: #f0f9ff; border-bottom: 1px solid #bae6fd; margin-bottom: 20px; text-align: center; font-weight: bold; color: #0369a1; }</style></head><body><div class="screen-only">印刷プレビューが表示されます。<br>ブラウザの印刷機能を使用してください。<br>(PDF保存の場合は送信先を「PDFに保存」に変更)</div>${content.outerHTML}<script>window.onload = () => { setTimeout(() => { window.print(); }, 500); };</script></body></html>`;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handlePdf = () => {
        alert("【PDF保存の方法】\n開いた別タブの印刷画面で「送信先(プリンター)」を「PDFに保存」に変更し、「保存」ボタンを押してください。");
        handlePrint();
    };

    const handleExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('検査成績表', {
            pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
        });
        // 元の12列構造 (検査テーブルと同じ列を共有、ハンコは行内マージで幅確保)
        const totalCols = 2 + displayQuantity;

        // --- 列幅 ---
        ws.getColumn(1).width = 28;
        ws.getColumn(2).width = 38;
        for (let i = 3; i <= totalCols; i++) ws.getColumn(i).width = 5.5;

        // --- スタイル定義 ---
        const thin = { style: 'thin', color: { argb: 'FF000000' } };
        const allBorder = { top: thin, bottom: thin, left: thin, right: thin };
        const grayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        const darkGrayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        let R = 1;
        const shortDt = (ts) => {
            if (!ts) return '';
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        };

        // ========== 1. タイトルエリア ==========
        // Row 1: サブタイトル + 開始時間 + ハンコラベル(2列ずつマージ)
        ws.mergeCells(R, 1, R, 2);
        const subTitle = ws.getRow(R).getCell(1);
        subTitle.value = '最終検査・タッチアップ後';
        subTitle.font = { size: 8, color: { argb: 'FF666666' }, bold: true };

        ws.mergeCells(R, 3, R, 4);
        const timeStart = ws.getRow(R).getCell(3);
        timeStart.value = `開始: ${lot.workStartTime ? shortDt(lot.workStartTime) : ''}`;
        timeStart.font = { size: 7 };
        timeStart.border = allBorder;
        timeStart.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        // ハンコ: 残りの列を4等分して2列ずつマージ
        const stampArea = totalCols - 4; // col 5 から totalCols
        const stampLabels = ['承認', '職長', '担当', 'ﾀｯﾁｱｯﾌﾟ'];
        const stampColPairs = [];
        const stampStartCol = 5;
        const stampColsAvail = totalCols - stampStartCol + 1; // = totalCols-4
        const colsPerStamp = Math.max(1, Math.floor(stampColsAvail / 4));
        for (let i = 0; i < 4; i++) {
            const c1 = stampStartCol + i * colsPerStamp;
            const c2 = (i < 3) ? c1 + colsPerStamp - 1 : totalCols;
            stampColPairs.push([c1, c2]);
            if (c1 !== c2) ws.mergeCells(R, c1, R, c2);
            const cell = ws.getRow(R).getCell(c1);
            cell.value = stampLabels[i];
            cell.font = { size: 8, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = allBorder;
            cell.fill = grayFill;
        }
        ws.getRow(R).height = 16;
        R++;

        // Row 2: メインタイトル + 終了時間 + ハンコ値
        ws.mergeCells(R, 1, R, 2);
        const mainTitle = ws.getRow(R).getCell(1);
        mainTitle.value = `最終検査チェックシート${lot.hasTail ? ' (オプション)' : ''}`;
        mainTitle.font = { size: 14, bold: true };

        ws.mergeCells(R, 3, R, 4);
        const timeEnd = ws.getRow(R).getCell(3);
        timeEnd.value = `終了: ${lot.completedAt ? shortDt(lot.completedAt) : ''}`;
        timeEnd.font = { size: 7 };
        timeEnd.border = allBorder;
        timeEnd.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const stampValues = ['', '', mainWorker || '', touchupWorker || ''];
        for (let i = 0; i < 4; i++) {
            const [c1, c2] = stampColPairs[i];
            if (c1 !== c2) ws.mergeCells(R, c1, R, c2);
            const cell = ws.getRow(R).getCell(c1);
            cell.value = stampValues[i];
            cell.font = { size: 9, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = allBorder;
        }
        ws.getRow(R).height = 30;
        R++;

        // Row 3: 空行
        ws.getRow(R).height = 4;
        R++;

        // ========== 2. 情報エリア（指図/型式 | 機番 | 備考欄）==========
        const infoStartRow = R;
        const infoLabels = ['指図', '型式', 'テール', '台数'];
        const infoValues = [lot.orderNo || '', lot.model || '', lot.hasTail ? 'あり' : '-', `${lot.quantity} 台`];
        for (let i = 0; i < 4; i++) {
            const r = infoStartRow + i;
            const lbl = ws.getRow(r).getCell(1);
            lbl.value = infoLabels[i];
            lbl.font = { size: 8, bold: true };
            lbl.alignment = { horizontal: 'center', vertical: 'middle' };
            lbl.border = allBorder;
            lbl.fill = grayFill;
            const val = ws.getRow(r).getCell(2);
            val.value = infoValues[i];
            val.font = { size: i <= 1 ? 10 : 8, bold: i <= 1 };
            val.alignment = { vertical: 'middle' };
            val.border = allBorder;
        }

        // 機番エリア: cols 3 ~ totalCols (1列1台、全数字列を使用)
        ws.mergeCells(infoStartRow, 3, infoStartRow, totalCols);
        const kibanHeader = ws.getRow(infoStartRow).getCell(3);
        kibanHeader.value = '機番';
        kibanHeader.font = { size: 9, bold: true };
        kibanHeader.alignment = { horizontal: 'center', vertical: 'middle' };
        kibanHeader.border = allBorder;
        kibanHeader.fill = grayFill;

        // 機番データ: 1列1台 (index + serial を richText で表示)
        const numCols = totalCols - 2;
        const kibanDataRows = Math.max(1, Math.ceil(Math.max(lot.quantity, 1) / numCols));
        for (let i = 0; i < Math.max(lot.quantity, 1); i++) {
            const rowOffset = Math.floor(i / numCols);
            const col = 3 + (i % numCols);
            const r = infoStartRow + 1 + rowOffset;
            const serial = lot.unitSerialNumbers?.[i] || '';
            const cell = ws.getRow(r).getCell(col);
            cell.value = { richText: [
                { text: `${i + 1}\n`, font: { size: 6, color: { argb: 'FF888888' } } },
                { text: serial, font: { size: 7, bold: true } }
            ]};
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = allBorder;
        }
        for (let ro = 0; ro < kibanDataRows; ro++) {
            ws.getRow(infoStartRow + 1 + ro).height = 28;
        }

        // 備考欄: 機番データ行の下の残り行 (cols 3-totalCols)
        const bikoStartRow = infoStartRow + 1 + kibanDataRows;
        const bikoEndRow = infoStartRow + 3;
        if (bikoStartRow <= bikoEndRow) {
            ws.mergeCells(bikoStartRow, 3, bikoEndRow, totalCols);
            const bikoCell = ws.getRow(bikoStartRow).getCell(3);
            let bikoText = '【記事】';
            if (defects) bikoText = `【不具合事項】${defects}\n【記事】`;
            bikoText += `\n${lot.appearanceNote || ''}`;
            bikoCell.value = bikoText;
            bikoCell.font = { size: 8 };
            bikoCell.alignment = { vertical: 'top', wrapText: true };
            bikoCell.border = allBorder;
        }

        R = infoStartRow + 4;
        ws.getRow(R).height = 4;
        R++;

        // ========== 3. 検査テーブル ==========
        const hdrA = ws.getRow(R).getCell(1);
        hdrA.value = '検査項目';
        hdrA.font = { size: 8, bold: true };
        hdrA.alignment = { horizontal: 'center', vertical: 'middle' };
        hdrA.border = allBorder;
        hdrA.fill = grayFill;
        const hdrB = ws.getRow(R).getCell(2);
        hdrB.value = '確認方法';
        hdrB.font = { size: 8, bold: true };
        hdrB.alignment = { horizontal: 'center', vertical: 'middle' };
        hdrB.border = allBorder;
        hdrB.fill = grayFill;
        for (let i = 0; i < displayQuantity; i++) {
            const cell = ws.getRow(R).getCell(3 + i);
            cell.value = i + 1;
            cell.font = { size: 7, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = allBorder;
            cell.fill = grayFill;
        }
        ws.getRow(R).height = 18;
        R++;

        // データ行
        const rowItems = buildRowItems(stepsByCategory);
        rowItems.forEach(item => {
            if (item.type === 'cat') {
                ws.mergeCells(R, 1, R, totalCols);
                const cell = ws.getRow(R).getCell(1);
                cell.value = item.category;
                cell.font = { size: 8, bold: true };
                cell.alignment = { vertical: 'middle' };
                cell.border = allBorder;
                cell.fill = darkGrayFill;
                ws.getRow(R).height = 16;
            } else {
                const step = item.step;
                const titleText = step.targetPart !== 'both'
                    ? `${step.title} [${step.targetPart === 'main' ? '本体' : 'テール'}]`
                    : step.title;
                const titleCell = ws.getRow(R).getCell(1);
                titleCell.value = titleText;
                titleCell.font = { size: 7, bold: true };
                titleCell.alignment = { vertical: 'middle', wrapText: true };
                titleCell.border = allBorder;
                const descCell = ws.getRow(R).getCell(2);
                descCell.value = step.description || '';
                descCell.font = { size: 7 };
                descCell.alignment = { vertical: 'middle', wrapText: true };
                descCell.border = allBorder;

                for (let i = 0; i < displayQuantity; i++) {
                    const cell = ws.getRow(R).getCell(3 + i);
                    if (i >= lot.quantity) {
                        cell.fill = grayFill;
                    } else {
                        const stepIndex = lot.steps.findIndex(s => s.id === step.id);
                        const task = lot.tasks?.[`${step.id}-${i}`] || lot.tasks?.[`${stepIndex}-${i}`];
                        if (task?.status === 'completed') cell.value = '✓';
                        else if (task?.status === 'skipped') cell.value = '－';
                    }
                    cell.font = { size: 8, bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = allBorder;
                }
                // 動的行高さ: テキスト長に応じて調整
                const titleLen = titleText.length;
                const descLen = (step.description || '').length;
                const lines1 = Math.max(1, Math.ceil(titleLen / 22));
                const lines2 = Math.max(1, Math.ceil(descLen / 30));
                const maxLines = Math.max(lines1, lines2);
                ws.getRow(R).height = Math.max(15, maxLines * 13);
            }
            R++;
        });

        // ========== 4. フッター ==========
        R++;
        ws.mergeCells(R, 1, R, 2);
        const judgmentCell = ws.getRow(R).getCell(1);
        judgmentCell.value = '判定:  合格';
        judgmentCell.font = { size: 14, bold: true };
        judgmentCell.border = { top: { style: 'medium', color: { argb: 'FF000000' } }, bottom: thin };
        R++;

        ws.mergeCells(R, 1, R, totalCols);
        const reportCell = ws.getRow(R).getCell(1);
        reportCell.value = `帳票番号：${customReportNo || ''}`;
        reportCell.font = { size: 8 };
        reportCell.alignment = { horizontal: 'right' };

        // ========== ダウンロード ==========
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${lot.orderNo || '不明'}_${lot.model || '不明'}_成績表.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const [includeAiImage, setIncludeAiImage] = useState(true);
    const [includePackagingPhotos, setIncludePackagingPhotos] = useState(true);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-800 flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md print:hidden shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-4">
                    <span className="flex items-center gap-2"><Printer className="w-5 h-5" /> 成績表プレビュー</span>

                    <label className="flex items-center gap-2 text-sm bg-slate-800 p-1.5 px-3 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-700 transition">
                        <input type="checkbox" checked={includeAiImage} onChange={e => setIncludeAiImage(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                        <span className="text-slate-300 font-bold">AI確認画像を含める</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm bg-slate-800 p-1.5 px-3 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-700 transition">
                        <input type="checkbox" checked={includePackagingPhotos} onChange={e => setIncludePackagingPhotos(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                        <span className="text-slate-300 font-bold">荷姿写真を含める</span>
                    </label>
                </h2>

                <div className="flex items-center gap-2 bg-slate-700 p-1 rounded px-3">
                    <span className="text-xs font-bold text-slate-300">帳票番号:</span>
                    <input type="text" value={customReportNo} onChange={(e) => setCustomReportNo(e.target.value)} className="bg-slate-800 text-white border border-slate-600 rounded px-2 py-0.5 text-sm w-32 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex gap-4">
                    <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white font-bold">閉じる</button>
                    <button type="button" onClick={handleExcel} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold shadow flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
                    <button type="button" onClick={handlePdf} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded font-bold shadow flex items-center gap-2"><FileText className="w-4 h-4" /> PDF保存</button>
                    <button type="button" onClick={handlePrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold shadow flex items-center gap-2"><Printer className="w-4 h-4" /> 印刷</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-500 p-8 print:p-0 print:bg-white print:overflow-visible">
                <style>{PRINT_STYLES}</style>
                <PrintableReport lot={lot} mainWorker={mainWorker} touchupWorker={touchupWorker} defects={defects} stepsByCategory={stepsByCategory} displayQuantity={displayQuantity} toDateTimeJp={toDateTimeJp} reportNo={customReportNo} includeAiImage={includeAiImage} includePackagingPhotos={includePackagingPhotos} />
            </div>
        </div>
    );
};

const BreakAlertSettings = ({ alerts, onChange }) => {
    const addAlert = () => { onChange([...alerts, { id: generateId(), time: '12:00', enabled: true, message: '休憩の時間です。作業を一時停止してください。' }]); };
    const updateAlert = (id, field, value) => { onChange(alerts.map(a => a.id === id ? { ...a, [field]: value } : a)); };
    const deleteAlert = (id) => { onChange(alerts.filter(a => a.id !== id)); };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><BellRing className="w-5 h-5 text-orange-500" /> 休憩・終了アラート設定</h3>
                <button onClick={addAlert} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded font-bold hover:bg-blue-100">+ 追加</button>
            </div>
            <p className="text-xs text-slate-500 mb-4">設定した時間の10分前に画面上部に通知を表示します。</p>
            <div className="space-y-3">
                {alerts.map(alert => (
                    <div key={alert.id} className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                        <input type="time" value={alert.time} onChange={(e) => updateAlert(alert.id, 'time', e.target.value)} className="border rounded p-1 font-bold text-lg" />
                        <div className="flex-1"><input type="text" value={alert.message} onChange={(e) => updateAlert(alert.id, 'message', e.target.value)} className="w-full border rounded p-1 text-sm" placeholder="通知メッセージ" /></div>
                        <label className="flex items-center gap-2 cursor-pointer"><span className="text-xs font-bold text-slate-500">有効</span><input type="checkbox" checked={alert.enabled} onChange={(e) => updateAlert(alert.id, 'enabled', e.target.checked)} className="w-5 h-5 accent-blue-600" /></label>
                        <button onClick={() => deleteAlert(alert.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
                {alerts.length === 0 && <div className="text-center text-slate-400 text-sm py-4">アラート設定はありません</div>}
            </div>
        </div>
    );
};

// --- 統計計算ユーティリティ ---
const calculateStats = (times) => {
    if (!times || times.length === 0) return null;
    const sorted = [...times].sort((a, b) => a - b);

    // 四分位数を用いた外れ値（異常値）の除外 (IQR法)
    const q1 = sorted[Math.floor((sorted.length / 4))];
    const q3 = sorted[Math.floor((sorted.length * (3 / 4)))];
    const iqr = q3 - q1;
    // 異常に長い/短いデータを除外
    const validTimes = sorted.filter(t => t >= q1 - 1.5 * iqr && t <= q3 + 1.5 * iqr);

    if (validTimes.length === 0) return null;

    const validSorted = [...validTimes].sort((a, b) => a - b);
    const sum = validSorted.reduce((a, b) => a + b, 0);
    const mean = sum / validSorted.length;

    const variance = validSorted.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validSorted.length;
    const stdDev = Math.sqrt(variance);

    return {
        rawCount: times.length,
        validCount: validSorted.length,
        min: Math.min(...validSorted),
        max: Math.max(...validSorted),
        mean: Math.round(mean),
        median: validSorted[Math.floor(validSorted.length / 2)],
        stdDev: Math.round(stdDev),
        p25: validSorted[Math.floor(validSorted.length * 0.25)],
        p75: validSorted[Math.floor(validSorted.length * 0.75)]
    };
};

const TargetTimeHistoryPanel = ({ history }) => {
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {sorted.length === 0 && <div className="text-center text-slate-400 py-10 bg-white rounded-xl border border-slate-200 shadow-sm">変更履歴はありません</div>}
            {sorted.map(h => (
                <div key={h.id || h.timestamp} className="bg-white p-5 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-start mb-4 border-b pb-3">
                        <div>
                            <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(h.timestamp).toLocaleString()} に変更</div>
                            <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Target className="w-5 h-5 text-indigo-500" />
                                {h.targetType === 'model' ? '型式' : '外観図'}: <span className="bg-slate-100 px-2 rounded">{h.targetValue}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {h.updates.map((u, i) => (
                            <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold text-sm text-slate-700">
                                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded mr-2 font-normal">{u.category}</span>
                                        {u.title}
                                    </div>
                                    <div className="flex items-center gap-3 font-mono text-sm bg-white px-3 py-1 rounded shadow-sm border">
                                        <span className="text-slate-400 line-through">{u.oldTime}s</span>
                                        <ArrowRight className="w-4 h-4 text-slate-300" />
                                        <span className="font-bold text-blue-600 text-base">{u.newTime}s</span>
                                    </div>
                                </div>
                                <div className="text-[10px] flex flex-wrap gap-2 text-slate-500 items-center">
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-100">{u.strategyName}</span>
                                    <span className="bg-white px-2 py-0.5 rounded border">集計期間: <span className="font-bold">{u.evidence.periodLabel}</span></span>
                                    <span className="bg-white px-2 py-0.5 rounded border">有効データ: <span className="font-bold">{u.evidence.validCount}件</span></span>
                                    <span className="bg-white px-2 py-0.5 rounded border">実績エビデンス: 平均 <span className="font-bold">{u.evidence.mean}s</span> / バラつき <span className="font-bold">±{u.evidence.stdDev}s</span></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const ProcessInsightsTab = ({ lots, masterItems, customTargetTimes, onSaveSettings, onSaveHistory, targetTimeHistory }) => {
    const [targetType, setTargetType] = useState('model'); // 'model' or 'app'
    const [targetValue, setTargetValue] = useState('');
    const [bulkStrategy, setBulkStrategy] = useState('standard');
    const [period, setPeriod] = useState('3m');

    // カスタム期間用のstate
    const [customStartDate, setCustomStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const [customEndDate, setCustomEndDate] = useState(() => {
        const d = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });

    const [showHistory, setShowHistory] = useState(false);

    // targetTypeが変更されたらtargetValueをリセット
    useEffect(() => {
        setTargetValue('');
    }, [targetType]);

    const getPeriodDates = () => {
        let start = 0;
        let end = Infinity;

        if (period === 'custom') {
            if (customStartDate) start = new Date(customStartDate).getTime();
            if (customEndDate) {
                const ed = new Date(customEndDate);
                ed.setHours(23, 59, 59, 999);
                end = ed.getTime();
            }
        } else {
            const d = new Date();
            if (period === '1m') d.setMonth(d.getMonth() - 1);
            else if (period === '3m') d.setMonth(d.getMonth() - 3);
            else if (period === '6m') d.setMonth(d.getMonth() - 6);
            else return { start: 0, end: Infinity }; // all
            start = d.getTime();
        }
        return { start, end };
    };

    const availableTargets = useMemo(() => {
        const targets = new Set();
        lots.filter(l => l.status === 'completed').forEach(l => {
            const val = targetType === 'model' ? l.model : l.appearanceNote;
            if (val) targets.add(val);
        });
        return Array.from(targets).sort();
    }, [lots, targetType]);

    const insightsData = useMemo(() => {
        if (!targetValue) return [];
        const { start: startDate, end: endDate } = getPeriodDates();

        const targetLots = lots.filter(l => {
            if (l.status !== 'completed') return false;
            if (targetType === 'model' && l.model !== targetValue) return false;
            if (targetType === 'app' && l.appearanceNote !== targetValue) return false;
            const completedAt = getSafeTime(l.completedAt || l.updatedAt);
            if (completedAt < startDate || completedAt > endDate) return false;
            return true;
        });

        if (targetLots.length === 0) return [];

        const stepTimes = {};
        const workerTimesByStep = {};

        targetLots.forEach(lot => {
            lot.steps.forEach((step, idx) => {
                const stepKey = `${step.category}_${step.title}`;
                if (!stepTimes[stepKey]) {
                    stepTimes[stepKey] = { title: step.title, category: step.category, times: [], originalTarget: step.targetTime };
                    workerTimesByStep[stepKey] = {};
                }

                for (let i = 0; i < lot.quantity; i++) {
                    const task = lot.tasks?.[`${step.id}-${i}`] || lot.tasks?.[`${idx}-${i}`];
                    if (task && task.status === 'completed' && task.duration > 0) {
                        stepTimes[stepKey].times.push(task.duration);

                        const worker = task.workerName || '不明';
                        if (!workerTimesByStep[stepKey][worker]) workerTimesByStep[stepKey][worker] = [];
                        workerTimesByStep[stepKey][worker].push(task.duration);
                    }
                }
            });
        });

        const results = [];
        Object.keys(stepTimes).forEach(key => {
            const data = stepTimes[key];
            const stats = calculateStats(data.times);
            if (!stats) return;

            // 作業者別の最速抽出
            let bestWorker = null;
            let bestWorkerAvg = Infinity;
            Object.entries(workerTimesByStep[key]).forEach(([worker, times]) => {
                const wStats = calculateStats(times);
                if (wStats && wStats.validCount >= 3 && wStats.mean < bestWorkerAvg) {
                    bestWorkerAvg = wStats.mean;
                    bestWorker = worker;
                }
            });

            // 改善インサイトの生成 (ルールベース)
            const insights = [];
            const coeffVariation = stats.stdDev / stats.mean; // 変動係数(ばらつきの度合い)
            const savedKey = targetType === 'model' ? `model_${targetValue}` : `app_${targetValue}`;
            const currentTarget = customTargetTimes[savedKey]?.[key] || data.originalTarget;

            if (coeffVariation > 0.4) {
                insights.push({ type: 'warning', text: '作業者や日による時間のバラつきが大きいです。手順の標準化や見直しを推奨します。' });
            }
            if (stats.mean > currentTarget * 1.3) {
                insights.push({ type: 'danger', text: `平均実績(${stats.mean}秒)が現在の目標(${currentTarget}秒)を大幅に超えています。目標が厳しすぎる可能性があります。` });
            } else if (stats.mean < currentTarget * 0.7) {
                insights.push({ type: 'info', text: `平均実績(${stats.mean}秒)が目標(${currentTarget}秒)を下回っています。目標を引き下げることで計画精度が向上します。` });
            }

            if (bestWorker && bestWorkerAvg < stats.mean * 0.8) {
                insights.push({ type: 'success', text: `ベストプラクティス: ${bestWorker}さんが安定して早く(${Math.round(bestWorkerAvg)}秒)作業しています。ノウハウ共有が有効です。` });
            }

            // 3つの戦略を定義
            const strategies = [
                {
                    id: 'standard',
                    name: '標準バランス型',
                    desc: '全体の平均。標準的なスキル想定。',
                    value: stats.mean,
                    color: 'text-blue-800 bg-blue-50 border-blue-200 hover:bg-blue-100'
                },
                {
                    id: 'aggressive',
                    name: bestWorker ? `効率型 (${bestWorker}基準)` : '効率追求型 (上位25%)',
                    desc: '最も速い人のペースを基準。',
                    value: bestWorkerAvg !== Infinity ? Math.round(bestWorkerAvg) : stats.p25,
                    color: 'text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                },
                {
                    id: 'conservative',
                    name: '余裕確保型',
                    desc: 'バラつきを考慮した余裕あるペース。',
                    value: Math.round(stats.mean + stats.stdDev),
                    color: 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100'
                }
            ];

            results.push({
                key,
                ...data,
                stats,
                currentTarget,
                insights,
                strategies
            });
        });

        return results.sort((a, b) => b.stats.mean - a.stats.mean); // 時間がかかっている順
    }, [lots, targetValue, targetType, customTargetTimes, period, customStartDate, customEndDate]);

    const applySuggestedTarget = (itemKey, strat, data) => {
        const savedKey = targetType === 'model' ? `model_${targetValue}` : `app_${targetValue}`;
        const currentCustoms = customTargetTimes[savedKey] || {};
        const newCustomTimes = {
            ...customTargetTimes,
            [savedKey]: { ...currentCustoms, [itemKey]: strat.value }
        };
        onSaveSettings({ customTargetTimes: newCustomTimes });

        const periodLabel = period === 'custom' ? `${customStartDate}〜${customEndDate}` : period === '1m' ? '過去1ヶ月' : period === '3m' ? '過去3ヶ月' : period === '6m' ? '過去6ヶ月' : '全期間';

        const historyData = {
            timestamp: Date.now(),
            targetType,
            targetValue,
            updates: [{
                key: itemKey,
                category: data.category,
                title: data.title,
                oldTime: data.currentTarget,
                newTime: strat.value,
                strategyName: strat.name,
                evidence: {
                    periodLabel: periodLabel,
                    validCount: data.stats.validCount,
                    mean: data.stats.mean,
                    stdDev: data.stats.stdDev
                }
            }]
        };
        onSaveHistory(historyData);
        alert('指定の目標時間をマスタに適用しました。次回以降のロットから反映されます。');
    };

    const applyAllSuggestedTargets = () => {
        const savedKey = targetType === 'model' ? `model_${targetValue}` : `app_${targetValue}`;
        const currentCustoms = customTargetTimes[savedKey] || {};
        const newUpdates = {};
        const historyUpdates = [];
        const periodLabel = period === 'custom' ? `${customStartDate}〜${customEndDate}` : period === '1m' ? '過去1ヶ月' : period === '3m' ? '過去3ヶ月' : period === '6m' ? '過去6ヶ月' : '全期間';

        insightsData.forEach(data => {
            const selectedStrat = data.strategies.find(s => s.id === bulkStrategy);
            if (selectedStrat && data.currentTarget !== selectedStrat.value) {
                newUpdates[data.key] = selectedStrat.value;
                historyUpdates.push({
                    key: data.key,
                    category: data.category,
                    title: data.title,
                    oldTime: data.currentTarget,
                    newTime: selectedStrat.value,
                    strategyName: selectedStrat.name,
                    evidence: {
                        periodLabel: periodLabel,
                        validCount: data.stats.validCount,
                        mean: data.stats.mean,
                        stdDev: data.stats.stdDev
                    }
                });
            }
        });

        if (historyUpdates.length === 0) {
            alert('更新する項目がありません。');
            return;
        }

        const newCustomTimes = {
            ...customTargetTimes,
            [savedKey]: { ...currentCustoms, ...newUpdates }
        };
        onSaveSettings({ customTargetTimes: newCustomTimes });

        const historyData = {
            timestamp: Date.now(),
            targetType,
            targetValue,
            updates: historyUpdates
        };
        onSaveHistory(historyData);
        alert(`表示されている全項目に「${bulkStrategy === 'standard' ? '標準バランス型' : bulkStrategy === 'aggressive' ? '効率追求型' : '余裕確保型'}」の目標時間を適用しました。`);
    };

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Zap className="w-5 h-5" /></div>
                    <div>
                        <h3 className="font-bold text-slate-800">工程改善・目標時間最適化</h3>
                        <p className="text-xs text-slate-500">実績データからエビデンスを算出し、状況に応じた最適な目標時間を提案します。</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowHistory(false)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${!showHistory ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        最適化提案
                    </button>
                    <button onClick={() => setShowHistory(true)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${showHistory ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        <History className="w-4 h-4" /> 変更履歴
                    </button>
                </div>
            </div>

            {!showHistory ? (
                <>
                    <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border shadow-sm shrink-0">
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setTargetType('model')} className={`px-4 py-1.5 text-sm font-bold rounded-md ${targetType === 'model' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>型式で分析</button>
                            <button onClick={() => setTargetType('app')} className={`px-4 py-1.5 text-sm font-bold rounded-md ${targetType === 'app' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>外観図で分析</button>
                        </div>
                        <select value={targetValue} onChange={e => setTargetValue(e.target.value)} className="border border-indigo-200 rounded px-3 py-1.5 font-bold text-slate-700 outline-none focus:border-indigo-500 min-w-[200px]">
                            <option value="">{targetType === 'model' ? '型式を選択...' : '外観図を選択...'}</option>
                            {availableTargets.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>

                        <div className="h-6 w-px bg-slate-300 mx-2"></div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-600">集計期間:</span>
                            <select value={period} onChange={e => setPeriod(e.target.value)} className="border rounded px-3 py-1.5 text-sm font-bold text-slate-700 bg-slate-50 outline-none">
                                <option value="1m">過去1ヶ月</option>
                                <option value="3m">過去3ヶ月</option>
                                <option value="6m">過去6ヶ月</option>
                                <option value="all">全期間</option>
                                <option value="custom">期間指定(カスタム)</option>
                            </select>
                            {period === 'custom' && (
                                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded border ml-2">
                                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" />
                                    <span className="text-slate-400">~</span>
                                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" />
                                </div>
                            )}
                        </div>
                    </div>

                    {targetValue ? (
                        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
                            {insightsData.length > 0 && (
                                <div className="flex flex-wrap justify-end gap-2 mb-2 items-center bg-white p-3 rounded-lg border shadow-sm">
                                    <span className="text-sm font-bold text-slate-600">一括適用:</span>
                                    <select value={bulkStrategy} onChange={(e) => setBulkStrategy(e.target.value)} className="border rounded px-3 py-1.5 text-sm font-bold bg-slate-50">
                                        <option value="standard">標準バランス型の値を適用</option>
                                        <option value="aggressive">効率追求型の値を適用</option>
                                        <option value="conservative">余裕確保型の値を適用</option>
                                    </select>
                                    <button onClick={applyAllSuggestedTargets} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded font-bold shadow flex items-center gap-2 text-sm">
                                        <Bot className="w-4 h-4" /> 実行
                                    </button>
                                </div>
                            )}

                            {insightsData.map((data, idx) => (
                                <div key={idx} className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
                                    <div className="p-4 border-b md:border-b-0 md:border-r bg-slate-50 md:w-1/3 flex flex-col justify-center">
                                        <div className="text-xs font-bold text-slate-400 mb-1">{data.category}</div>
                                        <div className="font-bold text-lg text-slate-800 mb-3">{data.title}</div>

                                        <div className="flex justify-between items-center text-sm bg-white border p-2 rounded mb-2">
                                            <span className="text-slate-500 font-bold">現在の設定目標:</span>
                                            <span className="font-mono font-black text-slate-800 text-lg">{data.currentTarget}秒</span>
                                        </div>

                                        <div className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> 状況に応じた推奨目標</div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {data.strategies.map(strat => (
                                                <div key={strat.id} className={`p-2 rounded border flex flex-col justify-between transition-colors ${strat.color}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="text-xs font-bold mb-0.5">{strat.name}</div>
                                                            <div className="text-[10px] opacity-80 leading-tight pr-2">{strat.desc}</div>
                                                        </div>
                                                        <div className="font-mono font-black text-lg shrink-0">{strat.value}s</div>
                                                    </div>
                                                    {data.currentTarget !== strat.value && (
                                                        <button
                                                            onClick={() => applySuggestedTarget(data.key, strat, data)}
                                                            className="w-full mt-2 py-1 bg-white/60 hover:bg-white border border-current/20 rounded text-xs font-bold transition-colors shadow-sm"
                                                        >
                                                            この目標を採用する
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-bold text-slate-600 flex items-center gap-1"><Activity className="w-4 h-4" /> 統計エビデンス</h4>
                                            <span className="text-xs text-slate-400">有効データ: {data.stats.validCount}件 (除外: {data.stats.rawCount - data.stats.validCount}件)</span>
                                        </div>

                                        {/* 簡易分布バー */}
                                        <div className="mb-4 bg-slate-100 rounded-full h-8 relative flex items-center px-2 shadow-inner overflow-hidden border border-slate-200">
                                            {/* 範囲の可視化 */}
                                            <div className="absolute top-0 bottom-0 bg-blue-100/50" style={{ left: '0%', right: '0%' }}></div>

                                            <span className="absolute left-2 text-[10px] text-slate-400">{data.stats.min}s (最速)</span>
                                            <span className="absolute right-2 text-[10px] text-slate-400">{data.stats.max}s (最遅)</span>

                                            {/* 中央値・平均値のマーカー */}
                                            <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500" style={{ left: '50%', transform: 'translateX(-50%)' }}></div>
                                            <div className="absolute top-1 -mt-5 bg-blue-600 text-white text-[10px] px-1.5 rounded font-bold" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                                                平均 {data.stats.mean}s
                                            </div>
                                            {/* ばらつき(標準偏差)の可視化 */}
                                            <div className="absolute h-2 bg-blue-400/40 rounded-full" style={{ left: '25%', right: '25%', top: '50%', transform: 'translateY(-50%)' }}></div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                            <div className="bg-slate-50 p-2 rounded border">
                                                <div className="text-[10px] text-slate-500 font-bold mb-0.5">平均値</div>
                                                <div className="font-mono text-sm font-bold">{data.stats.mean}秒</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded border">
                                                <div className="text-[10px] text-slate-500 font-bold mb-0.5">中央値</div>
                                                <div className="font-mono text-sm font-bold">{data.stats.median}秒</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded border">
                                                <div className="text-[10px] text-slate-500 font-bold mb-0.5">バラつき(標準偏差)</div>
                                                <div className="font-mono text-sm font-bold">±{data.stats.stdDev}秒</div>
                                            </div>
                                        </div>

                                        {data.insights.length > 0 && (
                                            <div className="mt-auto space-y-1.5">
                                                <div className="text-xs font-bold text-slate-500 mb-1">自動インサイト:</div>
                                                {data.insights.map((insight, i) => {
                                                    let colors = 'bg-slate-50 text-slate-700 border-slate-200';
                                                    let Icon = AlertCircle;
                                                    if (insight.type === 'warning') { colors = 'bg-amber-50 text-amber-800 border-amber-200'; Icon = AlertTriangle; }
                                                    if (insight.type === 'danger') { colors = 'bg-rose-50 text-rose-800 border-rose-200'; Icon = AlertOctagon; }
                                                    if (insight.type === 'info') { colors = 'bg-blue-50 text-blue-800 border-blue-200'; Icon = Info; }
                                                    if (insight.type === 'success') { colors = 'bg-emerald-50 text-emerald-800 border-emerald-200'; Icon = TrendingUp; }

                                                    return (
                                                        <div key={i} className={`flex gap-2 p-2 rounded border text-xs font-bold ${colors}`}>
                                                            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                                                            <span>{insight.text}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {insightsData.length === 0 && (
                                <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400">
                                    指定された期間の完了実績データが不足しているため、分析できません。
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 font-bold p-6">
                            <Target className="w-12 h-12 mb-3 opacity-20" />
                            <p>上部のメニューから分析対象の「{targetType === 'model' ? '型式' : '外観図'}」を選択してください。</p>
                            <p className="text-xs mt-2 font-normal text-slate-500">十分な完了実績がある{targetType === 'model' ? '型式' : '外観図'}ほど、正確なエビデンスと提案が生成されます。</p>
                        </div>
                    )}
                </>
            ) : (
                <TargetTimeHistoryPanel history={targetTimeHistory} />
            )}
        </div>
    );
};

// HelpCircle の代わりに使用するためインポート追加を想定（簡易対応として）
const Info = HelpCircle;

const AnalyticsView = ({ lots, onSaveLot, masterItems, customTargetTimes, onSaveSettings, onSaveHistory, targetTimeHistory, defectProcessOptions, currentUserName = '', indirectWork = [] }) => {
    const [activeTab, setActiveTab] = useState('performance');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [defectFilterMonth, setDefectFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [filterMode, setFilterMode] = useState('month');
    const [filterStartDate, setFilterStartDate] = useState(new Date().toISOString().split('T')[0].slice(0, 8) + '01');
    const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedDefectImage, setExpandedDefectImage] = useState(null);
    const [editModal, setEditModal] = useState({ isOpen: false, type: null, data: null, lotId: null });
    const [editLabel, setEditLabel] = useState('');
    const [editCauseProcess, setEditCauseProcess] = useState('');
    const [editPhotos, setEditPhotos] = useState([]);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null, confirmText: '実行', confirmColor: 'bg-blue-600' });

    const dailyStats = useMemo(() => {
        const targetDate = new Date(filterDate);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const targetLots = lots.filter(l => {
            if (l.status !== 'completed') return false;
            const completedAt = getSafeTime(l.completedAt || l.updatedAt);
            return completedAt >= targetDate.getTime() && completedAt < nextDate.getTime();
        });

        const orderCount = targetLots.length;
        const unitCount = targetLots.reduce((acc, l) => acc + l.quantity, 0);

        let totalTime = 0;
        targetLots.forEach(lot => {
            lot.steps.forEach((step, sIdx) => {
                for (let i = 0; i < lot.quantity; i++) {
                    const task = lot.tasks?.[`${step.id}-${i}`] || lot.tasks?.[`${sIdx}-${i}`];
                    if (task?.status === 'completed') {
                        totalTime += (task.duration || 0);
                    }
                }
            });
        });

        const workerStats = {};
        targetLots.forEach(lot => {
            const durationByWorker = {};
            lot.steps.forEach((step, sIdx) => {
                for (let i = 0; i < lot.quantity; i++) {
                    const task = lot.tasks?.[`${step.id}-${i}`] || lot.tasks?.[`${sIdx}-${i}`];
                    if (task?.status === 'completed') {
                        const w = task.workerName || '不明';
                        if (!durationByWorker[w]) durationByWorker[w] = 0;
                        durationByWorker[w] += (task.duration || 0);
                        if (!workerStats[w]) workerStats[w] = { workerName: w, orderCount: 0, unitCount: 0, totalTime: 0 };
                        workerStats[w].totalTime += (task.duration || 0);
                    }
                }
            });
            let mainWorker = null;
            let maxDur = -1;
            for (const [w, dur] of Object.entries(durationByWorker)) {
                if (dur > maxDur) { maxDur = dur; mainWorker = w; }
            }
            if (mainWorker) {
                if (!workerStats[mainWorker]) workerStats[mainWorker] = { workerName: mainWorker, orderCount: 0, unitCount: 0, totalTime: 0 };
                workerStats[mainWorker].orderCount += 1;
                workerStats[mainWorker].unitCount += lot.quantity;
            }
        });

        const workers = Object.values(workerStats).sort((a, b) => b.orderCount - a.orderCount);
        return { orderCount, unitCount, totalTime, workers };
    }, [lots, filterDate]);

    const riskStats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const incompleteLots = lots.filter(l => l.status !== 'completed');
        let overdueCount = 0;
        let dueSoonCount = 0;

        incompleteLots.forEach(lot => {
            if (lot.dueDate && typeof lot.dueDate === 'string') {
                if (lot.dueDate < todayStr) overdueCount++;
                else if (lot.dueDate === todayStr || lot.dueDate === tomorrowStr) dueSoonCount++;
            }
        });
        return { overdueCount, dueSoonCount };
    }, [lots]);

    const isInFilterPeriod = (timestamp) => {
        const ts = getSafeTime(timestamp);
        if (filterMode === 'month') {
            try {
                const d = new Date(ts);
                if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7) === defectFilterMonth;
            } catch (e) {}
            return false;
        } else {
            const startMs = new Date(filterStartDate + 'T00:00:00').getTime();
            const endMs = new Date(filterEndDate + 'T23:59:59').getTime();
            return ts >= startMs && ts <= endMs;
        }
    };

    const defectStats = useMemo(() => {
        let totalCompletedLots = 0;
        let defectLotCount = 0;
        const defects = [];
        const modelCounts = {};
        const stepCounts = {};
        const workerCounts = {};
        const processCounts = {};

        lots.forEach(lot => {
            const lotTime = getSafeTime(lot.completedAt || lot.updatedAt || lot.entryAt);
            const inPeriod = isInFilterPeriod(lotTime);

            if (inPeriod) {
                if (lot.status === 'completed') { totalCompletedLots++; }

                const lotDefects = (lot.interruptions || []).filter(i => i.type === 'defect');
                if (lotDefects.length > 0) {
                    defectLotCount++;
                    lotDefects.forEach(d => {
                        defects.push({ ...d, lot });
                        const m = lot.model || '不明';
                        modelCounts[m] = (modelCounts[m] || 0) + 1;
                        const st = d.stepInfo ? `${d.stepInfo.category} - ${d.stepInfo.title}` : '全体 / 項目指定なし';
                        stepCounts[st] = (stepCounts[st] || 0) + 1;
                        const w = d.workerName || '不明';
                        workerCounts[w] = (workerCounts[w] || 0) + 1;
                        const cp = d.causeProcess || '未指定';
                        processCounts[cp] = (processCounts[cp] || 0) + 1;
                    });
                }
            }
        });

        const defectRate = totalCompletedLots > 0 ? ((defectLotCount / totalCompletedLots) * 100).toFixed(1) : 0;
        const sortObj = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

        return { totalCompletedLots, defectLotCount, totalDefects: defects.length, defectRate, defects: defects.sort((a, b) => b.timestamp - a.timestamp), models: sortObj(modelCounts), steps: sortObj(stepCounts), workers: sortObj(workerCounts), processes: sortObj(processCounts) };
    }, [lots, defectFilterMonth, filterMode, filterStartDate, filterEndDate]);

    const complaintStats = useMemo(() => {
        const complaints = [];
        const labelCounts = {};
        const stepCounts = {};
        const workerCounts = {};

        lots.forEach(lot => {
            const lotComplaints = (lot.interruptions || []).filter(i => i.type === 'complaint');
            if (lotComplaints.length > 0) {
                lotComplaints.forEach(c => {
                    if (isInFilterPeriod(c.timestamp)) {
                        complaints.push({ ...c, lot });

                        const mainLabel = (c.label || '').split(' : ')[0] || 'その他';
                        labelCounts[mainLabel] = (labelCounts[mainLabel] || 0) + 1;

                        const st = c.stepInfo ? `${c.stepInfo.category} - ${c.stepInfo.title}` : '全体 / 項目指定なし';
                        stepCounts[st] = (stepCounts[st] || 0) + 1;

                        const w = c.workerName || '不明';
                        workerCounts[w] = (workerCounts[w] || 0) + 1;
                    }
                });
            }
        });

        const sortObj = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

        return {
            totalComplaints: complaints.length,
            complaints: complaints.sort((a, b) => b.timestamp - a.timestamp),
            labels: sortObj(labelCounts),
            steps: sortObj(stepCounts),
            workers: sortObj(workerCounts)
        };
    }, [lots, defectFilterMonth, filterMode, filterStartDate, filterEndDate]);

    const filterSuffix = filterMode === 'month' ? defectFilterMonth : `${filterStartDate}_${filterEndDate}`;
    const filterLabel = filterMode === 'month' ? defectFilterMonth : `${filterStartDate} ~ ${filterEndDate}`;

    const downloadInterruptionCSV = (dataList, prefix) => {
        const headers = ['報告日時', '型式', '指図番号', 'カテゴリ', '報告項目', '内容', '原因工程', '写真枚数', '報告者'];
        const rows = dataList.map(d => {
            const dDate = new Date(getSafeTime(d.timestamp));
            const dateStr = isNaN(dDate.getTime()) ? '-' : dDate.toLocaleString();
            const category = d.stepInfo ? d.stepInfo.category : '全体';
            const title = d.stepInfo ? d.stepInfo.title : '特定項目なし';
            const label = `"${(d.label || '').replace(/"/g, '""')}"`;
            const causeProcess = `"${d.causeProcess || ''}"`;
            const photoCount = d.photos ? d.photos.length : 0;
            return [dateStr, `"${d.lot?.model || ''}"`, `"${d.lot?.orderNo || ''}"`, `"${category}"`, `"${title}"`, label, causeProcess, photoCount, `"${d.workerName || ''}"`].join(',');
        });
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${prefix}_${filterSuffix}.csv`;
        link.click();
    };

    const triggerDeleteInterruption = (interruptionId, lotId, typeName) => {
        setConfirmModal({
            isOpen: true, title: `${typeName}の削除`, message: `この${typeName}を削除しますか？\n誤って登録した場合のみ使用してください。`, confirmText: '削除', confirmColor: 'bg-red-600',
            action: () => {
                const lot = lots.find(l => l.id === lotId);
                if (lot) {
                    const newInterruptions = (lot.interruptions || []).filter(i => i.id !== interruptionId);
                    onSaveLot(lotId, { interruptions: newInterruptions });
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // --- 編集機能 ---
    const triggerEditInterruption = (data, lotId, type) => {
        setEditLabel(data.label || '');
        setEditCauseProcess(data.causeProcess || '');
        setEditPhotos(data.photos ? [...data.photos] : []);
        setEditModal({ isOpen: true, type, data, lotId });
    };
    const handleEditPhotoAdd = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => setEditPhotos(prev => [...prev, ev.target.result]);
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };
    const saveEditInterruption = () => {
        const { data, lotId, type } = editModal;
        const lot = lots.find(l => l.id === lotId);
        if (!lot) return;
        const updatedInterruptions = (lot.interruptions || []).map(i => {
            if (i.id !== data.id) return i;
            if (type === 'defect') {
                const updated = { ...i, label: editLabel };
                if (editCauseProcess) updated.causeProcess = editCauseProcess; else delete updated.causeProcess;
                if (editPhotos.length > 0) updated.photos = editPhotos; else delete updated.photos;
                return updated;
            } else {
                return { ...i, label: editLabel };
            }
        });
        onSaveLot(lotId, { interruptions: updatedInterruptions });
        setEditModal({ isOpen: false, type: null, data: null, lotId: null });
    };

    // --- 共通フィルターUI ---
    const renderFilterUI = () => (
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm flex-wrap">
            <div className="flex bg-slate-100 rounded p-0.5">
                <button onClick={() => setFilterMode('month')} className={`px-2 py-1 text-xs font-bold rounded transition-colors ${filterMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>月単位</button>
                <button onClick={() => setFilterMode('range')} className={`px-2 py-1 text-xs font-bold rounded transition-colors ${filterMode === 'range' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>期間指定</button>
            </div>
            {filterMode === 'month' ? (
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-slate-500" />
                    <input type="month" value={defectFilterMonth} onChange={(e) => setDefectFilterMonth(e.target.value)} className="font-bold text-slate-700 bg-transparent outline-none" />
                </div>
            ) : (
                <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="w-5 h-5 text-slate-500" />
                    <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="font-bold text-slate-700 bg-transparent outline-none border rounded px-2 py-1" />
                    <span className="text-slate-400 font-bold">~</span>
                    <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="font-bold text-slate-700 bg-transparent outline-none border rounded px-2 py-1" />
                </div>
            )}
        </div>
    );

    // --- Excel出力: 不具合分析 ---
    const handleDefectExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('不具合分析');
        const thin = { style: 'thin', color: { argb: 'FF000000' } };
        const allBorder = { top: thin, bottom: thin, left: thin, right: thin };
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        let R = 1;
        ws.mergeCells(R, 1, R, 8);
        const tc = ws.getRow(R).getCell(1);
        tc.value = `不具合分析レポート (${filterLabel})`;
        tc.font = { size: 14, bold: true };
        R += 2;
        [['完了ロット数', defectStats.totalCompletedLots], ['不具合発生ロット数', defectStats.defectLotCount], ['不具合発生率', `${defectStats.defectRate}%`], ['不具合総数', defectStats.totalDefects]].forEach(([label, value]) => {
            const r = ws.getRow(R);
            r.getCell(1).value = label; r.getCell(1).font = { bold: true, size: 10 }; r.getCell(1).border = allBorder; r.getCell(1).fill = headerFill;
            r.getCell(2).value = value; r.getCell(2).border = allBorder;
            R++;
        });
        R += 1;
        [{ title: '型式別 ワースト', data: defectStats.models }, { title: '項目別 ワースト', data: defectStats.steps }, { title: '原因工程別 ワースト', data: defectStats.processes }, { title: '報告者別', data: defectStats.workers }].forEach(({ title, data }) => {
            ws.getRow(R).getCell(1).value = title; ws.getRow(R).getCell(1).font = { bold: true, size: 11 }; R++;
            data.forEach(({ name, count }) => {
                ws.getRow(R).getCell(1).value = name; ws.getRow(R).getCell(1).border = allBorder;
                ws.getRow(R).getCell(2).value = `${count}件`; ws.getRow(R).getCell(2).border = allBorder; R++;
            });
            if (data.length === 0) { ws.getRow(R).getCell(1).value = 'データなし'; R++; }
            R++;
        });
        ws.getRow(R).getCell(1).value = '報告履歴'; ws.getRow(R).getCell(1).font = { bold: true, size: 12 }; R++;
        ['日時', '型式', '指図番号', '報告項目', '内容', '原因工程', '写真枚数', '報告者'].forEach((h, i) => {
            const c = ws.getRow(R).getCell(i + 1); c.value = h; c.font = { bold: true, size: 9 }; c.border = allBorder; c.fill = headerFill;
        });
        R++;
        defectStats.defects.forEach(d => {
            const dDate = new Date(getSafeTime(d.timestamp));
            const dateStr = isNaN(dDate.getTime()) ? '-' : dDate.toLocaleString();
            [dateStr, d.lot?.model || '', d.lot?.orderNo || '', d.stepInfo ? `${d.stepInfo.category} - ${d.stepInfo.title}` : '', d.label || '', d.causeProcess || '', d.photos ? d.photos.length : 0, d.workerName || ''].forEach((v, i) => {
                const c = ws.getRow(R).getCell(i + 1); c.value = v; c.border = allBorder; c.font = { size: 9 };
            });
            R++;
        });
        [20, 15, 15, 25, 30, 12, 10, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `不具合分析_${filterSuffix}.xlsx`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // --- Excel出力: 不満・気付き ---
    const handleComplaintExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('不満・気付き分析');
        const thin = { style: 'thin', color: { argb: 'FF000000' } };
        const allBorder = { top: thin, bottom: thin, left: thin, right: thin };
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        let R = 1;
        ws.mergeCells(R, 1, R, 6);
        const tc = ws.getRow(R).getCell(1);
        tc.value = `不満・気付き分析レポート (${filterLabel})`;
        tc.font = { size: 14, bold: true };
        R += 2;
        ws.getRow(R).getCell(1).value = '報告総数'; ws.getRow(R).getCell(1).font = { bold: true, size: 10 }; ws.getRow(R).getCell(1).border = allBorder; ws.getRow(R).getCell(1).fill = headerFill;
        ws.getRow(R).getCell(2).value = complaintStats.totalComplaints; ws.getRow(R).getCell(2).border = allBorder;
        R += 2;
        [{ title: '不満内容別 ワースト', data: complaintStats.labels }, { title: '項目別 ワースト', data: complaintStats.steps }, { title: '報告者別', data: complaintStats.workers }].forEach(({ title, data }) => {
            ws.getRow(R).getCell(1).value = title; ws.getRow(R).getCell(1).font = { bold: true, size: 11 }; R++;
            data.forEach(({ name, count }) => {
                ws.getRow(R).getCell(1).value = name; ws.getRow(R).getCell(1).border = allBorder;
                ws.getRow(R).getCell(2).value = `${count}件`; ws.getRow(R).getCell(2).border = allBorder; R++;
            });
            if (data.length === 0) { ws.getRow(R).getCell(1).value = 'データなし'; R++; }
            R++;
        });
        ws.getRow(R).getCell(1).value = '報告履歴'; ws.getRow(R).getCell(1).font = { bold: true, size: 12 }; R++;
        ['日時', '型式', '指図番号', '報告項目', '内容', '報告者'].forEach((h, i) => {
            const c = ws.getRow(R).getCell(i + 1); c.value = h; c.font = { bold: true, size: 9 }; c.border = allBorder; c.fill = headerFill;
        });
        R++;
        complaintStats.complaints.forEach(d => {
            const dDate = new Date(getSafeTime(d.timestamp));
            const dateStr = isNaN(dDate.getTime()) ? '-' : dDate.toLocaleString();
            [dateStr, d.lot?.model || '', d.lot?.orderNo || '', d.stepInfo ? `${d.stepInfo.category} - ${d.stepInfo.title}` : '', d.label || '', d.workerName || ''].forEach((v, i) => {
                const c = ws.getRow(R).getCell(i + 1); c.value = v; c.border = allBorder; c.font = { size: 9 };
            });
            R++;
        });
        [20, 15, 15, 25, 35, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `不満気付き分析_${filterSuffix}.xlsx`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // --- PDF出力 ---
    const handleInterruptionPdf = (type) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert("ポップアップがブロックされました。ブラウザの設定で許可してください。"); return; }
        const stats = type === 'defect' ? defectStats : complaintStats;
        const title = type === 'defect' ? '不具合分析レポート' : '不満・気付きレポート';
        const color = type === 'defect' ? '#e11d48' : '#7c3aed';
        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
            body { font-family: "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif; padding: 20px; color: #1e293b; }
            h1 { color: ${color}; margin-bottom: 4px; } .period { color: #64748b; margin-bottom: 20px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; } th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-size: 12px; }
            th { background: #f1f5f9; font-weight: bold; } .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
            .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; } .stat-label { font-size: 12px; color: #64748b; font-weight: bold; } .stat-value { font-size: 24px; font-weight: 900; }
            .ranking-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px; }
            .ranking { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; } .ranking h3 { font-size: 13px; margin: 0 0 8px; }
            .ranking-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; } .ranking-count { color: ${color}; font-weight: bold; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style></head><body>`;
        html += `<h1>${title}</h1><p class="period">期間: ${filterLabel}</p>`;
        if (type === 'defect') {
            html += `<div class="stat-grid">
                <div class="stat-card"><div class="stat-label">完了ロット数</div><div class="stat-value">${stats.totalCompletedLots}</div></div>
                <div class="stat-card"><div class="stat-label">不具合発生ロット数</div><div class="stat-value" style="color:${color}">${stats.defectLotCount}</div></div>
                <div class="stat-card"><div class="stat-label">不具合発生率</div><div class="stat-value">${stats.defectRate}%</div></div>
                <div class="stat-card"><div class="stat-label">不具合総数</div><div class="stat-value">${stats.totalDefects}</div></div>
            </div>`;
            html += `<div class="ranking-grid">`;
            [{ t: '型式別 ワースト', d: stats.models }, { t: '項目別 ワースト', d: stats.steps }, { t: '原因工程別 ワースト', d: stats.processes }, { t: '報告者別', d: stats.workers }].forEach(({ t, d }) => {
                html += `<div class="ranking"><h3>${t}</h3>`;
                d.forEach(({ name, count }) => { html += `<div class="ranking-item"><span>${name}</span><span class="ranking-count">${count}件</span></div>`; });
                if (d.length === 0) html += `<div style="color:#94a3b8;font-size:12px">データなし</div>`;
                html += `</div>`;
            });
            html += `</div>`;
            html += `<h2 style="font-size:16px;margin-bottom:8px">報告履歴</h2><table><thead><tr><th>日時</th><th>型式/指図</th><th>報告項目</th><th>内容</th><th>原因工程</th><th>報告者</th></tr></thead><tbody>`;
            stats.defects.forEach(d => {
                const dDate = new Date(getSafeTime(d.timestamp));
                const dateStr = isNaN(dDate.getTime()) ? '-' : dDate.toLocaleString();
                html += `<tr><td>${dateStr}</td><td>${d.lot?.model || ''} ${d.lot?.orderNo || ''}</td><td>${d.stepInfo ? `${d.stepInfo.category} - ${d.stepInfo.title}` : ''}</td><td style="color:${color};font-weight:bold">${d.label || ''}</td><td>${d.causeProcess || ''}</td><td>${d.workerName || ''}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else {
            html += `<div class="stat-grid"><div class="stat-card"><div class="stat-label">報告総数</div><div class="stat-value" style="color:${color}">${stats.totalComplaints}</div></div></div>`;
            html += `<div class="ranking-grid">`;
            [{ t: '不満内容別 ワースト', d: stats.labels }, { t: '項目別 ワースト', d: stats.steps }, { t: '報告者別', d: stats.workers }].forEach(({ t, d }) => {
                html += `<div class="ranking"><h3>${t}</h3>`;
                d.forEach(({ name, count }) => { html += `<div class="ranking-item"><span>${name}</span><span class="ranking-count">${count}件</span></div>`; });
                if (d.length === 0) html += `<div style="color:#94a3b8;font-size:12px">データなし</div>`;
                html += `</div>`;
            });
            html += `</div>`;
            html += `<h2 style="font-size:16px;margin-bottom:8px">報告履歴</h2><table><thead><tr><th>日時</th><th>型式/指図</th><th>報告項目</th><th>内容</th><th>報告者</th></tr></thead><tbody>`;
            stats.complaints.forEach(d => {
                const dDate = new Date(getSafeTime(d.timestamp));
                const dateStr = isNaN(dDate.getTime()) ? '-' : dDate.toLocaleString();
                html += `<tr><td>${dateStr}</td><td>${d.lot?.model || ''} ${d.lot?.orderNo || ''}</td><td>${d.stepInfo ? `${d.stepInfo.category} - ${d.stepInfo.title}` : ''}</td><td style="color:${color};font-weight:bold">${d.label || ''}</td><td>${d.workerName || ''}</td></tr>`;
            });
            html += `</tbody></table>`;
        }
        html += `<script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }<\/script></body></html>`;
        printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-hidden">
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} confirmText={confirmModal.confirmText} confirmColor={confirmModal.confirmColor} />
            {editModal.isOpen && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditModal({ isOpen: false, type: null, data: null, lotId: null })}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-600">
                            <Pencil className="w-5 h-5" /> {editModal.type === 'defect' ? '不具合報告の編集' : '不満・気付きの編集'}
                        </h3>
                        {editModal.type === 'defect' && (defectProcessOptions || []).length > 0 && (
                            <div className="mb-4">
                                <div className="text-sm font-bold text-slate-700 mb-2">原因工程</div>
                                <div className="flex flex-wrap gap-2">
                                    {(defectProcessOptions || []).map(opt => (
                                        <button key={opt} onClick={() => setEditCauseProcess(editCauseProcess === opt ? '' : opt)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${editCauseProcess === opt ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50'}`}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="mb-4">
                            <div className="text-sm font-bold text-slate-700 mb-2">内容</div>
                            <textarea className="w-full border rounded p-3 h-28 text-sm" value={editLabel} onChange={e => setEditLabel(e.target.value)} />
                        </div>
                        {editModal.type === 'defect' && (
                            <div className="mb-4">
                                <div className="text-sm font-bold text-slate-700 mb-2">参考写真</div>
                                <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border rounded text-sm font-bold text-slate-600 transition-colors">
                                    <Camera className="w-4 h-4" /> 写真を追加
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleEditPhotoAdd} />
                                </label>
                                {editPhotos.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {editPhotos.map((photo, idx) => (
                                            <div key={idx} className="relative group">
                                                <img src={photo} className="w-16 h-16 object-cover rounded border" />
                                                <button onClick={() => setEditPhotos(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-80 hover:opacity-100">x</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditModal({ isOpen: false, type: null, data: null, lotId: null })} className="px-4 py-2 border rounded font-bold text-slate-600 hover:bg-slate-50">キャンセル</button>
                            <button onClick={saveEditInterruption} className="px-6 py-2 bg-blue-600 text-white rounded font-bold shadow hover:bg-blue-700">保存</button>
                        </div>
                    </div>
                </div>
            )}
            {expandedDefectImage && (
                <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col p-4 items-center justify-center cursor-pointer" onClick={() => setExpandedDefectImage(null)}>
                    <div className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors"><X className="w-10 h-10" /></div>
                    <div className="flex gap-4 flex-wrap justify-center items-center max-w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        {(Array.isArray(expandedDefectImage) ? expandedDefectImage : [expandedDefectImage]).map((src, idx) => (
                            <img key={idx} src={src} className="max-h-[80vh] max-w-[45vw] object-contain rounded-lg shadow-lg" />
                        ))}
                    </div>
                </div>
            )}
            <div className="flex justify-between mb-4 shrink-0 items-center">
                <h2 className="text-xl font-bold flex gap-2 items-center"><BarChart3 className="text-blue-600" /> 分析ダッシュボード</h2>
                <div className="flex gap-1 bg-slate-200 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('performance')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${activeTab === 'performance' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>日次実績</button>
                    <button onClick={() => setActiveTab('defects')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${activeTab === 'defects' ? 'bg-white shadow text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>不具合分析</button>
                    <button onClick={() => setActiveTab('complaints')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${activeTab === 'complaints' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>不満・改善提案</button>
                    <button onClick={() => setActiveTab('direct-indirect')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${activeTab === 'direct-indirect' ? 'bg-white shadow text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}>直間分析</button>
                    {currentUserName === '管理者' && <button onClick={() => setActiveTab('worker-eval')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${activeTab === 'worker-eval' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>作業者評価</button>}
                    <button onClick={() => setActiveTab('insights')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all flex items-center gap-1 ${activeTab === 'insights' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><Zap className="w-4 h-4" />工程改善・最適化</button>
                </div>
                <button onClick={() => {
                  const pw = window.open('', '_blank'); if (!pw) { alert('ポップアップブロック'); return; }
                  const now = new Date().toLocaleString('ja-JP');
                  let directTotal = 0, indirectTotal = 0; const catBreak = {};
                  lots.forEach(lot => { if (!lot.tasks) return; Object.values(lot.tasks).forEach(t => { if (t.duration > 0) directTotal += t.duration; }); });
                  indirectWork.forEach(w => { if (w.duration > 0) { indirectTotal += w.duration; catBreak[w.category] = (catBreak[w.category]||0) + w.duration; } });
                  const diR = (directTotal+indirectTotal) > 0 ? ((directTotal/(directTotal+indirectTotal))*100).toFixed(1) : '0';
                  const catRows = Object.entries(catBreak).sort((a,b)=>b[1]-a[1]).map(([c,s]) => `<tr><td>${c}</td><td style="text-align:right">${formatTime(s)}</td><td style="text-align:right">${(s/3600).toFixed(1)}h</td></tr>`).join('');
                  // 作業者別
                  const wBreak = {};
                  lots.forEach(lot => { if (!lot.tasks) return; Object.values(lot.tasks).forEach(t => { if (t.duration > 0 && t.workerName) { if (!wBreak[t.workerName]) wBreak[t.workerName] = {d:0,i:0}; wBreak[t.workerName].d += t.duration; } }); });
                  indirectWork.forEach(w => { if (w.duration > 0 && w.workerName) { if (!wBreak[w.workerName]) wBreak[w.workerName] = {d:0,i:0}; wBreak[w.workerName].i += w.duration; } });
                  const wRows = Object.entries(wBreak).map(([n,v]) => { const t=v.d+v.i; return `<tr><td>${n}</td><td style="text-align:right">${(v.d/3600).toFixed(1)}h</td><td style="text-align:right">${(v.i/3600).toFixed(1)}h</td><td style="text-align:right">${(t/3600).toFixed(1)}h</td><td style="text-align:right">${t>0?((v.d/t)*100).toFixed(0):'0'}%</td></tr>`; }).join('');
                  pw.document.write(`<!DOCTYPE html><html><head><title>分析レポート</title><style>@page{size:A4;margin:15mm}body{font-family:'Segoe UI',sans-serif;font-size:11px;color:#1e293b;max-width:210mm;margin:0 auto;padding:20px}h1{font-size:18px;border-bottom:3px solid #3b82f6;padding-bottom:8px}h2{font-size:14px;color:#3b82f6;margin-top:20px;border-left:4px solid #3b82f6;padding-left:8px}table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px}th{background:#1e293b;color:white;padding:6px 8px;text-align:left}td{padding:5px 8px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.kpi{border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}.kpi-val{font-size:24px;font-weight:900}.kpi-label{font-size:9px;color:#64748b}.footer{margin-top:20px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}@media print{body{padding:0}}</style></head><body>
                  <h1>📊 最終検査 分析レポート</h1><div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:16px"><span>出力日時: ${now}</span></div>
                  <div class="kpi-grid"><div class="kpi"><div class="kpi-val" style="color:#3b82f6">${(directTotal/3600).toFixed(1)}h</div><div class="kpi-label">直工合計</div></div><div class="kpi"><div class="kpi-val" style="color:#d97706">${(indirectTotal/3600).toFixed(1)}h</div><div class="kpi-label">間接合計</div></div><div class="kpi"><div class="kpi-val" style="color:#7c3aed">${diR}%</div><div class="kpi-label">直工比率</div></div><div class="kpi"><div class="kpi-val" style="color:#059669">${((directTotal+indirectTotal)/3600).toFixed(1)}h</div><div class="kpi-label">総作業時間</div></div></div>
                  <h2>直間比率</h2><div style="display:flex;height:24px;border-radius:6px;overflow:hidden;margin-bottom:8px"><div style="background:#3b82f6;width:${diR}%;height:100%"></div><div style="background:#d97706;width:${100-parseFloat(diR)}%;height:100%"></div></div>
                  ${catRows ? `<h2>間接作業 ジャンル別</h2><table><thead><tr><th>ジャンル</th><th style="text-align:right">時間</th><th style="text-align:right">h</th></tr></thead><tbody>${catRows}</tbody></table>` : ''}
                  ${wRows ? `<h2>作業者別 直間内訳</h2><table><thead><tr><th>作業者</th><th style="text-align:right">直工</th><th style="text-align:right">間接</th><th style="text-align:right">合計</th><th style="text-align:right">直工率</th></tr></thead><tbody>${wRows}</tbody></table>` : ''}
                  <div class="footer">最終検査Webアプリ — 分析レポート</div></body></html>`);
                  pw.document.close(); setTimeout(() => pw.print(), 500);
                }} className="px-3 py-1.5 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded flex items-center gap-1"><Printer className="w-3 h-3"/> PDF</button>
            </div>

            {activeTab === 'insights' && (
                <ProcessInsightsTab lots={lots} masterItems={masterItems} customTargetTimes={customTargetTimes} onSaveSettings={onSaveSettings} onSaveHistory={onSaveHistory} targetTimeHistory={targetTimeHistory} />
            )}

            {activeTab === 'performance' && (
                <div className="flex-1 overflow-y-auto flex flex-col min-h-0 pr-2">
                    <div className="flex justify-between mb-4 shrink-0 items-center mt-2">
                        <div className="font-bold text-slate-600 flex items-center gap-2"><History className="w-5 h-5" /> 指定日実績</div>
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                            <CalendarDays className="w-5 h-5 text-slate-500" />
                            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="font-bold text-slate-700 bg-transparent outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0">
                        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-blue-100 text-blue-600 rounded-full"><Package className="w-8 h-8" /></div>
                            <div><div className="text-sm font-bold text-slate-500">完了指図数 (件)</div><div className="text-3xl font-black text-slate-800">{String(dailyStats.orderCount)}</div></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-purple-100 text-purple-600 rounded-full"><Component className="w-8 h-8" /></div>
                            <div><div className="text-sm font-bold text-slate-500">完了台数 (台)</div><div className="text-3xl font-black text-slate-800">{String(dailyStats.unitCount)}</div></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full"><Clock className="w-8 h-8" /></div>
                            <div><div className="text-sm font-bold text-slate-500">作業時間合計</div><div className="text-3xl font-black text-slate-800">{formatTime(dailyStats.totalTime)}</div></div>
                        </div>
                    </div>

                    <div className="mb-2 text-sm font-bold text-slate-500 flex items-center gap-2"><AlertOctagon className="w-4 h-4" /> 現在の納期リスク状況 (未完了)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 shrink-0">
                        <div className="bg-rose-50 p-6 rounded-xl border border-rose-200 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-rose-200 text-rose-700 rounded-full"><AlertTriangle className="w-8 h-8" /></div>
                            <div>
                                <div className="text-sm font-bold text-rose-600">納期遅れ (Overdue)</div>
                                <div className="text-3xl font-black text-rose-800">{riskStats.overdueCount} <span className="text-base font-normal">件</span></div>
                                <div className="text-xs text-rose-500 mt-1">※本日以前の納期で未完了</div>
                            </div>
                        </div>
                        <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-amber-200 text-amber-700 rounded-full"><Clock className="w-8 h-8" /></div>
                            <div>
                                <div className="text-sm font-bold text-amber-600">期限間近 (今日・明日)</div>
                                <div className="text-3xl font-black text-amber-800">{riskStats.dueSoonCount} <span className="text-base font-normal">件</span></div>
                                <div className="text-xs text-amber-500 mt-1">※今日・明日納期の未完了</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[20rem]">
                        <div className="bg-slate-50 p-4 border-b font-bold text-slate-700 flex items-center gap-2 shrink-0">
                            <Users className="w-5 h-5" /> {filterDate} の作業者別パフォーマンス
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                                    <tr className="border-b text-sm text-slate-500">
                                        <th className="p-4 font-bold">作業者 / エリア</th>
                                        <th className="p-4 font-bold text-right">完了件数</th>
                                        <th className="p-4 font-bold text-right">完了台数</th>
                                        <th className="p-4 font-bold text-right">作業時間</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyStats.workers.length > 0 ? dailyStats.workers.map((s, idx) => (
                                        <tr key={idx} className="border-b hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-bold flex items-center gap-2">{idx === 0 && <Award className="w-5 h-5 text-amber-500" />}{s.workerName}</td>
                                            <td className="p-4 text-right font-mono font-bold text-blue-600">{s.orderCount}</td>
                                            <td className="p-4 text-right font-mono font-bold text-purple-600">{s.unitCount}</td>
                                            <td className="p-4 text-right font-mono">{formatTime(s.totalTime)}</td>
                                        </tr>
                                    )) : (<tr><td colSpan="4" className="p-8 text-center text-slate-400">指定日の完了データはありません</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'defects' && (
                <div className="flex-1 overflow-y-auto flex flex-col min-h-0 pr-2">
                    <div className="flex justify-between mb-4 shrink-0 items-center mt-2 flex-wrap gap-2">
                        <div className="font-bold text-slate-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> 不具合集計</div>
                        {renderFilterUI()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 shrink-0">
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <div className="text-sm font-bold text-slate-500 mb-2">完了ロット数 (月間)</div>
                            <div className="text-3xl font-black text-slate-800">{defectStats.totalCompletedLots} <span className="text-base font-normal">件</span></div>
                        </div>
                        <div className="bg-rose-50 border-rose-200 p-6 rounded-xl border shadow-sm">
                            <div className="text-sm font-bold text-rose-600 mb-2">不具合発生ロット数</div>
                            <div className="text-3xl font-black text-rose-700">{defectStats.defectLotCount} <span className="text-base font-normal">件</span></div>
                        </div>
                        <div className="bg-amber-50 border-amber-200 p-6 rounded-xl border shadow-sm">
                            <div className="text-sm font-bold text-amber-600 mb-2">ロット不具合発生率</div>
                            <div className="text-3xl font-black text-amber-700">{defectStats.defectRate} <span className="text-base font-normal">%</span></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <div className="text-sm font-bold text-slate-500 mb-2">報告された不具合総数</div>
                            <div className="text-3xl font-black text-slate-700">{defectStats.totalDefects} <span className="text-base font-normal">件</span></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6 shrink-0">
                        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col h-64">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Package className="w-4 h-4" /> 型式別 ワースト</h3>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {defectStats.models.map((m, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span className="font-bold text-sm text-slate-800 truncate pr-2">{m.name}</span>
                                        <span className="text-rose-600 font-bold bg-rose-100 px-2 py-0.5 rounded text-xs shrink-0">{m.count}件</span>
                                    </div>
                                ))}
                                {defectStats.models.length === 0 && <div className="text-center text-slate-400 text-sm mt-4">データなし</div>}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col h-64">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> 項目別 ワースト</h3>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {defectStats.steps.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span className="font-bold text-xs text-slate-800 truncate pr-2" title={s.name}>{s.name}</span>
                                        <span className="text-rose-600 font-bold bg-rose-100 px-2 py-0.5 rounded text-xs shrink-0">{s.count}件</span>
                                    </div>
                                ))}
                                {defectStats.steps.length === 0 && <div className="text-center text-slate-400 text-sm mt-4">データなし</div>}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col h-64">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 原因工程別 ワースト</h3>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {defectStats.processes.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span className="font-bold text-sm text-slate-800 truncate pr-2">{p.name}</span>
                                        <span className="text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded text-xs shrink-0">{p.count}件</span>
                                    </div>
                                ))}
                                {defectStats.processes.length === 0 && <div className="text-center text-slate-400 text-sm mt-4">データなし</div>}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col h-64">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><User className="w-4 h-4" /> 報告者別</h3>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {defectStats.workers.map((w, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span className="font-bold text-sm text-slate-800 truncate pr-2">{w.name}</span>
                                        <span className="text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded text-xs shrink-0">{w.count}件</span>
                                    </div>
                                ))}
                                {defectStats.workers.length === 0 && <div className="text-center text-slate-400 text-sm mt-4">データなし</div>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border flex-1 flex flex-col min-h-[15rem] overflow-hidden">
                        <div className="p-4 border-b font-bold text-slate-700 bg-slate-50 shrink-0 flex justify-between items-center">
                            <span>報告履歴</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => downloadInterruptionCSV(defectStats.defects, 'defects')} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"><Download className="w-4 h-4" /> CSV</button>
                                <button onClick={handleDefectExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
                                <button onClick={() => handleInterruptionPdf('defect')} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"><Printer className="w-4 h-4" /> PDF</button>
                            </div>
                        </div>
                        <div className="overflow-y-auto p-0 flex-1">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 text-slate-500">
                                    <tr className="border-b">
                                        <th className="p-3 font-bold">日時</th>
                                        <th className="p-3 font-bold">型式 / 指図</th>
                                        <th className="p-3 font-bold">報告項目</th>
                                        <th className="p-3 font-bold">内容</th>
                                        <th className="p-3 font-bold">原因工程</th>
                                        <th className="p-3 font-bold">写真</th>
                                        <th className="p-3 font-bold">報告者</th>
                                        <th className="p-3 font-bold text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {defectStats.defects.map((d, i) => (
                                        <tr key={i} className="border-b hover:bg-rose-50 transition-colors">
                                            <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                                                {(() => {
                                                    const dDate = new Date(getSafeTime(d.timestamp));
                                                    return isNaN(dDate.getTime()) ? '-' : dDate.toLocaleString();
                                                })()}
                                            </td>
                                            <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{String(d.lot?.model || '')} <span className="text-xs text-slate-400 ml-1 font-normal">{String(d.lot?.orderNo || '')}</span></td>
                                            <td className="p-3 text-xs max-w-xs truncate">
                                                {d.stepInfo ? (
                                                    <><span className="bg-slate-100 border px-1 rounded mr-1 font-normal">{String(d.stepInfo.category || '')}</span> <span title={String(d.stepInfo.title || '')}>{String(d.stepInfo.title || '')}</span></>
                                                ) : <span className="text-slate-400">全体 / 特定項目なし</span>}
                                            </td>
                                            <td className="p-3 text-rose-600 font-bold whitespace-pre-wrap">{String(d.label || '')}</td>
                                            <td className="p-3 text-xs font-bold whitespace-nowrap">{d.causeProcess ? <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{d.causeProcess}</span> : <span className="text-slate-300">-</span>}</td>
                                            <td className="p-3 text-center">
                                                {d.photos && d.photos.length > 0 ? (
                                                    <button onClick={() => setExpandedDefectImage(d.photos)} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold hover:bg-blue-200 transition-colors" title="写真を表示">
                                                        {d.photos.length}枚
                                                    </button>
                                                ) : <span className="text-slate-300 text-xs">-</span>}
                                            </td>
                                            <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{String(d.workerName || '')}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => triggerEditInterruption(d, d.lot.id, 'defect')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="編集"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => triggerDeleteInterruption(d.id, d.lot.id, '不具合報告')} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="削除"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {defectStats.defects.length === 0 && (
                                        <tr><td colSpan="8" className="p-8 text-center text-slate-400">不具合報告はありません</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'complaints' && (
                <div className="flex-1 overflow-y-auto flex flex-col min-h-0 pr-2">
                    <div className="flex justify-between mb-4 shrink-0 items-center mt-2 flex-wrap gap-2">
                        <div className="font-bold text-slate-600 flex items-center gap-2"><Megaphone className="w-5 h-5 text-purple-600" /> 不満・気付き集計</div>
                        {renderFilterUI()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0">
                        <div className="bg-purple-50 border-purple-200 p-6 rounded-xl border shadow-sm">
                            <div className="text-sm font-bold text-purple-600 mb-2">報告された不満・気付き総数</div>
                            <div className="text-3xl font-black text-purple-700">{complaintStats.totalComplaints} <span className="text-base font-normal">件</span></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 shrink-0">
                        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col h-64">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Megaphone className="w-4 h-4" /> 不満内容別 ワースト</h3>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {complaintStats.labels.map((m, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span className="font-bold text-sm text-slate-800 truncate pr-2" title={m.name}>{m.name}</span>
                                        <span className="text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded text-xs shrink-0">{m.count}件</span>
                                    </div>
                                ))}
                                {complaintStats.labels.length === 0 && <div className="text-center text-slate-400 text-sm mt-4">データなし</div>}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col h-64">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> 項目別 ワースト</h3>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {complaintStats.steps.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span className="font-bold text-xs text-slate-800 truncate pr-2" title={s.name}>{s.name}</span>
                                        <span className="text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded text-xs shrink-0">{s.count}件</span>
                                    </div>
                                ))}
                                {complaintStats.steps.length === 0 && <div className="text-center text-slate-400 text-sm mt-4">データなし</div>}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col h-64">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><User className="w-4 h-4" /> 報告者別</h3>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {complaintStats.workers.map((w, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span className="font-bold text-sm text-slate-800 truncate pr-2">{w.name}</span>
                                        <span className="text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded text-xs shrink-0">{w.count}件</span>
                                    </div>
                                ))}
                                {complaintStats.workers.length === 0 && <div className="text-center text-slate-400 text-sm mt-4">データなし</div>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border flex-1 flex flex-col min-h-[15rem] overflow-hidden">
                        <div className="p-4 border-b font-bold text-slate-700 bg-slate-50 shrink-0 flex justify-between items-center">
                            <span>不満・気付き 報告履歴</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => downloadInterruptionCSV(complaintStats.complaints, 'complaints')} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"><Download className="w-4 h-4" /> CSV</button>
                                <button onClick={handleComplaintExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
                                <button onClick={() => handleInterruptionPdf('complaint')} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"><Printer className="w-4 h-4" /> PDF</button>
                            </div>
                        </div>
                        <div className="overflow-y-auto p-0 flex-1">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 text-slate-500">
                                    <tr className="border-b">
                                        <th className="p-3 font-bold">日時</th>
                                        <th className="p-3 font-bold">型式 / 指図</th>
                                        <th className="p-3 font-bold">報告項目</th>
                                        <th className="p-3 font-bold">内容</th>
                                        <th className="p-3 font-bold">報告者</th>
                                        <th className="p-3 font-bold text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {complaintStats.complaints.map((d, i) => (
                                        <tr key={i} className="border-b hover:bg-purple-50 transition-colors">
                                            <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                                                {(() => {
                                                    const dDate = new Date(getSafeTime(d.timestamp));
                                                    return isNaN(dDate.getTime()) ? '-' : dDate.toLocaleString();
                                                })()}
                                            </td>
                                            <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{String(d.lot?.model || '')} <span className="text-xs text-slate-400 ml-1 font-normal">{String(d.lot?.orderNo || '')}</span></td>
                                            <td className="p-3 text-xs max-w-xs truncate">
                                                {d.stepInfo ? (
                                                    <><span className="bg-slate-100 border px-1 rounded mr-1 font-normal">{String(d.stepInfo.category || '')}</span> <span title={String(d.stepInfo.title || '')}>{String(d.stepInfo.title || '')}</span></>
                                                ) : <span className="text-slate-400">全体 / 特定項目なし</span>}
                                            </td>
                                            <td className="p-3 text-purple-700 font-bold whitespace-pre-wrap">{String(d.label || '')}</td>
                                            <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{String(d.workerName || '')}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => triggerEditInterruption(d, d.lot.id, 'complaint')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="編集"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => triggerDeleteInterruption(d.id, d.lot.id, '不満・気付き')} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="削除"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {complaintStats.complaints.length === 0 && (
                                        <tr><td colSpan="6" className="p-8 text-center text-slate-400">報告はありません</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'direct-indirect' && (() => {
              const wDirect = {}, wIndirect = {}, catTotals = {};
              lots.forEach(lot => { if (!lot.tasks) return; Object.values(lot.tasks).forEach(t => { if (t.duration > 0 && t.workerName) { wDirect[t.workerName] = (wDirect[t.workerName]||0) + t.duration; } }); });
              indirectWork.forEach(w => { if (w.duration > 0 && w.workerName) { wIndirect[w.workerName] = (wIndirect[w.workerName]||0) + w.duration; catTotals[w.category] = (catTotals[w.category]||0) + w.duration; } });
              const allN = [...new Set([...Object.keys(wDirect), ...Object.keys(wIndirect)])];
              const tD = Object.values(wDirect).reduce((a,b) => a+b, 0), tI = Object.values(wIndirect).reduce((a,b) => a+b, 0);
              const tAll = tD + tI, dR = tAll > 0 ? (tD/tAll)*100 : 0;
              const catE = Object.entries(catTotals).sort((a,b) => b[1]-a[1]); const maxC = catE.length > 0 ? catE[0][1] : 1;
              return (<div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-white rounded-xl border shadow-sm p-5"><h3 className="font-bold text-slate-800 mb-3">全体の直間比率</h3>
                  <div className="flex h-10 rounded-lg overflow-hidden mb-3">{tD > 0 && <div className="bg-blue-500 flex items-center justify-center text-white text-sm font-bold" style={{width:`${dR}%`}}>直工 {dR.toFixed(0)}%</div>}{tI > 0 && <div className="bg-amber-500 flex items-center justify-center text-white text-sm font-bold" style={{width:`${100-dR}%`}}>間接 {(100-dR).toFixed(0)}%</div>}{tAll===0 && <div className="bg-slate-200 flex-1 flex items-center justify-center text-slate-400">データなし</div>}</div>
                  <div className="grid grid-cols-3 gap-3 text-center"><div className="bg-blue-50 rounded-lg p-2"><div className="text-xs text-blue-500 font-bold">直工</div><div className="text-lg font-black text-blue-700 font-mono">{(tD/3600).toFixed(1)}h</div></div><div className="bg-amber-50 rounded-lg p-2"><div className="text-xs text-amber-500 font-bold">間接</div><div className="text-lg font-black text-amber-700 font-mono">{(tI/3600).toFixed(1)}h</div></div><div className="bg-purple-50 rounded-lg p-2"><div className="text-xs text-purple-500 font-bold">直工比率</div><div className="text-lg font-black text-purple-700 font-mono">{dR.toFixed(1)}%</div></div></div>
                </div>
                <div className="bg-white rounded-xl border shadow-sm p-5"><h3 className="font-bold text-slate-800 mb-3">間接作業 ジャンル別</h3>
                  {catE.length > 0 ? catE.map(([c,s]) => <div key={c} className="flex items-center gap-2 mb-2"><span className="text-xs font-bold text-slate-600 w-16 text-right shrink-0">{c}</span><div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden"><div className="h-full bg-amber-500 rounded-full flex items-center pl-2" style={{width:`${(s/maxC)*100}%`}}><span className="text-[10px] text-white font-bold">{formatTime(s)}</span></div></div><span className="text-xs text-slate-400 w-12 text-right font-mono">{(s/3600).toFixed(1)}h</span></div>) : <div className="text-center text-slate-400 py-4">データなし</div>}
                </div>
                <div className="bg-white rounded-xl border shadow-sm p-5"><h3 className="font-bold text-slate-800 mb-3">作業者別 直間比率</h3>
                  {allN.map(n => { const d=wDirect[n]||0, ind=wIndirect[n]||0, t=d+ind, r=t>0?(d/t)*100:0; return <div key={n} className="mb-3"><div className="flex justify-between text-xs mb-1"><span className="font-bold">{n}</span><span className="text-slate-400">直工{r.toFixed(0)}% / 合計{(t/3600).toFixed(2)}h</span></div><div className="flex h-5 rounded overflow-hidden">{d>0&&<div className="bg-blue-500" style={{width:`${r}%`}}/>}{ind>0&&<div className="bg-amber-500" style={{width:`${100-r}%`}}/>}</div></div>; })}
                  {allN.length === 0 && <div className="text-center text-slate-400 py-4">データなし</div>}
                </div>
              </div>);
            })()}

            {activeTab === 'worker-eval' && (() => {
                const completedLots = lots.filter(l => l.status === 'completed');
                // 全作業者名を集める
                const allWorkerNames = new Set();
                completedLots.forEach(lot => {
                    Object.values(lot.tasks || {}).forEach(t => { if (t.workerName) allWorkerNames.add(t.workerName); });
                });

                const workerStats = [...allWorkerNames].map(name => {
                    let totalTasks = 0, completedTasks = 0, totalDuration = 0, championCount = 0, bestTimeCount = 0;
                    let ngCount = 0, reworkTime = 0;
                    const stepTimes = {};

                    completedLots.forEach(lot => {
                        const tasks = lot.tasks || {};
                        const steps = lot.steps || [];
                        steps.forEach((step, sIdx) => {
                            const stepKey = `${lot.model}-${step.title}`;
                            if (!stepTimes[stepKey]) stepTimes[stepKey] = [];
                            for (let u = 0; u < (lot.quantity || 1); u++) {
                                const task = tasks[`${step.id}-${u}`] || tasks[`${sIdx}-${u}`];
                                if (!task || task.workerName !== name) continue;
                                totalTasks++;
                                if (task.status === 'completed' || task.status === 'ng' || task.status === 'skipped') completedTasks++;
                                totalDuration += task.duration || 0;
                                if (task.duration > 0) stepTimes[stepKey].push(task.duration);
                                if (task.reworks?.length > 0) {
                                    ngCount += 1;
                                    reworkTime += (task.reworks || []).reduce((a, r) => a + (r.duration || 0), 0);
                                }
                            }
                        });
                        // チャンピオンタイム（目標以下）
                        const lotTime = (lot.totalWorkTime || 0) / 1000;
                        const targetKey = `${lot.model}-${lot.templateId || ''}`;
                        const target = customTargetTimes?.[targetKey];
                        if (target && lotTime > 0 && lotTime <= target) championCount++;
                    });

                    // 最速工程数
                    Object.entries(stepTimes).forEach(([key, times]) => {
                        if (times.length === 0) return;
                        const myBest = Math.min(...times);
                        let globalBest = myBest;
                        completedLots.forEach(l => {
                            const t = l.tasks || {};
                            (l.steps || []).forEach((step, sI) => {
                                const sk = `${l.model}-${step.title}`;
                                if (sk !== key) return;
                                for (let u = 0; u < (l.quantity || 1); u++) {
                                    const dur = (t[`${step.id}-${u}`] || t[`${sI}-${u}`])?.duration;
                                    if (dur && dur > 0) globalBest = Math.min(globalBest, dur);
                                }
                            });
                        });
                        if (myBest <= globalBest && myBest > 0) bestTimeCount++;
                    });

                    const avgTime = completedTasks > 0 ? totalDuration / completedTasks : 0;
                    const speedScore = Math.min(50, avgTime > 0 ? Math.max(0, 50 - (avgTime / 60) * 3) : 0);
                    const championBonus = Math.min(30, championCount * 5 + bestTimeCount * 3);
                    const qualityScore = Math.min(20, ngCount * 5);
                    const totalScore = Math.round(Math.max(0, speedScore + championBonus + qualityScore));

                    return { name, totalTasks, completedTasks, avgTime, totalDuration, championCount, bestTimeCount, ngCount, reworkTime, totalScore, speedScore, championBonus, qualityScore };
                }).sort((a, b) => b.totalScore - a.totalScore);

                const medalLabels = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

                return (
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workerStats.map((w, idx) => (
                                <div key={w.name} className={`bg-white rounded-xl shadow-sm border-2 p-5 ${idx === 0 ? 'border-amber-400 ring-2 ring-amber-100' : idx === 1 ? 'border-slate-300' : idx === 2 ? 'border-orange-300' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="text-3xl">{idx < 3 ? medalLabels[idx] : `#${idx+1}`}</div>
                                        <div className="flex-1">
                                            <div className="font-black text-lg text-slate-800">{w.name}</div>
                                            <div className="text-xs text-slate-500">{w.completedTasks}タスク完了</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-3xl font-black ${idx === 0 ? 'text-amber-500' : 'text-blue-600'}`}>{w.totalScore}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">総合スコア</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 w-16">速度</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-3"><div className="h-full bg-blue-500 rounded-full" style={{width: `${(w.speedScore/50)*100}%`}}/></div>
                                            <span className="text-xs font-mono font-bold w-8 text-right">{Math.round(w.speedScore)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 w-16">最速</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-3"><div className="h-full bg-amber-500 rounded-full" style={{width: `${(w.championBonus/30)*100}%`}}/></div>
                                            <span className="text-xs font-mono font-bold w-8 text-right">{Math.round(w.championBonus)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 w-16">品質発見</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-3"><div className="h-full bg-rose-500 rounded-full" style={{width: `${(w.qualityScore/20)*100}%`}}/></div>
                                            <span className="text-xs font-mono font-bold w-8 text-right">{Math.round(w.qualityScore)}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-blue-50 p-2 rounded-lg"><div className="text-blue-500 font-bold">平均作業時間</div><div className="font-black text-blue-700 text-lg">{formatTime(Math.round(w.avgTime))}</div></div>
                                        <div className="bg-amber-50 p-2 rounded-lg"><div className="text-amber-500 font-bold">チャンピオン</div><div className="font-black text-amber-700 text-lg">{w.championCount}回</div><div className="text-amber-500">最速{w.bestTimeCount}工程</div></div>
                                        <div className="bg-rose-50 p-2 rounded-lg"><div className="text-rose-500 font-bold">NG発見</div><div className="font-black text-rose-700 text-lg">{w.ngCount}件</div></div>
                                        <div className="bg-orange-50 p-2 rounded-lg"><div className="text-orange-500 font-bold">修正作業</div><div className="font-black text-orange-700 text-lg">{formatTime(w.reworkTime)}</div></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {workerStats.length === 0 && <div className="text-center py-20 text-slate-400">評価データがありません（完了済みロットが必要です）</div>}
                        <div className="bg-slate-50 rounded-xl p-4 border">
                            <div className="text-sm font-bold text-slate-700 mb-2">評価基準</div>
                            <div className="grid grid-cols-3 gap-3 text-xs text-slate-600">
                                <div><span className="font-bold text-blue-600">作業速度 (50点)</span><br/>1タスクの平均所要時間が短いほど高得点</div>
                                <div><span className="font-bold text-amber-600">最速記録 (30点)</span><br/>目標タイム達成 + 全作業者中の最速工程数</div>
                                <div><span className="font-bold text-rose-600">品質発見力 (20点)</span><br/>NG判定を多く見つけるほど高得点</div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

const EditTimeModal = ({ lot, onClose, onSave }) => {
    const [localTasks, setLocalTasks] = useState(() => JSON.parse(JSON.stringify(lot.tasks || {})));

    const handleDurationChange = (key, value) => {
        const val = parseInt(value, 10);
        if (!isNaN(val) && val >= 0) {
            setLocalTasks(prev => ({
                ...prev,
                [key]: { ...prev[key], duration: val }
            }));
        }
    };

    const handleSave = () => {
        onSave({ tasks: localTasks });
        onClose();
    };

    const taskKeys = Object.keys(localTasks).filter(k => localTasks[k].status === 'completed' || localTasks[k].status === 'skipped');

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b bg-slate-50 font-bold flex justify-between items-center">
                    <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" /> 作業時間の編集: {lot.orderNo}</div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="text-sm text-slate-500 mb-2">各項目の作業時間（秒）を修正できます。</div>
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-100 border-b">
                                <th className="p-2 font-bold">項目</th>
                                <th className="p-2 font-bold">ユニット</th>
                                <th className="p-2 font-bold w-32 text-right">時間(秒)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taskKeys.map(key => {
                                const [stepIdOrIdx, unitIdxStr] = key.split('-');
                                const step = lot.steps.find(s => s.id === stepIdOrIdx) || lot.steps[parseInt(stepIdOrIdx)];
                                const title = step ? step.title : '不明な項目';
                                const unitNo = lot.unitSerialNumbers?.[unitIdxStr] || `#${parseInt(unitIdxStr) + 1}`;
                                const isSkipped = localTasks[key].status === 'skipped';
                                return (
                                    <tr key={key} className="border-b">
                                        <td className="p-2 truncate max-w-[200px]" title={title}>{title}</td>
                                        <td className="p-2 font-mono text-slate-600">{unitNo}</td>
                                        <td className="p-2 text-right">
                                            {isSkipped ? (
                                                <span className="text-slate-400 text-xs">該当なし</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    value={localTasks[key].duration || 0}
                                                    onChange={(e) => handleDurationChange(key, e.target.value)}
                                                    className="w-20 border rounded p-1 text-right font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                                    min="0"
                                                />
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {taskKeys.length === 0 && <tr><td colSpan="3" className="p-4 text-center text-slate-500">編集可能なタスクがありません</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold border rounded hover:bg-white">キャンセル</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700">保存して更新</button>
                </div>
            </div>
        </div>
    );
};

const HistoryView = ({ lots, workers, onDelete, onEdit, onSaveLot }) => {
    const completedLots = lots.filter(l => l.location === 'completed');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null });
    const [reportLot, setReportLot] = useState(null);
    const [viewMode, setViewMode] = useState('grid');

    const getTodayStr = () => {
        const d = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const [filterStartDate, setFilterStartDate] = useState(getTodayStr());
    const [filterEndDate, setFilterEndDate] = useState(getTodayStr());
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTimeLot, setEditingTimeLot] = useState(null);

    const triggerDelete = (id) => {
        setConfirmModal({ isOpen: true, title: '削除確認', message: '履歴を削除しますか？', confirmColor: 'bg-red-600', confirmText: '削除', action: () => { onDelete(id); setConfirmModal(p => ({ ...p, isOpen: false })); } });
    };

    const filteredCompletedLots = useMemo(() => {
        let start = 0;
        let end = Infinity;
        if (filterStartDate) {
            start = new Date(filterStartDate).getTime();
        }
        if (filterEndDate) {
            const endDate = new Date(filterEndDate);
            endDate.setHours(23, 59, 59, 999);
            end = endDate.getTime();
        }
        const lowerQuery = searchQuery.toLowerCase();
        return completedLots.filter(lot => {
            const completedAt = getSafeTime(lot.completedAt || lot.updatedAt);
            const inDate = completedAt >= start && completedAt <= end;
            const matchSearch = !searchQuery ||
                (lot.orderNo && lot.orderNo.toLowerCase().includes(lowerQuery)) ||
                (lot.model && lot.model.toLowerCase().includes(lowerQuery));
            return inDate && matchSearch;
        });
    }, [completedLots, filterStartDate, filterEndDate, searchQuery]);

    const sortedCompletedLots = useMemo(() => {
        return [...filteredCompletedLots].sort((a, b) => {
            return getSafeTime(b.completedAt || b.updatedAt) - getSafeTime(a.completedAt || a.updatedAt);
        });
    }, [filteredCompletedLots]);

    const downloadCSV = () => {
        const headers = ['完了日時', '型式', '指図番号', 'ユニットNo', '対象部位', 'カテゴリ', '検査項目', '結果', '作業者', '実績時間(秒)', '目標時間(秒)', '達成率(%)', '備考'];
        const rows = [];
        sortedCompletedLots.forEach(lot => {
            const d = new Date(getSafeTime(lot.completedAt || lot.updatedAt));
            const dateStr = isNaN(d.getTime()) ? '-' : d.toLocaleString();
            lot.steps.forEach((step, sIdx) => {
                for (let i = 0; i < lot.quantity; i++) {
                    const task = lot.tasks?.[`${step.id}-${i}`] || lot.tasks?.[`${sIdx}-${i}`];
                    if (task?.status === 'completed' || task?.status === 'skipped') {
                        const eff = task.duration > 0 ? Math.round(((step.targetTime || 60) / task.duration) * 100) : 0;
                        const wName = workers.find(w => w.id === task.workerId)?.name || task.workerName || '-';
                        const partLabel = step.targetPart === 'main' ? '本体' : step.targetPart === 'tail' ? 'テール' : '共通';
                        const unitSerial = lot.unitSerialNumbers?.[i] || `#${i + 1}`;
                        const result = task.status === 'completed' ? 'OK' : 'N/A';
                        rows.push([dateStr, lot.model, lot.orderNo, unitSerial, partLabel, step.category, step.title, result, wName, task.duration || 0, step.targetTime || 60, eff, ''].join(','));
                    }
                }
            });
        });
        const blob = new Blob(["\uFEFF" + headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `history_${Date.now()}.csv`; link.click();
    };

    const handleHistoryCsvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split(/\r\n|\n/).map(row => row.split(','));
            if (rows.length < 2) {
                alert("CSVのデータがありません。");
                return;
            }

            const headers = rows[0].map(h => h.replace(/^"|"$/g, '').trim());
            // BOM除去 (もしあれば)
            if (headers[0] && headers[0].charCodeAt(0) === 0xFEFF) {
                headers[0] = headers[0].substring(1);
            }

            const idxOrderNo = headers.indexOf('指図番号');
            const idxUnitNo = headers.indexOf('ユニットNo');
            const idxCategory = headers.indexOf('カテゴリ');
            const idxTitle = headers.indexOf('検査項目');
            const idxResult = headers.indexOf('結果');
            const idxWorker = headers.indexOf('作業者');
            const idxDuration = headers.indexOf('実績時間(秒)');

            if (idxOrderNo === -1 || idxUnitNo === -1 || idxTitle === -1) {
                alert("CSVの形式が正しくありません。必須の列（指図番号、ユニットNo、検査項目）が見つかりません。Excelで編集した場合は「UTF-8(CSV)」形式で保存してください。");
                return;
            }

            const updates = {};

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < headers.length) continue;

                const getVal = (idx) => idx !== -1 && row[idx] ? row[idx].replace(/^"|"$/g, '').trim() : '';

                const orderNo = getVal(idxOrderNo);
                const unitNo = getVal(idxUnitNo);
                const category = getVal(idxCategory);
                const title = getVal(idxTitle);
                const result = getVal(idxResult);
                const workerName = getVal(idxWorker);
                const duration = parseInt(getVal(idxDuration), 10) || 0;

                if (!orderNo || !unitNo || !title) continue;

                // 対象ロットを探す (完了済みのロットから)
                const lot = completedLots.find(l => l.orderNo === orderNo);
                if (!lot) continue;

                const lotId = lot.id;
                if (!updates[lotId]) {
                    updates[lotId] = { tasks: JSON.parse(JSON.stringify(lot.tasks || {})) };
                }

                // 検査項目を探す
                const stepIndex = lot.steps.findIndex(s => s.title === title && (category ? s.category === category : true));
                if (stepIndex === -1) continue;
                const step = lot.steps[stepIndex];

                // ユニットのインデックスを探す
                let unitIdx = -1;
                if (lot.unitSerialNumbers && lot.unitSerialNumbers.length > 0) {
                    unitIdx = lot.unitSerialNumbers.indexOf(unitNo);
                }
                if (unitIdx === -1 && unitNo.startsWith('#')) {
                    unitIdx = parseInt(unitNo.substring(1), 10) - 1;
                }
                if (unitIdx === -1 || unitIdx >= lot.quantity) continue;

                // タスクを更新
                const taskKey1 = `${step.id}-${unitIdx}`;
                const taskKey2 = `${stepIndex}-${unitIdx}`;

                const existingTask = updates[lotId].tasks[taskKey1] || updates[lotId].tasks[taskKey2];
                const actualKey = updates[lotId].tasks[taskKey1] ? taskKey1 : (updates[lotId].tasks[taskKey2] ? taskKey2 : taskKey1);

                updates[lotId].tasks[actualKey] = {
                    ...(existingTask || { startTime: null }),
                    status: result === 'OK' ? 'completed' : (result === 'N/A' ? 'skipped' : 'waiting'),
                    duration: duration,
                    workerName: workerName !== '-' ? workerName : (existingTask?.workerName || '')
                };
            }

            const updateLotIds = Object.keys(updates);
            if (updateLotIds.length === 0) {
                alert("更新対象のデータが見つかりませんでした。");
                return;
            }

            if (confirm(`${updateLotIds.length}件のロットの実績を更新します。よろしいですか？`)) {
                for (const lotId of updateLotIds) {
                    await onSaveLot(lotId, { tasks: updates[lotId].tasks });
                }
                alert("更新が完了しました。");
            }

            // ファイル入力をリセット
            e.target.value = '';
        };
        // UTF-8 で読み込む (ダウンロード出力がUTF-8(BOM付き)のため)
        reader.readAsText(file);
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-hidden">
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))} confirmColor={confirmModal.confirmColor} confirmText={confirmModal.confirmText} />
            {reportLot && <ReportModal lot={reportLot} onClose={() => setReportLot(null)} />}

            <div className="flex flex-wrap justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-200 shrink-0 gap-2 mb-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-xl font-bold text-slate-800 ml-2">
                        <CheckSquare className="text-blue-600" /> 完了履歴
                    </div>
                    <div className="h-6 w-px bg-slate-300 mx-2 hidden md:block"></div>
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border">
                        <CalendarDays className="w-4 h-4 text-slate-500 ml-1" />
                        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" />
                        <span className="text-slate-400">~</span>
                        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" />
                    </div>
                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border shadow-sm">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="指図・型式で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-sm outline-none w-32 md:w-48 font-bold text-slate-700"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 rounded p-1">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="グリッド表示"><LayoutGrid className="w-5 h-5" /></button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="リスト表示"><List className="w-5 h-5" /></button>
                    </div>
                    <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 transition-colors text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm">
                        <Upload className="w-4 h-4" /> CSV取込
                        <input type="file" accept=".csv" className="hidden" onChange={handleHistoryCsvUpload} />
                    </label>
                    <button onClick={downloadCSV} className="bg-slate-800 hover:bg-slate-700 transition-colors text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm"><Download className="w-4 h-4" /> CSV出力</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start pb-10">
                        {sortedCompletedLots.map(lot => (
                            <div key={lot.id} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-2 h-auto hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="font-bold text-lg text-slate-800 break-all">{lot.model}</div>
                                    <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => setReportLot(lot)} className="p-1.5 border rounded hover:bg-green-50 text-green-600 transition-colors" title="成績表作成"><Printer className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingTimeLot(lot)} className="p-1.5 border rounded hover:bg-amber-50 text-amber-600 transition-colors" title="作業時間編集"><Clock className="w-4 h-4" /></button>
                                        <button onClick={() => onEdit(lot)} className="p-1.5 border rounded hover:bg-blue-50 transition-colors" title="詳細編集"><Pencil className="w-4 h-4 text-slate-500" /></button>
                                        <button onClick={() => triggerDelete(lot.id)} className="p-1.5 border rounded hover:bg-rose-50 transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-600">指図: <span className="font-bold">{lot.orderNo}</span> | <span className="bg-slate-100 px-1.5 rounded">{lot.quantity}台</span></div>
                                <div className="text-xs text-slate-400 mt-auto pt-3 border-t">
                                    {(() => {
                                        const d = new Date(getSafeTime(lot.completedAt || lot.updatedAt));
                                        return isNaN(d.getTime()) ? '-' : d.toLocaleString();
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs text-slate-500 uppercase">
                                <tr>
                                    <th className="p-3 font-bold border-b">完了日時</th>
                                    <th className="p-3 font-bold border-b">指図番号</th>
                                    <th className="p-3 font-bold border-b">型式</th>
                                    <th className="p-3 font-bold border-b text-center">台数</th>
                                    <th className="p-3 font-bold border-b hidden md:table-cell">機番</th>
                                    <th className="p-3 font-bold border-b text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {sortedCompletedLots.map(lot => (
                                    <tr key={lot.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 text-slate-500 text-xs whitespace-nowrap">
                                            {(() => {
                                                const d = new Date(getSafeTime(lot.completedAt || lot.updatedAt));
                                                return isNaN(d.getTime()) ? '-' : d.toLocaleString();
                                            })()}
                                        </td>
                                        <td className="p-3 font-bold text-slate-800">{lot.orderNo}</td>
                                        <td className="p-3 font-bold text-slate-700">{lot.model}</td>
                                        <td className="p-3 text-center"><span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs">{lot.quantity}台</span></td>
                                        <td className="p-3 text-xs text-slate-500 hidden md:table-cell truncate max-w-[200px]" title={lot.unitSerialNumbers?.join(', ')}>
                                            {lot.unitSerialNumbers?.join(', ') || '-'}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button onClick={() => setReportLot(lot)} className="p-1.5 border rounded hover:bg-green-50 text-green-600 bg-white transition-colors" title="成績表作成"><Printer className="w-4 h-4" /></button>
                                                <button onClick={() => setEditingTimeLot(lot)} className="p-1.5 border rounded hover:bg-amber-50 text-amber-600 bg-white transition-colors" title="作業時間編集"><Clock className="w-4 h-4" /></button>
                                                <button onClick={() => onEdit(lot)} className="p-1.5 border rounded hover:bg-blue-50 text-slate-500 bg-white transition-colors" title="詳細編集"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => triggerDelete(lot.id)} className="p-1.5 border rounded hover:bg-rose-50 text-rose-500 bg-white transition-colors" title="削除"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {sortedCompletedLots.length === 0 && (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">表示するデータがありません</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {editingTimeLot && (
                <EditTimeModal
                    lot={editingTimeLot}
                    onClose={() => setEditingTimeLot(null)}
                    onSave={(data) => onSaveLot(editingTimeLot.id, data)}
                />
            )}
        </div>
    );
};

const FinalInspectionModal = ({ lot, onClose, onSave, onFinish, mapZones, onCreateZone, workers, complaintOptions, defectProcessOptions, packagingPhotoTopics, defectHistory }) => {
    const [tasks, setTasks] = useState(() => {
        const initialTasks = { ...lot.tasks };
        lot.steps.forEach((step, idx) => {
            for (let i = 0; i < lot.quantity; i++) {
                const oldKey = `${idx}-${i}`;
                const newKey = `${step.id}-${i}`;
                if (initialTasks[oldKey] && !initialTasks[newKey]) {
                    initialTasks[newKey] = initialTasks[oldKey];
                }
            }
        });
        return initialTasks;
    });
    const [interruptions, setInterruptions] = useState(lot.interruptions || []);
    const [currentView, setCurrentView] = useState('loading');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedStepId, setSelectedStepId] = useState(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [activePart, setActivePart] = useState('main'); // 'main' or 'tail'
    const [showPackagingPhotoModal, setShowPackagingPhotoModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showDefectHistoryPanel, setShowDefectHistoryPanel] = useState(false);

    const [inputCount, setInputCount] = useState(lot.quantity);

    const currentZone = mapZones.find(z => z.id === lot.mapZoneId);
    const isPersonalZone = currentZone?.isPersonal;
    const [selectedWorkerName, setSelectedWorkerName] = useState(null);

    const [isEditingMode, setIsEditingMode] = useState(false);
    const [editingStepData, setEditingStepData] = useState(null);
    const [showDefectModal, setShowDefectModal] = useState(false);
    const [defectLabel, setDefectLabel] = useState('');
    const [defectCauseProcess, setDefectCauseProcess] = useState('');
    const [defectPhotos, setDefectPhotos] = useState([]);

    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [complaintLabel, setComplaintLabel] = useState('');
    const [complaintText, setComplaintText] = useState('');

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null, color: 'bg-blue-600' });
    const [showPdf, setShowPdf] = useState(null);
    const [expandedImage, setExpandedImage] = useState(null);
    const [stepViewMode, setStepViewMode] = useState('grid');

    // --- 変更: AI自動判定用のリッチなステート管理 ---
    const [aiAnalysisState, setAiAnalysisState] = useState({
        isOpen: false,
        status: 'idle', // 'analyzing', 'result', 'error'
        imageUrl: null,
        expectedModel: '',
        expectedSerial: '',
        unitIdx: null,
        result: null
    });

    // --- Voice Assistant State ---
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const [voiceBarOpen, setVoiceBarOpen] = useState(false);
    const [voiceLogs, setVoiceLogs] = useState([]);
    const [interimText, setInterimText] = useState('');
    const [isListeningNow, setIsListeningNow] = useState(false);
    const [voiceError, setVoiceError] = useState('');
    const voiceActiveRef = useRef(false);
    const voiceRunningRef = useRef(false);
    const tasksRef_fi = useRef(tasks);
    useEffect(() => { tasksRef_fi.current = tasks; }, [tasks]);

    const addVoiceLog_fi = (type, text) => {
      const icon = type === 'user' ? '🎤' : '🔊';
      setVoiceLogs(prev => [...prev.slice(-19), { type, text: `${icon} ${text}`, time: Date.now() }]);
    };

    const speakWithLog_fi = (text, options) => {
      addVoiceLog_fi('assistant', text);
      speak_fi(text, null, options);
    };

    const speakAsyncWithLog_fi = async (text, options) => {
      addVoiceLog_fi('assistant', text);
      await speakAsync_fi(text, options);
    };

    const listenOnceWithLog_fi = async (options = {}) => {
      const result = await listenOnce_fi({
        ...options,
        onInterim: (t) => { setInterimText(t); },
        onListening: () => { setIsListeningNow(true); },
        onError: (e) => { setVoiceError(e); setTimeout(() => setVoiceError(''), 5000); },
      });
      setIsListeningNow(false);
      setInterimText('');
      if (result) addVoiceLog_fi('user', result);
      return result;
    };

    const listContainerRef = useRef(null);
    const listScrollRef = useRef(0);

    const workerOptions = useMemo(() => {
        return mapZones.filter(z => z.isPersonal).map(z => z.name);
    }, [mapZones]);

    const isDetail = currentView === 'detail' && selectedStepId;
    console.log('[DEBUG-FB] FinalInspectionModal Render:', { currentView, selectedStepId, isDetail });

    useEffect(() => {
        console.log('[DEBUG-FB] isPersonalZone useEffect ran:', { isPersonalZone, currentZoneName: currentZone?.name });
        if (isPersonalZone) {
            setSelectedWorkerName(currentZone.name);
            setCurrentView('list');
        } else {
            setCurrentView('worker_select');
        }
    }, [isPersonalZone, currentZone]);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedStepId) {
            const step = lot.steps.find(s => s.id === selectedStepId);
            setInputCount(step?.defaultCount || lot.quantity);
        }
    }, [selectedStepId, lot.steps, lot.quantity]);

    const visibleSteps = useMemo(() => {
        return lot.steps.filter(s => !s.targetPart || s.targetPart === 'both' || s.targetPart === activePart);
    }, [lot.steps, activePart]);

    const categories = useMemo(() => {
        const existingCats = new Set(visibleSteps.map(s => s.category));
        return INSPECTION_CATEGORIES.filter(c => existingCats.has(c)).concat(
            Array.from(existingCats).filter(c => !INSPECTION_CATEGORIES.includes(c))
        );
    }, [visibleSteps]);

    useEffect(() => {
        if (categories.length > 0 && (!selectedCategory || !categories.includes(selectedCategory))) {
            setSelectedCategory(categories[0]);
        }
    }, [categories, selectedCategory]);

    useEffect(() => {
        if (currentView === 'list' && listContainerRef.current) {
            listContainerRef.current.scrollTop = listScrollRef.current;
        }
    }, [currentView]);

    const progressStats = useMemo(() => {
        const total = lot.steps.length * lot.quantity;
        const done = Object.values(tasks).filter(t => t.status === 'completed' || t.status === 'skipped').length;
        return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
    }, [tasks, lot.steps, lot.quantity]);

    const summaryData = useMemo(() => {
        const executedSteps = lot.steps.map((step, idx) => {
            let doneCount = 0;
            let skippedCount = 0;
            let totalTime = 0;
            for (let i = 0; i < lot.quantity; i++) {
                const task = tasks[`${step.id}-${i}`] || lot.tasks?.[`${idx}-${i}`];
                if (task?.status === 'completed') {
                    doneCount++;
                    totalTime += (task.duration || 0);
                } else if (task?.status === 'skipped') {
                    skippedCount++;
                }
            }
            if (doneCount === 0 && skippedCount === 0) return null;
            const targetTotal = (step.targetTime || 60) * doneCount;
            const efficiency = totalTime > 0 ? Math.round((targetTotal / totalTime) * 100) : 0;
            return { ...step, doneCount, skippedCount, totalTime, targetTotal, efficiency };
        }).filter(Boolean);

        const totalActiveTime = executedSteps.reduce((acc, s) => acc + s.totalTime, 0);

        const incompleteSteps = lot.steps.filter((step, idx) => {
            if (!lot.hasTail && step.targetPart === 'tail') return false;

            for (let i = 0; i < lot.quantity; i++) {
                const task = tasks[`${step.id}-${i}`] || lot.tasks?.[`${idx}-${i}`];
                if (!task || (task.status !== 'completed' && task.status !== 'skipped')) {
                    return true;
                }
            }
            return false;
        });

        return { executedSteps, totalActiveTime, incompleteSteps };
    }, [lot.steps, tasks, lot.quantity, activePart]);

    const handleWorkerSelect = (name) => {
        setSelectedWorkerName(name);
        setCurrentView('list');
    };

    const getWorkerNameForSave = () => {
        return selectedWorkerName;
    };

    const [completedTaskMenu, setCompletedTaskMenu] = useState(null); // { key, stepId, unitIdx }

    const toggleTaskStatus = (stepId, unitIdx) => {
        const workerName = getWorkerNameForSave();
        if (!workerName) {
            alert("作業者を選択してください。");
            return;
        }
        const key = `${stepId}-${unitIdx}`;
        const currentTask = tasks[key] || { status: 'waiting', duration: 0 };
        let newTask = { ...currentTask };
        const now = Date.now();

        if (currentTask.status === 'completed' || currentTask.status === 'ng') {
            // 完了済み/NG → ポップアップメニュー表示
            setCompletedTaskMenu({ key, stepId, unitIdx });
            return;
        }
        if (currentTask.status === 'reworking') {
            // 修正作業中 → 修正完了 → completedに戻す
            const dur = currentTask.reworkStartTime ? Math.floor((now - currentTask.reworkStartTime) / 1000) : 0;
            const reworks = [...(currentTask.reworks || [])];
            reworks[reworks.length - 1] = { ...reworks[reworks.length - 1], duration: dur, endTime: now };
            newTask = { ...currentTask, status: 'completed', reworkStartTime: null, reworks };
            const newTasks = { ...tasks, [key]: newTask };
            setTasks(newTasks);
            onSave({ tasks: newTasks, status: 'processing', workStartTime: lot.workStartTime || now });
            return;
        }

        if (currentTask.status === 'waiting' || currentTask.status === 'paused' || currentTask.status === 'skipped') {
            newTask = { ...currentTask, status: 'processing', startTime: now, workerName };
        } else if (currentTask.status === 'processing') {
            const addedDuration = currentTask.startTime ? Math.floor((now - currentTask.startTime) / 1000) : 0;
            newTask = { ...currentTask, status: 'completed', duration: (currentTask.duration || 0) + addedDuration, startTime: null, workerName };
        }
        const newTasks = { ...tasks, [key]: newTask };
        setTasks(newTasks);
        onSave({ tasks: newTasks, status: 'processing', workStartTime: lot.workStartTime || now });
    };

    // 完了タスクメニューのアクション
    const handleTaskMenuAction = (action, directKey = null) => {
        const key = directKey || completedTaskMenu?.key;
        if (!key) return;
        const now = Date.now();
        const newTasks = { ...tasks };
        const currentTask = tasks[key] || {};
        const workerName = getWorkerNameForSave() || currentTask.workerName;

        if (action === 'continue') {
            newTasks[key] = { ...currentTask, status: 'processing', startTime: now, workerName };
        } else if (action === 'restart') {
            newTasks[key] = { status: 'processing', duration: 0, startTime: now, workerName, reworks: currentTask.reworks };
        } else if (action === 'ng') {
            newTasks[key] = { ...currentTask, status: 'ng', ngAt: now, reworks: currentTask.reworks || [], workerName };
        } else if (action === 'rework') {
            const reworks = [...(currentTask.reworks || []), { startTime: now, duration: 0, round: (currentTask.reworks?.length || 0) + 1 }];
            newTasks[key] = { ...currentTask, status: 'reworking', reworkStartTime: now, reworks, workerName };
        }
        setTasks(newTasks);
        onSave({ tasks: newTasks, status: 'processing', workStartTime: lot.workStartTime || now });
        setCompletedTaskMenu(null);
    };

    const toggleTaskSkipped = (stepId, unitIdx) => {
        const workerName = getWorkerNameForSave();
        if (!workerName) {
            alert("作業者を選択してください。");
            return;
        }
        const key = `${stepId}-${unitIdx}`;
        const currentTask = tasks[key] || { status: 'waiting', duration: 0 };

        let newTask;
        if (currentTask.status === 'skipped') {
            newTask = { status: 'waiting', duration: 0, startTime: null };
        } else {
            newTask = { ...currentTask, status: 'skipped', startTime: null, workerName };
            if (currentTask.status === 'processing') {
                const now = Date.now();
                const addedDuration = currentTask.startTime ? Math.floor((now - currentTask.startTime) / 1000) : 0;
                newTask.duration = (currentTask.duration || 0) + addedDuration;
            }
        }
        const newTasks = { ...tasks, [key]: newTask };
        setTasks(newTasks);
        onSave({ tasks: newTasks });
    };

    const batchStart = (stepId) => {
        const workerName = getWorkerNameForSave();
        if (!workerName) {
            alert("作業者を選択してください。");
            return;
        }
        const newTasks = { ...tasks };
        const now = Date.now();
        for (let i = 0; i < lot.quantity; i++) {
            const key = `${stepId}-${i}`;
            const current = newTasks[key] || { status: 'waiting', duration: 0 };
            if (current.status !== 'completed' && current.status !== 'processing' && current.status !== 'skipped') {
                newTasks[key] = { ...current, status: 'processing', startTime: now, workerName };
            }
        }
        setTasks(newTasks);
        onSave({ tasks: newTasks, status: 'processing', workStartTime: lot.workStartTime || now });
    };

    const batchComplete = (stepId, targetTime, closeView = false) => {
        const workerName = getWorkerNameForSave();
        if (!workerName) {
            alert("作業者を選択してください。");
            return;
        }
        const newTasks = { ...tasks };
        const now = Date.now();
        for (let i = 0; i < lot.quantity; i++) {
            const key = `${stepId}-${i}`;
            const current = newTasks[key] || { status: 'waiting', duration: 0 };

            if (current.status === 'skipped') continue;

            if (current.status === 'processing') {
                const added = current.startTime ? Math.floor((now - current.startTime) / 1000) : 0;
                newTasks[key] = { ...current, status: 'completed', duration: (current.duration || 0) + added, startTime: null, workerName };
            } else if (current.status === 'waiting') {
                newTasks[key] = { ...current, status: 'completed', duration: targetTime || 0, startTime: null, workerName };
            } else if (current.status === 'paused') {
                newTasks[key] = { ...current, status: 'completed', duration: (current.duration || 0), startTime: null, workerName };
            }
        }
        setTasks(newTasks);
        onSave({ tasks: newTasks, status: 'processing' });

        if (closeView) {
            setCurrentView('list');
        }
    };

    const batchCompleteCategory = () => {
        const workerName = getWorkerNameForSave();
        if (!workerName) {
            alert("作業者を選択してください。");
            return;
        }
        const newTasks = { ...tasks };
        const now = Date.now();
        let updated = false;

        visibleSteps.forEach(step => {
            if (step.category !== selectedCategory) return;

            for (let i = 0; i < lot.quantity; i++) {
                const key = `${step.id}-${i}`;
                const current = newTasks[key] || { status: 'waiting', duration: 0 };

                if (current.status !== 'completed' && current.status !== 'skipped') {
                    if (current.status === 'processing') {
                        const added = current.startTime ? Math.floor((now - current.startTime) / 1000) : 0;
                        newTasks[key] = { ...current, status: 'completed', duration: (current.duration || 0) + added, startTime: null, workerName };
                    } else {
                        newTasks[key] = { ...current, status: 'completed', duration: step.targetTime || 0, startTime: null, workerName };
                    }
                    updated = true;
                }
            }
        });

        if (updated) {
            setTasks(newTasks);
            onSave({ tasks: newTasks, status: 'processing', workStartTime: lot.workStartTime || now });
        }
    };

    const batchSkip = (stepId, closeView = false) => {
        const workerName = getWorkerNameForSave();
        if (!workerName) {
            alert("作業者を選択してください。");
            return;
        }
        const newTasks = { ...tasks };
        const now = Date.now();
        for (let i = 0; i < lot.quantity; i++) {
            const key = `${stepId}-${i}`;
            const current = newTasks[key] || { status: 'waiting', duration: 0 };

            if (current.status === 'processing') {
                const added = current.startTime ? Math.floor((now - current.startTime) / 1000) : 0;
                newTasks[key] = { ...current, status: 'skipped', duration: (current.duration || 0) + added, startTime: null, workerName };
            } else {
                newTasks[key] = { ...current, status: 'skipped', startTime: null, workerName };
            }
        }
        setTasks(newTasks);
        onSave({ tasks: newTasks });

        if (closeView) {
            setCurrentView('list');
        }
    };

    const batchReset = (stepId) => {
        const newTasks = { ...tasks };
        for (let i = 0; i < lot.quantity; i++) {
            const key = `${stepId}-${i}`;
            newTasks[key] = { status: 'waiting', duration: 0 };
        }
        setTasks(newTasks);
        onSave({ tasks: newTasks });
    };

    const handleBatchPause = () => {
        const now = Date.now();
        const newTasks = { ...tasks };
        let updated = false;

        Object.keys(newTasks).forEach(key => {
            const task = newTasks[key];
            if (task.status === 'processing') {
                const added = task.startTime ? Math.floor((now - task.startTime) / 1000) : 0;
                newTasks[key] = {
                    ...task,
                    status: 'paused',
                    duration: (task.duration || 0) + added,
                    startTime: null
                };
                updated = true;
            }
        });

        if (updated) {
            setTasks(newTasks);
            onSave({ tasks: newTasks, status: 'processing' });
        }
    };

    const handleBatchResume = () => {
        const now = Date.now();
        const newTasks = { ...tasks };
        let updated = false;

        Object.keys(newTasks).forEach(key => {
            const task = newTasks[key];
            if (task.status === 'paused') {
                newTasks[key] = {
                    ...task,
                    status: 'processing',
                    startTime: now
                };
                updated = true;
            }
        });

        if (updated) {
            setTasks(newTasks);
            onSave({ tasks: newTasks, status: 'processing' });
        }
    };

    // --- Voice Guided Flow ---
    const voiceGuideStepRef = useRef(null); // current step index in visibleSteps for voice
    const lastVoiceActionRef = useRef(null); // for cancel/undo

    const toggleVoice = () => {
      const newVal = !voiceEnabled;
      setVoiceEnabled(newVal);
      voiceActiveRef.current = newVal;
      if (newVal) {
        unlockTTSForIOS_fi();
        setVoiceBarOpen(true);
        speakWithLog_fi('音声アシスタントON。項目を順番に読み上げます');
        // Start guided flow from current category's first incomplete step
        setTimeout(() => runVoiceGuidedFlow(), 500);
      } else {
        window.speechSynthesis?.cancel();
        stopIOSResumeFix_fi();
        voiceRunningRef.current = false;
        setVoiceStatus('');
        addVoiceLog_fi('assistant', '音声アシスタントOFF');
      }
    };

    // Find next incomplete step from given index
    const findNextIncompleteStep = (fromIdx) => {
      for (let i = fromIdx; i < visibleSteps.length; i++) {
        const s = visibleSteps[i];
        const allDone = Array.from({ length: lot.quantity }, (_, u) => {
          const t = tasksRef_fi.current[`${s.id}-${u}`];
          return t && (t.status === 'completed' || t.status === 'skipped');
        }).every(Boolean);
        if (!allDone) return i;
      }
      return -1; // all complete
    };

    // Find previous incomplete step
    const findPrevIncompleteStep = (fromIdx) => {
      for (let i = fromIdx; i >= 0; i--) {
        const s = visibleSteps[i];
        const allDone = Array.from({ length: lot.quantity }, (_, u) => {
          const t = tasksRef_fi.current[`${s.id}-${u}`];
          return t && (t.status === 'completed' || t.status === 'skipped');
        }).every(Boolean);
        if (!allDone) return i;
      }
      return -1;
    };

    const runVoiceGuidedFlow = async () => {
      if (voiceRunningRef.current) return;
      voiceRunningRef.current = true;
      try {
        // Find first incomplete step
        let stepIdx = findNextIncompleteStep(0);
        if (stepIdx < 0) {
          await speakAsyncWithLog_fi('全項目が完了しています');
          voiceRunningRef.current = false;
          return;
        }
        voiceGuideStepRef.current = stepIdx;

        while (voiceActiveRef.current && stepIdx >= 0 && stepIdx < visibleSteps.length) {
          const currentStep = visibleSteps[stepIdx];
          voiceGuideStepRef.current = stepIdx;

          // Navigate UI to this step
          setSelectedCategory(currentStep.category);
          setSelectedStepId(currentStep.id);
          setCurrentView('detail');

          // Check if already all done
          const allDone = Array.from({ length: lot.quantity }, (_, u) => {
            const t = tasksRef_fi.current[`${currentStep.id}-${u}`];
            return t && (t.status === 'completed' || t.status === 'skipped');
          }).every(Boolean);

          if (allDone) {
            // Skip completed items
            stepIdx = findNextIncompleteStep(stepIdx + 1);
            if (stepIdx < 0) {
              await speakAsyncWithLog_fi('全項目が完了しました');
              break;
            }
            continue;
          }

          // Announce: "カテゴリ、項目名"
          const isCount = currentStep.checkType === 'count';
          const announcement = isCount
            ? `${currentStep.category}、${currentStep.title}。数量を言ってください`
            : `${currentStep.category}、${currentStep.title}`;
          await speakAsyncWithLog_fi(announcement);

          if (!voiceActiveRef.current) break;

          // Listen loop for this step
          const helpText = isCount
            ? '🎤 数値 / スキップ / 戻る / 中断'
            : '🎤 開始 / OK(完了) / N番開始 / N番OK / スキップ / 次 / 戻る / 中断';
          setVoiceStatus(helpText);

          let moveDirection = 0; // 0=stay, 1=next, -1=back
          while (voiceActiveRef.current && moveDirection === 0) {
            const cmd = await listenOnceWithLog_fi({ timeout: 15000 });
            if (!voiceActiveRef.current) break;
            if (!cmd) continue;

            const norm = normalizeVoiceText_fi(cmd);

            // Category jump
            const jumpCat = parseCategoryJump_fi(norm, categories);
            if (jumpCat) {
              const jumpIdx = visibleSteps.findIndex(s => s.category === jumpCat);
              if (jumpIdx >= 0) {
                await speakAsyncWithLog_fi(`${jumpCat}に移動します`);
                stepIdx = jumpIdx;
                moveDirection = 99; // jump
                break;
              }
            }

            // Unit-specific command: "1番目開始", "2番OK"
            const unitCmd = parseUnitCmd_fi(norm);
            if (unitCmd && !isCount) {
              const uIdx = unitCmd.unit - 1;
              if (uIdx >= 0 && uIdx < lot.quantity) {
                const key = `${currentStep.id}-${uIdx}`;
                if (unitCmd.type === 'start') {
                  toggleTaskStatus(currentStep.id, uIdx);
                  await speakAsyncWithLog_fi(`${unitCmd.unit}番目、開始`);
                } else if (unitCmd.type === 'complete') {
                  // If waiting, start then complete; if processing, complete
                  const cur = tasksRef_fi.current[key];
                  if (!cur || cur.status === 'waiting') {
                    toggleTaskStatus(currentStep.id, uIdx); // start
                    setTimeout(() => toggleTaskStatus(currentStep.id, uIdx), 100); // complete
                  } else if (cur.status === 'processing') {
                    toggleTaskStatus(currentStep.id, uIdx);
                  }
                  await speakAsyncWithLog_fi(`${unitCmd.unit}番目、完了`);
                  lastVoiceActionRef.current = { type: 'unitComplete', stepId: currentStep.id, unitIdx: uIdx };
                }
                // Check if all done after unit action
                setTimeout(() => {
                  const allNowDone = Array.from({ length: lot.quantity }, (_, u) => {
                    const t = tasksRef_fi.current[`${currentStep.id}-${u}`];
                    return t && (t.status === 'completed' || t.status === 'skipped');
                  }).every(Boolean);
                  if (allNowDone) setVoiceStatus('🎤 全台完了。「次」で次項目へ');
                }, 200);
              }
              continue;
            }

            // "開始" → batch start
            if (matchStart_fi(norm)) {
              batchStart(currentStep.id);
              lastVoiceActionRef.current = { type: 'batchStart', stepId: currentStep.id };
              await speakAsyncWithLog_fi('まとめて開始しました');
              continue;
            }

            // "OK" / "完了" → batch start (if not started) then batch complete
            if (matchOK_fi(norm)) {
              // waiting状態なら先にstartして経過時間を記録
              const anyWaiting = Array.from({ length: lot.quantity }, (_, u) => {
                const t = tasksRef_fi.current[`${currentStep.id}-${u}`];
                return !t || t.status === 'waiting';
              }).some(Boolean);
              if (anyWaiting) batchStart(currentStep.id);
              batchComplete(currentStep.id, currentStep.targetTime);
              lastVoiceActionRef.current = { type: 'batchComplete', stepId: currentStep.id };
              await speakAsyncWithLog_fi('完了しました');
              // Auto-advance to next
              stepIdx = findNextIncompleteStep(stepIdx + 1);
              if (stepIdx < 0) {
                await speakAsyncWithLog_fi('全項目が完了しました');
              }
              moveDirection = 99; // jump to new stepIdx
              break;
            }

            // "NG"
            if (matchNG_fi(norm)) {
              await speakAsyncWithLog_fi('不具合報告を開きます');
              setShowDefectModal(true);
              continue;
            }

            // "次" → move to next step (start + advance)
            if (matchNext_fi(norm)) {
              // If not started yet, batch start + batch complete
              const anyProcessing = Array.from({ length: lot.quantity }, (_, u) => {
                const t = tasksRef_fi.current[`${currentStep.id}-${u}`];
                return t && t.status === 'processing';
              }).some(Boolean);
              if (!anyProcessing) {
                // Not started - just advance without completing
              }
              stepIdx = findNextIncompleteStep(stepIdx + 1);
              if (stepIdx < 0) {
                // Try from beginning
                stepIdx = findNextIncompleteStep(0);
                if (stepIdx < 0) {
                  await speakAsyncWithLog_fi('全項目が完了しました');
                }
              }
              moveDirection = 99;
              break;
            }

            // "戻る"
            if (matchBack_fi(norm)) {
              stepIdx = stepIdx > 0 ? stepIdx - 1 : 0;
              moveDirection = 99;
              break;
            }

            // "スキップ" / "該当なし"
            if (matchSkip_fi(norm)) {
              batchSkip(currentStep.id);
              lastVoiceActionRef.current = { type: 'batchSkip', stepId: currentStep.id };
              await speakAsyncWithLog_fi('スキップしました');
              stepIdx = findNextIncompleteStep(stepIdx + 1);
              if (stepIdx < 0) {
                await speakAsyncWithLog_fi('全項目が完了しました');
              }
              moveDirection = 99;
              break;
            }

            // "キャンセル" → undo last action
            if (matchCancel_fi(norm)) {
              const last = lastVoiceActionRef.current;
              if (last) {
                if (last.type === 'batchComplete' || last.type === 'batchSkip') {
                  batchReset(last.stepId);
                  await speakAsyncWithLog_fi('取り消しました');
                  // Go back to that step
                  const resetIdx = visibleSteps.findIndex(s => s.id === last.stepId);
                  if (resetIdx >= 0) stepIdx = resetIdx;
                  moveDirection = 99;
                  break;
                } else if (last.type === 'batchStart') {
                  batchReset(last.stepId);
                  await speakAsyncWithLog_fi('開始を取り消しました');
                }
                lastVoiceActionRef.current = null;
              } else {
                await speakAsyncWithLog_fi('取り消す操作がありません');
              }
              continue;
            }

            // "中断"
            if (matchStop_fi(norm)) {
              handleBatchPause();
              await speakAsyncWithLog_fi('中断しました');
              voiceActiveRef.current = false;
              setVoiceEnabled(false);
              break;
            }

            // Count type: try parse number
            if (isCount) {
              const num = parseInt(norm);
              if (!isNaN(num) && num > 0) {
                setInputCount(num);
                // Complete count step
                batchComplete(currentStep.id, currentStep.targetTime);
                lastVoiceActionRef.current = { type: 'batchComplete', stepId: currentStep.id };
                await speakAsyncWithLog_fi(`${num}個、確認完了`);
                stepIdx = findNextIncompleteStep(stepIdx + 1);
                if (stepIdx < 0) await speakAsyncWithLog_fi('全項目が完了しました');
                moveDirection = 99;
                break;
              }
            }

            // Unrecognized
            setVoiceStatus(helpText);
          }

          if (moveDirection === 99) {
            moveDirection = 0;
            if (stepIdx < 0) break; // all done
            continue;
          }
          if (!voiceActiveRef.current) break;
        }
      } finally {
        voiceRunningRef.current = false;
        setVoiceStatus('');
      }
    };

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        voiceActiveRef.current = false;
        voiceRunningRef.current = false;
        window.speechSynthesis?.cancel();
        stopIOSResumeFix_fi();
      };
    }, []);

    const step = isDetail ? lot.steps.find(s => s.id === selectedStepId) : null;

    const reportDefect = () => {
        if (!defectLabel) return;
        const workerName = getWorkerNameForSave() || '不明';
        const stepInfo = step ? { stepId: step.id, category: step.category, title: step.title } : null;

        const defectEntry = {
            id: generateId(),
            type: 'defect',
            label: defectLabel,
            timestamp: Date.now(),
            workerName,
            stepInfo
        };
        if (defectCauseProcess) defectEntry.causeProcess = defectCauseProcess;
        if (defectPhotos.length > 0) defectEntry.photos = defectPhotos;

        const newInt = [...interruptions, defectEntry];
        setInterruptions(newInt);
        onSave({ interruptions: newInt });
        setShowDefectModal(false);
        setDefectLabel('');
        setDefectCauseProcess('');
        setDefectPhotos([]);
    };

    const handleDefectPhotoAdd = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setDefectPhotos(prev => [...prev, ev.target.result]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const reportComplaint = () => {
        if (!complaintLabel && !complaintText) return;
        const workerName = getWorkerNameForSave() || '不明';
        const stepInfo = step ? { stepId: step.id, category: step.category, title: step.title } : null;

        const finalLabel = [complaintLabel, complaintText].filter(Boolean).join(' : ');

        const newInt = [...interruptions, {
            id: generateId(),
            type: 'complaint',
            label: finalLabel,
            timestamp: Date.now(),
            workerName,
            stepInfo
        }];
        setInterruptions(newInt);
        onSave({ interruptions: newInt });
        setShowComplaintModal(false);
        setComplaintLabel('');
        setComplaintText('');
    };

    const handleShowSummary = () => setCurrentView('summary');

    // --- 変更: Gemini APIのプロンプトとスキーマを更新（座標取得を追加） ---
    const analyzeImageWithGemini = async (base64Image, expectedModel, expectedSerial) => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
        if (!apiKey) {
            throw new Error("Gemini APIキーが設定されていません。\nプロジェクト直下の .env ファイルに VITE_GEMINI_API_KEY=あなたのAPIキー を設定し、開発サーバーを再起動してください。");
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const base64Data = base64Image.split(',')[1];
        const mimeType = base64Image.split(';')[0].split(':')[1];

        const prompt = `この画像は製品の銘板または現品のラベルです。
画像内のテキストを読み取り、指定された「型式」と「機番」が両方とも含まれているか確認してください。

期待する型式: ${expectedModel}
期待する機番: ${expectedSerial}

以下のJSONスキーマに従って結果を返してください。
- match: 期待する型式と機番が両方とも含まれている場合はtrue、そうでない場合はfalse
- extractedText: 読み取った主要なテキスト
- recognizedModel: 画像から読み取った「型式」の文字列（見つからない場合は空文字）
- recognizedSerial: 画像から読み取った「機番」の文字列（見つからない場合は空文字）
- reason: 判定理由（どの部分が一致したか、または何が見つからなかったか）`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64Data } }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        match: { type: "BOOLEAN" },
                        extractedText: { type: "STRING" },
                        recognizedModel: { type: "STRING" },
                        recognizedSerial: { type: "STRING" },
                        reason: { type: "STRING" }
                    }
                }
            }
        };

        let delay = 1000;
        for (let i = 0; i < 5; i++) {
            try {
                const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (response.ok) {
                    const result = await response.json();
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    return JSON.parse(text);
                }
                if (response.status !== 429 && response.status < 500) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (e) {
                if (i === 4) throw e;
            }
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    };


    // 画像の左下にAIの認識したテキストを直接書き込む関数
    const drawResultTextOnImage = (base64Img, result) => new Promise((resolve) => {
        if (!result || (!result.recognizedModel && !result.recognizedSerial)) {
            resolve(base64Img);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const fontSize = Math.max(16, Math.round(img.width / 35));
            ctx.font = `bold ${fontSize}px sans-serif`;

            const statusText = result.match ? '【一致OK】' : '【不一致NG】';
            const text = `${statusText} 型式:${result.recognizedModel || '不明'} / 機番:${result.recognizedSerial || '不明'}`;
            const padding = fontSize * 0.8;
            const textWidth = ctx.measureText(text).width;
            const textHeight = fontSize;

            // 画像の左下に背景付きでテキストを描画
            const gap = 10;
            const x = gap;
            const y = img.height - gap - textHeight - padding * 2;
            const w = textWidth + padding * 2;
            const h = textHeight + padding * 2;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(x, y, w, h);

            ctx.fillStyle = result.match ? '#4ade80' : '#f87171'; // OK = green, NG = red
            ctx.textBaseline = 'top';
            ctx.fillText(text, x + padding, y + padding);

            resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.src = base64Img;
    });

    const handleCameraCapture = async (e, unitIdx) => {
        const file = e.target.files[0];
        if (!file) return;

        const workerName = getWorkerNameForSave();
        if (!workerName) {
            alert("先に担当者を選択してください。");
            return;
        }

        const expectedSerial = lot.unitSerialNumbers?.[unitIdx] || `#${unitIdx + 1}`;

        // 画像をリサイズして状態にセット（モーダルを開く）
        const base64Img = await resizeImage(file);
        setAiAnalysisState({
            isOpen: true,
            status: 'analyzing',
            imageUrl: base64Img,
            expectedModel: lot.model,
            expectedSerial: expectedSerial,
            unitIdx: unitIdx,
            result: null
        });

        try {
            const result = await analyzeImageWithGemini(base64Img, lot.model, expectedSerial);
            const annotatedImg = await drawResultTextOnImage(base64Img, result);
            setAiAnalysisState(prev => ({ ...prev, status: 'result', result, imageUrl: annotatedImg }));
        } catch (err) {
            console.error(err);
            setAiAnalysisState(prev => ({ ...prev, status: 'error', error: err.message }));
        } finally {
            e.target.value = '';
        }
    };

    const applyAiResult = () => {
        const { unitIdx, result, imageUrl, expectedModel, expectedSerial } = aiAnalysisState;
        const workerName = getWorkerNameForSave() || 'AI';

        const key = `${step.id}-${unitIdx}`;
        const currentTask = tasks[key] || { status: 'waiting', duration: 0 };

        const aiData = result ? {
            imageUrl,
            expectedModel,
            expectedSerial,
            match: result.match,
            extractedText: result.extractedText,
            recognizedModel: result.recognizedModel,
            recognizedSerial: result.recognizedSerial,
            reason: result.reason,
            analyzedAt: Date.now()
        } : null;

        // AI認識データのみ保存。タスクのステータスや時間は変更しない。
        const newTasks = {
            ...tasks,
            [key]: {
                ...currentTask,
                workerName: currentTask.workerName || workerName,
                aiAnalysis: aiData
            }
        };
        setTasks(newTasks);
        onSave({ tasks: newTasks, status: 'processing', workStartTime: lot.workStartTime || Date.now() });

        setAiAnalysisState({ isOpen: false, status: 'idle', imageUrl: null, expectedModel: '', expectedSerial: '', unitIdx: null, result: null });
    };
    // ----------------------------------------------------

    const triggerMoveToTouchup = () => {
        setConfirmModal({
            isOpen: true,
            title: '確認',
            message: 'タッチアップエリアへ移動しますか？\n(ステータスは作業中のまま維持されます)',
            confirmText: '移動する',
            confirmColor: 'bg-amber-600',
            action: async () => {
                setIsProcessing(true);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    let targetZoneId = 'zone_touchup';
                    const exists = mapZones && mapZones.some(z => z.id === targetZoneId);
                    if (!exists) {
                        await onCreateZone({ id: targetZoneId, name: 'タッチアップ', x: 50, y: 5, w: 22, h: 40, color: 'bg-amber-50/80 border-amber-300', isPersonal: false });
                    }
                    await onSave({ location: targetZoneId, mapZoneId: targetZoneId, status: 'processing', tasks, interruptions, updatedAt: Date.now() });
                    onFinish();
                } catch (error) { console.error(error); alert("移動に失敗しました。"); } finally { setIsProcessing(false); }
            }
        });
    };

    const triggerMoveToShipping = () => {
        setConfirmModal({
            isOpen: true,
            title: '完了確認',
            message: '「完了済み」として確定し、出荷待機へ移動させますか？',
            confirmText: '完了する',
            confirmColor: 'bg-emerald-600',
            action: async () => {
                setIsProcessing(true);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await onSave({ status: 'completed', location: 'completed', mapZoneId: null, tasks, interruptions, completedAt: Date.now() });
                    onFinish();
                } catch (error) { console.error(error); alert("完了処理に失敗しました。"); } finally { setIsProcessing(false); }
            }
        });
    };

    const handleAddNewStep = () => { setEditingStepData({ id: generateId(), category: selectedCategory, title: '', description: '', tags: [], targetTime: 60, checkType: 'individual', defaultCount: lot.quantity, images: [], pdf: null, targetPart: 'both' }); setCurrentView('editor'); };
    const handleEditStep = (step) => { setEditingStepData({ ...step, checkType: step.checkType || 'individual', defaultCount: step.defaultCount || lot.quantity, images: step.images || [], pdf: step.pdf || null, targetPart: step.targetPart || 'both' }); setCurrentView('editor'); };
    const handleSaveStep = (stepData) => {
        let newSteps;
        const isExisting = lot.steps.find(s => s.id === stepData.id);
        if (isExisting) { newSteps = lot.steps.map(s => s.id === stepData.id ? stepData : s); } else { const catIndex = lot.steps.findLastIndex(s => s.category === stepData.category); if (catIndex >= 0) { newSteps = [...lot.steps.slice(0, catIndex + 1), stepData, ...lot.steps.slice(catIndex + 1)]; } else { newSteps = [...lot.steps, stepData]; } }
        onSave({ steps: newSteps }); setCurrentView('list'); setEditingStepData(null);
    };

    const triggerDeleteStep = (stepId) => {
        setConfirmModal({
            isOpen: true, title: '削除確認', message: 'この項目を削除してもよろしいですか？', confirmText: '削除する', confirmColor: 'bg-red-600',
            action: () => { const newSteps = lot.steps.filter(s => s.id !== stepId); onSave({ steps: newSteps }); setConfirmModal(prev => ({ ...prev, isOpen: false })); }
        });
    };

    const handleEditorImageUpload = async (e) => { const file = e.target.files[0]; if (file) { const img = await resizeImage(file); setEditingStepData(prev => ({ ...prev, images: [...(prev.images || []), img] })); } };
    const handleEditorPdfUpload = async (e) => { const file = e.target.files[0]; if (file) { const base64 = await getBase64(file); setEditingStepData(prev => ({ ...prev, pdf: base64 })); } };

    const hasProcessing = Object.values(tasks).some(t => t.status === 'processing');
    const hasPaused = Object.values(tasks).some(t => t.status === 'paused');

    if (currentView === 'loading') return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

    if (currentView === 'worker_select') {
        return (
            <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                    <div className="bg-slate-800 text-white p-4 font-bold text-center">担当者を選択してください</div>
                    <div className="p-6 grid grid-cols-2 gap-4">
                        {workerOptions.length > 0 ? workerOptions.map((name, i) => (
                            <button key={i} onClick={() => handleWorkerSelect(name)} className="p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl font-bold text-blue-800 transition-all flex flex-col items-center gap-2"><User className="w-8 h-8" /> {name}</button>
                        )) : (
                            <div className="col-span-2 text-center text-slate-400 py-4"><p className="mb-2">個人エリアが設定されていません</p><p className="text-xs">設定タブから「個人エリア」として登録してください</p></div>
                        )}
                    </div>
                    <div className="p-4 border-t bg-slate-50 text-center"><button onClick={onClose} className="text-slate-500 hover:text-slate-700 underline">キャンセル</button></div>
                </div>
            </div>
        );
    }

    if (currentView === 'editor' && editingStepData) {
        return (
            <div className="fixed inset-0 z-[60] bg-slate-100 flex items-center justify-center p-4 overflow-y-auto">
                <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} confirmText={confirmModal.confirmText} confirmColor={confirmModal.confirmColor} />
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto h-auto max-h-[95vh]">
                    <div className="bg-slate-800 text-white p-4 font-bold flex justify-between items-center shrink-0">
                        <span>{lot.steps.find(s => s.id === editingStepData.id) ? '検査項目の編集' : '新しい検査項目の追加'}</span>
                        <button onClick={() => setCurrentView('list')}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">カテゴリ</label><select value={editingStepData.category} onChange={e => setEditingStepData({ ...editingStepData, category: e.target.value })} className="w-full border rounded p-2">{INSPECTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Component className="w-4 h-4" /> 適用対象</label>
                                <select value={editingStepData.targetPart || 'both'} onChange={e => setEditingStepData({ ...editingStepData, targetPart: e.target.value })} className="w-full border rounded p-2">
                                    <option value="both">本体・テール共通</option>
                                    <option value="main">本体のみ</option>
                                    <option value="tail">テールのみ</option>
                                </select>
                            </div>
                        </div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">タイトル</label><input value={editingStepData.title} onChange={e => setEditingStepData({ ...editingStepData, title: e.target.value })} className="w-full border rounded p-2" /></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">内容・基準</label><textarea value={editingStepData.description} onChange={e => setEditingStepData({ ...editingStepData, description: e.target.value })} className="w-full border rounded p-2 h-32" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">目標時間(秒)</label><input type="number" value={editingStepData.targetTime} onChange={e => setEditingStepData({ ...editingStepData, targetTime: Number(e.target.value) })} className="w-full border rounded p-2" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">チェック方式</label><select value={editingStepData.checkType || 'individual'} onChange={e => setEditingStepData({ ...editingStepData, checkType: e.target.value })} className="w-full border rounded p-2"><option value="individual">個別（台数分）</option><option value="count">員数/一括（数指定）</option></select></div>
                        </div>
                        {editingStepData.checkType === 'count' && (
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">基準数量 (任意)</label><input type="number" value={editingStepData.defaultCount || lot.quantity} onChange={e => setEditingStepData({ ...editingStepData, defaultCount: Number(e.target.value) })} className="w-full border rounded p-2" /></div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">特注追加条件 (任意)</label>
                            <input value={editingStepData.specialCondition || ''} onChange={e => setEditingStepData({ ...editingStepData, specialCondition: e.target.value })} className="w-full border rounded p-2" placeholder="例: 特注色、輸出仕様 など" />
                            <p className="text-xs text-slate-500 mt-1">※ ここに入力した条件は、検査対象登録時に選択肢として表示されます。</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">参考画像</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {editingStepData.images?.map((img, i) => (
                                        <div key={i} className="w-16 h-16 border rounded overflow-hidden relative">
                                            <img src={img} className="w-full h-full object-cover" />
                                            <button onClick={() => { const n = [...editingStepData.images]; n.splice(i, 1); setEditingStepData({ ...editingStepData, images: n }) }} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                </div>
                                <label className="cursor-pointer inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded text-xs font-bold border hover:bg-slate-200">
                                    <ImageIcon className="w-3 h-3" /> 追加
                                    <input type="file" accept="image/*" className="hidden" onChange={handleEditorImageUpload} />
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">PDF資料</label>
                                {editingStepData.pdf ? (
                                    <div className="flex items-center gap-2 text-sm bg-orange-50 p-2 rounded border border-orange-200 text-orange-700">
                                        <FileText className="w-4 h-4" /> 登録済み
                                        <button onClick={() => setEditingStepData({ ...editingStepData, pdf: null })} className="text-red-500 hover:underline text-xs">削除</button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded text-xs font-bold border hover:bg-slate-200">
                                        <FileText className="w-3 h-3" /> アップロード
                                        <input type="file" accept="application/pdf" className="hidden" onChange={handleEditorPdfUpload} />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div><label className="block text-sm font-bold text-slate-700 mb-2">属性</label><div className="flex gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={editingStepData.tags?.includes('important')} onChange={e => { const t = new Set(editingStepData.tags); e.target.checked ? t.add('important') : t.delete('important'); setEditingStepData({ ...editingStepData, tags: [...t] }) }} />重要</label><label className="flex items-center gap-2"><input type="checkbox" checked={editingStepData.tags?.includes('claim')} onChange={e => { const t = new Set(editingStepData.tags); e.target.checked ? t.add('claim') : t.delete('claim'); setEditingStepData({ ...editingStepData, tags: [...t] }) }} />クレーム</label></div></div>
                    </div>
                    <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 shrink-0"><button onClick={() => setCurrentView('list')} className="px-4 py-2 border rounded font-bold">キャンセル</button><button onClick={() => handleSaveStep(editingStepData)} className="px-6 py-2 bg-blue-600 text-white rounded font-bold">保存</button></div>
                </div>
            </div>
        );
    }

    if (currentView === 'summary') {
        const nonTouchupIncomplete = summaryData.incompleteSteps.filter(s => !s.category.includes('タッチアップ'));
        const touchupIncomplete = summaryData.incompleteSteps.filter(s => s.category.includes('タッチアップ'));
        const isTouchupOnly = nonTouchupIncomplete.length === 0 && touchupIncomplete.length > 0;

        return (
            <div className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4">
                <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} confirmText={confirmModal.confirmText} confirmColor={confirmModal.confirmColor} />

                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="bg-slate-800 text-white p-4 shrink-0 flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6" /> 検査完了レポート</h2><button onClick={() => setCurrentView('list')}><X /></button></div>
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex justify-between items-center"><div><div className="text-xs text-slate-400">対象</div><div className="text-xl font-bold">{lot.model} #{lot.serialNo}</div></div><div className="text-right"><div className="text-xs text-slate-400">作業時間</div><div className="text-2xl font-mono text-blue-600">{formatTime(summaryData.totalActiveTime)}</div></div></div>

                        {summaryData.incompleteSteps.length > 0 ? (
                            <div className={`border rounded-xl p-4 mb-6 ${isTouchupOnly ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200 animate-pulse'}`}>
                                <h3 className={`${isTouchupOnly ? 'text-amber-700' : 'text-rose-700'} font-bold flex items-center gap-2 mb-2`}>
                                    <AlertTriangle className="w-6 h-6" />
                                    {isTouchupOnly ? 'タッチアップ項目が未完了です' : '未処理の項目があります！'}
                                </h3>
                                <p className={`text-xs ${isTouchupOnly ? 'text-amber-600' : 'text-rose-600'} mb-2`}>
                                    {isTouchupOnly
                                        ? 'タッチアップエリアへ移動可能です。完了させるには出荷へ移動できません。'
                                        : '以下の項目は完了チェックも「該当なし」も選択されていません。タッチアップ以外の項目は完了が必要です。'}
                                </p>
                                <ul className={`list-disc list-inside text-sm font-bold space-y-1 bg-white p-3 rounded border ${isTouchupOnly ? 'text-amber-800 border-amber-100' : 'text-rose-800 border-rose-100'}`}>
                                    {summaryData.incompleteSteps.map(s => (
                                        <li key={s.id} className="flex justify-between items-center">
                                            <span>
                                                <span className="text-[10px] bg-slate-100 px-1 rounded mr-1 font-normal">{s.category}</span>
                                                {s.targetPart === 'tail' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded mr-1">テール</span>}
                                                {s.targetPart === 'main' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded mr-1">本体</span>}
                                                {s.title}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setSelectedCategory(s.category);
                                                    if (s.targetPart === 'tail') setActivePart('tail');
                                                    else if (s.targetPart === 'main') setActivePart('main');
                                                    setSelectedStepId(s.id);
                                                    setCurrentView('detail');
                                                }}
                                                className={`text-xs px-2 py-1 rounded ${isTouchupOnly ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                                            >
                                                確認する
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 mb-4 text-emerald-800 font-bold flex gap-2 items-center">
                                <CheckCircle2 className="w-5 h-5" /> 全ての項目が確認済みです
                            </div>
                        )}

                        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><CheckSquare className="w-5 h-5" /> 実施項目一覧</h3>
                        <div className="space-y-2">{summaryData.executedSteps.map((item, i) => (
                            <div key={i} className="bg-white border rounded p-3 flex justify-between items-center">
                                <div className="flex-1">
                                    <div className="text-xs text-slate-400">{item.category}</div>
                                    <div className="font-bold flex items-center gap-2">
                                        {item.title}
                                        {item.skippedCount > 0 && (
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border">
                                                一部該当なし: {item.skippedCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right font-mono">{formatTime(item.totalTime)}</div>
                            </div>
                        ))}</div>
                    </div>
                    <div className="p-4 border-t bg-white flex justify-end gap-3 shrink-0">
                        <button onClick={() => setCurrentView('list')} className="px-6 py-3 border rounded-lg font-bold">戻る</button>
                        <button
                            type="button"
                            onClick={triggerMoveToTouchup}
                            disabled={isProcessing || nonTouchupIncomplete.length > 0}
                            className="px-6 py-3 bg-amber-500 disabled:bg-slate-300 text-white rounded-lg font-bold shadow flex items-center gap-2"
                            title={nonTouchupIncomplete.length > 0 ? "タッチアップ以外の未完了項目があります" : ""}
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <PenTool className="w-5 h-5" />} 確定してタッチアップへ
                        </button>
                        <button
                            type="button"
                            onClick={triggerMoveToShipping}
                            disabled={isProcessing || summaryData.incompleteSteps.length > 0}
                            className="px-6 py-3 bg-emerald-600 disabled:bg-slate-300 text-white rounded-lg font-bold shadow flex items-center gap-2"
                            title={summaryData.incompleteSteps.length > 0 ? "未完了の項目があります" : ""}
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} 確定して出荷へ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} confirmText={confirmModal.confirmText} confirmColor={confirmModal.confirmColor} />

            {isDetail ? (
                <div className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[95vh] flex flex-col overflow-hidden">
                        <div className={`text-white p-4 flex justify-between items-center shrink-0 ${step.tags?.includes('claim') ? 'bg-purple-800' : step.tags?.includes('important') ? 'bg-red-800' : 'bg-slate-800'}`}>
                            <div className="flex items-center gap-3"><button onClick={() => setCurrentView('list')}><ArrowRight className="rotate-180" /></button><div><div className="text-xs opacity-80">{step.category}</div><div className="text-xl font-bold">{step.title}</div></div></div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowComplaintModal(true)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold flex items-center gap-1 shadow"><Megaphone className="w-4 h-4" /> 気付き・不満</button>
                                <button onClick={() => setShowDefectModal(true)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded text-sm font-bold flex items-center gap-1 shadow"><AlertTriangle className="w-4 h-4" /> 不具合</button>
                            </div>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-1/3 bg-slate-50 border-r p-6 overflow-y-auto flex flex-col">
                                <div className="mb-6 flex-1">
                                    <h3 className="text-sm font-bold text-slate-500 mb-2">確認方法・基準</h3>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-lg font-medium text-slate-800 whitespace-pre-wrap">{step.description}</div>
                                    {step.images?.length > 0 && <div className="mt-4"><div className="text-xs font-bold text-slate-400 mb-1">参考画像</div><div className="flex flex-wrap gap-2">{step.images.map((img, i) => <img key={i} src={img} onClick={() => setExpandedImage(img)} className="w-20 h-20 object-cover rounded border bg-white cursor-pointer hover:opacity-80 transition-opacity shadow-sm hover:ring-2 hover:ring-blue-400" />)}</div></div>}
                                    {step.pdf && <div className="mt-4"><button onClick={() => setShowPdf(step.pdf)} className="w-full py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded font-bold flex items-center justify-center gap-2 hover:bg-orange-100"><FileText className="w-4 h-4" /> PDF資料を確認</button></div>}
                                </div>
                                {/* 過去の不具合履歴セクション */}
                                {(() => {
                                    const dh = defectHistory || [];
                                    const stepDefects = dh.filter(d => d.stepId && d.stepId === step.id);
                                    const modelDefects = dh.filter(d => d.model === lot.model && (!d.stepId || d.stepId !== step.id));
                                    const totalCount = stepDefects.length + modelDefects.length;

                                    // この項目の不具合をlabelで集約
                                    const stepLabelMap = {};
                                    stepDefects.forEach(d => {
                                        const key = d.label || '内容なし';
                                        if (!stepLabelMap[key]) stepLabelMap[key] = { count: 0, causeProcess: d.causeProcess, latest: d.timestamp };
                                        stepLabelMap[key].count++;
                                        if (d.timestamp > stepLabelMap[key].latest) { stepLabelMap[key].latest = d.timestamp; stepLabelMap[key].causeProcess = d.causeProcess; }
                                    });
                                    const stepLabelList = Object.entries(stepLabelMap).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

                                    // この型式の他項目の不具合をstepTitle+labelで集約
                                    const modelLabelMap = {};
                                    modelDefects.forEach(d => {
                                        const key = `${d.stepCategory}-${d.stepTitle}`;
                                        if (!modelLabelMap[key]) modelLabelMap[key] = { items: [], count: 0, stepTitle: d.stepTitle, stepCategory: d.stepCategory };
                                        modelLabelMap[key].count++;
                                        if (modelLabelMap[key].items.length < 3) modelLabelMap[key].items.push(d.label);
                                    });
                                    const modelLabelList = Object.entries(modelLabelMap).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

                                    if (totalCount === 0) {
                                        return (
                                            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold">
                                                    <CheckCircle2 className="w-4 h-4" /> 過去の不具合なし
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="mt-4">
                                            <button
                                                onClick={() => setShowDefectHistoryPanel(!showDefectHistoryPanel)}
                                                className={`w-full p-3 rounded-lg border text-left transition-colors ${stepDefects.length >= 3 ? 'bg-red-50 border-red-200 hover:bg-red-100' : stepDefects.length >= 1 ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className={`w-4 h-4 ${stepDefects.length >= 3 ? 'text-red-600' : stepDefects.length >= 1 ? 'text-amber-600' : 'text-slate-500'}`} />
                                                        <span className="text-sm font-bold text-slate-700">過去の不具合情報</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {stepDefects.length > 0 && (
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${stepDefects.length >= 3 ? 'bg-red-200 text-red-800' : stepDefects.length >= 2 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                                                                この項目 {stepDefects.length}件
                                                            </span>
                                                        )}
                                                        {modelDefects.length > 0 && (
                                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                                                この型式 {modelDefects.length}件
                                                            </span>
                                                        )}
                                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDefectHistoryPanel ? 'rotate-180' : ''}`} />
                                                    </div>
                                                </div>
                                            </button>
                                            {showDefectHistoryPanel && (
                                                <div className="mt-2 space-y-3">
                                                    {stepLabelList.length > 0 && (
                                                        <div className="bg-white border rounded-lg p-3">
                                                            <div className="text-xs font-bold text-slate-500 mb-2">この項目での不具合</div>
                                                            <div className="space-y-1.5">
                                                                {stepLabelList.map(([label, info], i) => (
                                                                    <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="text-sm font-bold text-slate-800 truncate block">{label}</span>
                                                                            {info.causeProcess && <span className="text-xs text-slate-500">[{info.causeProcess}]</span>}
                                                                        </div>
                                                                        <span className={`shrink-0 ml-2 text-xs font-bold px-2 py-0.5 rounded ${info.count >= 3 ? 'bg-red-100 text-red-700' : info.count >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                            {info.count}件
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {modelLabelList.length > 0 && (
                                                        <div className="bg-white border rounded-lg p-3">
                                                            <div className="text-xs font-bold text-slate-500 mb-2">この型式の他項目での不具合</div>
                                                            <div className="space-y-1.5">
                                                                {modelLabelList.map(([key, info], i) => (
                                                                    <div key={i} className="bg-slate-50 p-2 rounded">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-xs font-bold text-slate-600">
                                                                                <span className="bg-slate-200 px-1 rounded mr-1">{info.stepCategory}</span>{info.stepTitle}
                                                                            </span>
                                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${info.count >= 3 ? 'bg-red-100 text-red-700' : info.count >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                                {info.count}件
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 truncate">{info.items.join('、')}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                <div className="mt-auto pt-4 border-t"><div className="text-sm font-bold text-slate-500 mb-1">目標時間</div><div className="text-2xl font-mono font-bold text-slate-700 flex items-end gap-2">{step.targetTime || 60}<span className="text-sm text-slate-400 mb-1">sec / 台</span></div></div>
                            </div>
                            <div className="flex-1 p-6 flex flex-col overflow-y-auto">
                                {step.checkType === 'count' ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-6">
                                        <div className="text-center">
                                            <h3 className="text-slate-500 font-bold mb-2">確認数量を入力</h3>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="number"
                                                    value={inputCount}
                                                    onChange={(e) => setInputCount(e.target.value)}
                                                    className="text-4xl font-bold w-32 text-center border-b-4 border-blue-500 outline-none bg-transparent"
                                                />
                                                <span className="text-2xl font-bold text-slate-400">/ {step.defaultCount || lot.quantity}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3 w-full max-w-sm">
                                            <button
                                                onClick={() => batchComplete(step.id, step.targetTime, true)}
                                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-xl shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700"
                                            >
                                                <CheckCircle2 className="w-6 h-6" /> 確認完了
                                            </button>
                                            <button
                                                onClick={() => batchSkip(step.id, true)}
                                                className="w-full py-3 bg-slate-200 text-slate-600 rounded-lg font-bold shadow flex items-center justify-center gap-2 hover:bg-slate-300"
                                            >
                                                <Ban className="w-5 h-5" /> 該当なし
                                            </button>
                                            <button
                                                onClick={() => batchReset(step.id)}
                                                className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-red-100 mt-4"
                                            >
                                                <Undo2 className="w-5 h-5" /> 未着手へ戻す
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-3 gap-4">{Array.from({ length: lot.quantity }).map((_, i) => {
                                            const task = tasks[`${step.id}-${i}`] || { status: 'waiting' };
                                            const isActive = task.status === 'processing';
                                            const isSkipped = task.status === 'skipped';
                                            const isDone = task.status === 'completed';
                                            const activeTime = isActive ? Math.floor((currentTime - (task.startTime || Date.now())) / 1000) : 0;
                                            const unitLabel = lot.unitSerialNumbers?.[i] || `#${i + 1}`;

                                            const isNG = task.status === 'ng' || task.status === 'reworking';
                                            const reworks = task.reworks || [];

                                            let cardClass = 'bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700';
                                            if (isActive) cardClass = 'bg-blue-600 text-white border-blue-600';
                                            else if (task.status === 'completed') cardClass = 'bg-emerald-50 border-emerald-500 text-emerald-700';
                                            else if (task.status === 'ng') cardClass = 'bg-red-600 text-white border-red-600';
                                            else if (task.status === 'reworking') cardClass = 'bg-orange-500 text-white border-orange-500 animate-pulse';
                                            else if (task.status === 'paused') cardClass = 'bg-amber-100 border-amber-400 text-amber-800';
                                            else if (isSkipped) cardClass = 'bg-slate-100 border-slate-300 text-slate-400';

                                            // AIチェック対象の項目かどうかの判定
                                            const isAutoCheckEligible = step.title.includes('型式') || step.title.includes('機番') || step.title.includes('銘板') || step.title.includes('ネームプレート');
                                            // isAnalyzingの個別チェック用ステートは変更したため、こちらはモーダル経由の起動に切り替えます

                                            return (
                                                <div key={i} className={`relative min-h-[6.5rem] h-auto rounded-xl flex flex-col overflow-hidden transition-all ${cardClass}`}>
                                                    {isAutoCheckEligible && !isDone && !isSkipped && (
                                                        <label className="absolute top-1.5 right-1.5 bg-white/90 p-1.5 rounded-full shadow text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors z-10" title="カメラでAI自動判定">
                                                            <Camera className="w-4 h-4" />
                                                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleCameraCapture(e, i)} />
                                                        </label>
                                                    )}
                                                    {/* AI認識データ閲覧ボタン */}
                                                    {task.aiAnalysis && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAiAnalysisState({
                                                                    isOpen: true,
                                                                    status: 'result',
                                                                    imageUrl: task.aiAnalysis.imageUrl,
                                                                    expectedModel: task.aiAnalysis.expectedModel,
                                                                    expectedSerial: task.aiAnalysis.expectedSerial,
                                                                    unitIdx: i,
                                                                    result: {
                                                                        match: task.aiAnalysis.match,
                                                                        extractedText: task.aiAnalysis.extractedText,
                                                                        recognizedModel: task.aiAnalysis.recognizedModel,
                                                                        recognizedSerial: task.aiAnalysis.recognizedSerial,
                                                                        reason: task.aiAnalysis.reason
                                                                    },
                                                                    rotation: 0
                                                                });
                                                            }}
                                                            className={`absolute ${isAutoCheckEligible && !isDone && !isSkipped ? 'top-8' : 'top-1.5'} right-1.5 p-1.5 rounded-full shadow transition-colors z-10 ${task.aiAnalysis.match ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}
                                                            title="AI認識データを表示"
                                                        >
                                                            <Sparkles className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => toggleTaskStatus(step.id, i)}
                                                        className={`flex-1 w-full p-1.5 flex flex-col items-center justify-center ${isNG ? '' : ''}`}
                                                    >
                                                        <div className="font-bold text-base">{unitLabel}</div>
                                                        {isNG ? (
                                                            <>
                                                                <div className="text-xs font-black bg-white/20 px-1.5 rounded">NG</div>
                                                                <div className="text-sm font-mono mt-0.5">{formatTime(task.duration || 0)}</div>
                                                            </>
                                                        ) : (
                                                            <div className="mt-1 text-xl font-mono">
                                                                {isSkipped ? <span className="text-xs font-bold">該当なし</span> : task.status === 'paused' ? '一時停止' : formatTime((task.duration || 0) + activeTime)}
                                                            </div>
                                                        )}
                                                        {task.status === 'reworking' && task.reworkStartTime && (
                                                            <div className="text-xs font-mono">修正中 {formatTime(Math.floor((currentTime - task.reworkStartTime) / 1000))}</div>
                                                        )}
                                                    </button>
                                                    {/* 修正作業履歴 */}
                                                    {reworks.length > 0 && (
                                                        <div className="w-full border-t border-white/20 px-1 py-0.5">
                                                            {reworks.map((rw, rIdx) => (
                                                                <div key={rIdx} className="text-[9px] flex justify-between px-1 opacity-80">
                                                                    <span>修正{rIdx+1}</span>
                                                                    <span className="font-mono">{formatTime(rw.endTime ? rw.duration : (task.reworkStartTime ? Math.floor((currentTime - task.reworkStartTime) / 1000) : 0))}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* 修正作業開始ボタン */}
                                                    {task.status === 'ng' && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleTaskMenuAction('rework', `${step.id}-${i}`); }} className="w-full py-1 text-[10px] font-bold border-t border-dashed border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center justify-center gap-1">
                                                            修正{reworks.length + 1}開始
                                                        </button>
                                                    )}

                                                    {!isActive && !isNG && task.status !== 'completed' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleTaskSkipped(step.id, i); }}
                                                            className={`w-full py-0.5 text-[10px] font-bold border-t flex items-center justify-center gap-1 ${isSkipped ? 'bg-slate-300 text-white hover:bg-slate-400' : 'bg-slate-50 text-slate-400 hover:bg-slate-200'}`}
                                                        >
                                                            {isSkipped ? <><Undo2 className="w-2.5 h-2.5" /> 解除</> : <><Ban className="w-2.5 h-2.5" /> 該当なし</>}
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })}</div>
                                        <div className="mt-6 border-t pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
                                            <button onClick={() => batchStart(step.id)} className="py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold flex items-center justify-center gap-1 hover:bg-blue-100"><PlayCircle className="w-4 h-4" /> まとめて開始</button>
                                            <button onClick={() => batchComplete(step.id, step.targetTime, true)} className="py-3 bg-emerald-600 text-white rounded font-bold shadow flex items-center justify-center gap-1 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4" /> まとめて完了</button>
                                            <button onClick={() => batchSkip(step.id, true)} className="py-3 bg-slate-200 text-slate-600 rounded font-bold shadow flex items-center justify-center gap-1 hover:bg-slate-300 whitespace-nowrap"><Ban className="w-4 h-4" /> まとめて該当なし</button>
                                            <button onClick={() => batchReset(step.id)} className="py-3 bg-red-50 text-red-600 border border-red-200 rounded font-bold shadow-sm flex items-center justify-center gap-1 hover:bg-red-100 whitespace-nowrap"><Undo2 className="w-4 h-4" /> 未着手へ戻す</button>
                                        </div>
                                    </>
                                )}
                                <div className="mt-auto pt-6 text-center">
                                    <button onClick={() => setCurrentView('list')} className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-full font-bold">一覧に戻る</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
            <>
                <div className="bg-slate-800 text-white p-4 flex flex-wrap gap-2 justify-between items-center shadow-md z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck />
                            <span className="font-bold">最終検査実行</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm items-center">
                            <div className="bg-slate-700 px-2 py-1 rounded">
                                <span className="text-slate-400 text-xs mr-1">指図</span>
                                <span className="font-bold">{lot.orderNo}</span>
                            </div>
                            <div className="bg-slate-700 px-2 py-1 rounded">
                                <span className="text-slate-400 text-xs mr-1">型式</span>
                                <span className="font-bold">{lot.model}</span>
                            </div>
                            <div className="bg-slate-700 px-2 py-1 rounded">
                                <span className="text-slate-400 text-xs mr-1">台数</span>
                                <span className="font-bold">{lot.quantity}台</span>
                            </div>
                            <div className="bg-slate-700 px-2 py-1 rounded hidden md:block">
                                <span className="text-slate-400 text-xs mr-1">機番</span>
                                <span className="font-bold text-xs">
                                    {lot.unitSerialNumbers && lot.unitSerialNumbers.length > 0
                                        ? `${lot.unitSerialNumbers[0]} ～ ${lot.unitSerialNumbers[lot.quantity - 1] || ''}`
                                        : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            onClick={() => setShowPackagingPhotoModal(true)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-bold transition-all flex items-center gap-2 shadow"
                        >
                            <ImageIcon className="w-4 h-4" /> 荷姿写真撮影
                        </button>
                        <button
                            onClick={() => { setSelectedStepId(null); setShowComplaintModal(true); }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold transition-all flex items-center gap-2 shadow"
                        >
                            <Megaphone className="w-4 h-4" /> 気付き・不満を報告
                        </button>
                        {hasProcessing || hasPaused ? (
                            hasProcessing ? (
                                <button onClick={handleBatchPause} className="px-4 py-2 rounded font-bold transition-all flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg animate-pulse ring-2 ring-amber-300">
                                    <Pause className="w-5 h-5" /> 一時停止
                                </button>
                            ) : (
                                <button onClick={handleBatchResume} className="px-4 py-2 rounded font-bold transition-all flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg ring-2 ring-blue-300">
                                    <Play className="w-5 h-5" /> 作業再開
                                </button>
                            )
                        ) : (
                            <button disabled className="px-4 py-2 rounded font-bold flex items-center gap-2 bg-slate-600 text-slate-400 cursor-not-allowed opacity-50">
                                <Pause className="w-5 h-5" /> 一時停止
                            </button>
                        )}

                        {isPersonalZone ? (
                            <div className="bg-blue-700 px-3 py-1.5 rounded font-bold flex items-center gap-2"><User className="w-4 h-4" /> 担当: {currentZone.name}</div>
                        ) : (
                            <select value={selectedWorkerName || ''} onChange={e => setSelectedWorkerName(e.target.value)} className="text-slate-800 rounded p-1.5 font-bold">
                                <option value="">担当者を選択</option>
                                {workerOptions.map((name, i) => <option key={i} value={name}>{name}</option>)}
                            </select>
                        )}
                        <button
                            onClick={handleShowSummary}
                            disabled={isProcessing || summaryData.incompleteSteps.filter(s => !s.category.includes('タッチアップ')).length > 0}
                            className="px-4 py-2 bg-emerald-600 disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-emerald-500 text-white rounded font-bold transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardCheck className="w-5 h-5" />} 完了確認と出荷処理
                        </button>
                        <button
                            onClick={() => setIsEditingMode(!isEditingMode)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 border ${isEditingMode ? 'bg-orange-500 border-orange-600 text-white ring-2 ring-orange-300' : 'bg-slate-600 border-slate-500 text-slate-100 hover:bg-slate-500'}`}
                        >
                            {isEditingMode ? <CheckSquare className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                            {isEditingMode ? '編集を終了' : 'チェック項目編集'}
                        </button>
                        <button onClick={onClose} className="p-2 rounded hover:bg-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* カテゴリごとの進捗バー */}
                <div className="bg-slate-100 px-4 py-2 flex flex-wrap gap-2 shadow-inner border-b">
                    <div className="flex items-center gap-2 mr-4">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Info className="w-3 h-3" /> 各工程の進捗</span>
                    </div>
                    {Array.from(new Set(visibleSteps.map(s => s.category))).map(cat => {
                        const catSteps = visibleSteps.filter(s => s.category === cat);
                        const total = catSteps.length * lot.quantity;
                        const completed = catSteps.reduce((acc, step) => {
                            let count = 0;
                            for (let i = 0; i < lot.quantity; i++) {
                                if (tasks[`${step.id}-${i}`]?.status === 'completed' || tasks[`${step.id}-${i}`]?.status === 'skipped') count++;
                            }
                            return acc + count;
                        }, 0);
                        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                        const isDone = percent === 100;

                        return (
                            <div key={cat} className={`flex items-center gap-2 px-2 py-1 rounded bg-white shadow-sm border ${isDone ? 'border-emerald-200' : 'border-slate-200'}`}>
                                <div className="text-xs font-bold text-slate-600 w-16 truncate" title={cat}>{cat}</div>
                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }} />
                                </div>
                                <div className={`text-xs font-bold w-8 text-right ${isDone ? 'text-emerald-600' : 'text-slate-500'}`}>{percent}%</div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-64 bg-slate-800 text-slate-300 flex flex-col shadow-inner shrink-0">
                        <div className="p-4 border-b border-slate-700/50">
                            <h3 className="font-bold text-slate-100 flex items-center gap-2"><LayoutList className="w-5 h-5" /> 確認カテゴリ</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                            {Array.from(new Set(visibleSteps.map(s => s.category))).map(cat => {
                                const catSteps = visibleSteps.filter(s => s.category === cat);
                                const total = catSteps.length * lot.quantity;
                                const completed = catSteps.reduce((acc, step) => {
                                    let count = 0;
                                    for (let i = 0; i < lot.quantity; i++) {
                                        if (tasks[`${step.id}-${i}`]?.status === 'completed' || tasks[`${step.id}-${i}`]?.status === 'skipped') count++;
                                    }
                                    return acc + count;
                                }, 0);
                                const isDone = total > 0 && completed === total;

                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`w-full text-left px-3 py-3 rounded-lg font-bold transition-all outline-none flex items-center justify-between group
                      ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-lg relative overflow-hidden' : isDone ? 'hover:bg-slate-700/50 text-slate-400' : 'hover:bg-slate-700/50 text-slate-300'}`}
                                    >
                                        <span className="truncate pr-2 relative z-10 flex items-center gap-2">{isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : null}{cat}</span>
                                        <div className="text-xs relative z-10 font-mono tracking-wider bg-black/20 px-1.5 py-0.5 rounded">{completed}/{total}</div>
                                        {selectedCategory === cat && <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 z-0"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-6 shadow-inner" ref={listContainerRef} onScroll={(e) => { if (currentView === 'list') listScrollRef.current = e.target.scrollTop; }}>
                        <div className="max-w-7xl mx-auto flex flex-col min-h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2"><BookOpen /> {selectedCategory}</h3>
                                <div className="flex gap-2 items-center">
                                    <div className="flex bg-white rounded p-1 shadow-sm border border-slate-200 mr-2">
                                        <button onClick={() => setStepViewMode('grid')} className={`p-1.5 rounded ${stepViewMode === 'grid' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="グリッド表示"><LayoutGrid className="w-4 h-4" /></button>
                                        <button onClick={() => setStepViewMode('list')} className={`p-1.5 rounded ${stepViewMode === 'list' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="リスト表示"><List className="w-4 h-4" /></button>
                                    </div>
                                    <button onClick={batchCompleteCategory} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-sm" title="このカテゴリの全項目を完了にする"><CheckCircle2 className="w-4 h-4" /> カテゴリを一括完了</button>
                                    {isEditingMode && <button onClick={handleAddNewStep} className="bg-blue-600 text-white px-4 py-2 rounded font-bold shadow flex gap-2"><Plus className="w-4 h-4" /> 追加</button>}
                                </div>
                            </div>
                            {stepViewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {visibleSteps.map(step => {
                                        if (step.category !== selectedCategory) return null;
                                        const stepTasks = Array.from({ length: lot.quantity }).map((_, i) => tasks[`${step.id}-${i}`]);
                                        const hasPausedStep = stepTasks.some(t => t?.status === 'paused');
                                        const hasProcessingStep = stepTasks.some(t => t?.status === 'processing');
                                        const done = stepTasks.every(t => t?.status === 'completed' || t?.status === 'skipped');
                                        const allSkipped = stepTasks.every(t => t?.status === 'skipped');

                                        return (<div key={step.id} className="relative"><div role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); console.log('Button clicked!', step.id, isEditingMode); if (isEditingMode) { handleEditStep(step); } else { setSelectedStepId(step.id); setCurrentView('detail'); } }} className={`w-full p-4 rounded-xl border-4 text-left min-h-[8rem] h-auto flex flex-col justify-between cursor-pointer hover:shadow-md transition-all ${allSkipped ? 'bg-slate-100 border-slate-300 text-slate-500' : done ? 'bg-emerald-600 border-emerald-700 shadow-md text-white' : hasPausedStep ? 'bg-amber-50 border-amber-400 shadow-sm text-slate-700' : hasProcessingStep ? 'bg-white border-blue-500 shadow-md text-slate-700' : 'bg-white border-slate-200 hover:border-blue-400 text-slate-700'} ${isEditingMode ? 'border-dashed cursor-context-menu' : ''}`}><div className="font-bold line-clamp-3 text-lg mb-2">{step.title}</div><div className={`flex justify-between items-end text-xs ${done && !allSkipped ? 'text-emerald-100' : allSkipped ? 'text-slate-400' : 'text-slate-400'} mt-auto`}><span>{step.description}</span><div className="flex gap-1">{hasPausedStep && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold flex items-center gap-1 border border-amber-200"><Pause className="w-3 h-3" /> 一時停止中</span>}{done && <span className={`bg-white px-3 py-1 rounded-full font-black flex items-center gap-1 shadow-sm shrink-0 ${allSkipped ? 'text-slate-500' : 'text-emerald-700'}`}>{allSkipped ? <><Ban className="w-4 h-4" /> 該当なし</> : <><CheckCircle2 className="w-5 h-5" /> 完了</>}</span>}</div></div></div>{isEditingMode && <button onClick={(e) => { e.stopPropagation(); triggerDeleteStep(step.id) }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow"><Trash2 className="w-4 h-4" /></button>}</div>)
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {visibleSteps.map(step => {
                                        if (step.category !== selectedCategory) return null;
                                        const stepTasks = Array.from({ length: lot.quantity }).map((_, i) => tasks[`${step.id}-${i}`]);
                                        const hasPausedStep = stepTasks.some(t => t?.status === 'paused');
                                        const hasProcessingStep = stepTasks.some(t => t?.status === 'processing');
                                        const done = stepTasks.every(t => t?.status === 'completed' || t?.status === 'skipped');
                                        const allSkipped = stepTasks.every(t => t?.status === 'skipped');

                                        return (
                                            <div key={step.id} className="relative flex items-center">
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => { e.preventDefault(); console.log('List button clicked!', step.id, isEditingMode); if (isEditingMode) { handleEditStep(step); } else { setSelectedStepId(step.id); setCurrentView('detail'); } }}
                                                    className={`w-full p-3 rounded-lg border text-left flex items-center justify-between cursor-pointer hover:shadow-md transition-all ${allSkipped ? 'bg-slate-100 border-slate-300 text-slate-500' : done ? 'bg-emerald-600 border-emerald-700 shadow-sm text-white' : hasPausedStep ? 'bg-amber-50 border-amber-400 shadow-sm text-slate-700' : hasProcessingStep ? 'bg-white border-blue-500 shadow-sm text-slate-700' : 'bg-white border-slate-200 hover:border-blue-400 text-slate-700'} ${isEditingMode ? 'border-dashed cursor-context-menu' : ''}`}
                                                >
                                                    <div className="flex-1 min-w-0 pr-4 flex items-center gap-4 pointer-events-none">
                                                        <div className="font-bold text-sm md:text-base truncate w-1/3 xl:w-1/4 shrink-0" title={step.title}>{step.title}</div>
                                                        <div className={`text-xs truncate flex-1 ${done && !allSkipped ? 'text-emerald-100' : allSkipped ? 'text-slate-400' : 'text-slate-500'}`} title={step.description}>{step.description}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0 pointer-events-none">
                                                        {hasPausedStep && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold flex items-center gap-1 border border-amber-200 text-xs"><Pause className="w-3 h-3" /> 一時停止中</span>}
                                                        {done && <span className={`bg-white px-3 py-1 rounded-full font-black flex items-center gap-1 shadow-sm shrink-0 text-sm ${allSkipped ? 'text-slate-500' : 'text-emerald-700'}`}>{allSkipped ? <><Ban className="w-4 h-4" /> 該当なし</> : <><CheckCircle2 className="w-5 h-5" /> 完了</>}</span>}
                                                        {!done && !hasPausedStep && <ChevronRight className={`w-6 h-6 ${hasProcessingStep ? 'text-blue-500' : 'text-slate-300'}`} />}
                                                    </div>
                                                </div>
                                                {isEditingMode && (
                                                    <button onClick={(e) => { e.stopPropagation(); triggerDeleteStep(step.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow z-10">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
            )}

                {/* --- 追加: AI判定結果表示モーダル --- */}
                {/* 完了タスク再クリック時のポップアップメニュー */}
                {completedTaskMenu && (() => {
                    const task = tasks[completedTaskMenu.key] || {};
                    return (
                        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={() => setCompletedTaskMenu(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="bg-slate-800 text-white p-3 text-center font-bold">
                                    {task.status === 'ng' ? 'NG判定済み' : '完了済み'} — {lot.unitSerialNumbers?.[completedTaskMenu.unitIdx] || `#${completedTaskMenu.unitIdx + 1}`}
                                </div>
                                <div className="p-4 space-y-2">
                                    {task.status === 'completed' && (
                                        <>
                                            <button onClick={() => handleTaskMenuAction('continue')} className="w-full py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-700 font-bold text-sm flex items-center justify-center gap-2"><PlayCircle className="w-5 h-5"/> 作業の続き</button>
                                            <button onClick={() => handleTaskMenuAction('restart')} className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm flex items-center justify-center gap-2"><Undo2 className="w-5 h-5"/> 最初から作業</button>
                                            <button onClick={() => handleTaskMenuAction('ng')} className="w-full py-3 bg-red-600 hover:bg-red-700 border border-red-700 rounded-xl text-white font-black text-lg flex items-center justify-center gap-2"><XCircle className="w-6 h-6"/> NG</button>
                                        </>
                                    )}
                                    {task.status === 'ng' && (
                                        <button onClick={() => handleTaskMenuAction('rework')} className="w-full py-3 bg-orange-500 hover:bg-orange-600 border border-orange-600 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2">修正作業 開始 {task.reworks?.length > 0 ? `(${task.reworks.length + 1}回目)` : ''}</button>
                                    )}
                                    {task.reworks?.length > 0 && (
                                        <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                                            <div className="text-xs font-bold text-orange-700 mb-1">修正履歴</div>
                                            {task.reworks.map((r, ri) => (
                                                <div key={ri} className="text-xs text-orange-600 flex justify-between"><span>{ri+1}回目</span><span className="font-mono">{formatTime(r.duration || 0)}</span></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border-t text-center"><button onClick={() => setCompletedTaskMenu(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">閉じる</button></div>
                            </div>
                        </div>
                    );
                })()}

                {aiAnalysisState.isOpen && (
                    <div className="fixed inset-0 z-[120] bg-slate-900/80 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
                            <div className="bg-slate-800 text-white p-4 font-bold flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-400" /> AI 自動認識・判定</div>
                                <button onClick={() => setAiAnalysisState(prev => ({ ...prev, isOpen: false }))}><X className="w-5 h-5 hover:text-slate-300" /></button>
                            </div>

                            <div className="flex-1 overflow-hidden bg-slate-100 flex flex-row">
                                {/* 画像とバウンディングボックスの表示エリア */}
                                <div className="w-3/5 p-4 flex flex-col items-center justify-center bg-black/5">
                                    {aiAnalysisState.imageUrl ? (
                                        <div className="relative flex flex-col items-center justify-center w-full h-full">
                                            {/* 回転用ボタンは回転させない固定位置に */}
                                            {aiAnalysisState.status === 'result' && (
                                                <button
                                                    onClick={() => setAiAnalysisState(prev => ({ ...prev, rotation: ((prev.rotation || 0) + 90) % 360 }))}
                                                    className="absolute top-4 right-4 z-30 bg-slate-800/80 hover:bg-slate-700 text-white p-3 rounded-full shadow-xl backdrop-blur transition-transform active:scale-95"
                                                    title="画像を90度回転"
                                                >
                                                    <RotateCw className="w-6 h-6" />
                                                </button>
                                            )}

                                            <div
                                                className="relative inline-block max-w-full shadow-lg border-4 border-white rounded transition-transform duration-300"
                                                style={{ transform: `rotate(${aiAnalysisState.rotation || 0}deg)` }}
                                            >
                                                <img
                                                    src={aiAnalysisState.imageUrl}
                                                    alt="Captured"
                                                    className="max-w-full max-h-[75vh] block"
                                                />

                                                {/* 解析中のオーバーレイ */}
                                                {aiAnalysisState.status === 'analyzing' && (
                                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white rounded">
                                                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                                        <p className="font-bold text-lg animate-pulse">画像を解析しています...</p>
                                                        <p className="text-sm mt-2 opacity-80">型式: {aiAnalysisState.expectedModel} / 機番: {aiAnalysisState.expectedSerial}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400">画像がありません</div>
                                    )}
                                </div>

                                {/* 判定結果とアクションエリア */}
                                <div className="w-2/5 bg-white p-6 flex flex-col border-l overflow-y-auto">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-slate-500 mb-2">検査ターゲット</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-50 p-2 rounded border">
                                                <div className="text-[10px] text-slate-400">期待する型式</div>
                                                <div className="font-bold text-slate-800 break-all">{aiAnalysisState.expectedModel}</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded border">
                                                <div className="text-[10px] text-slate-400">期待する機番</div>
                                                <div className="font-bold text-slate-800 break-all">{aiAnalysisState.expectedSerial}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        {aiAnalysisState.status === 'analyzing' && (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                                <Sparkles className="w-8 h-8 mb-2 animate-bounce text-indigo-300" />
                                                <p className="font-bold">AIが画像を解析中...</p>
                                            </div>
                                        )}

                                        {aiAnalysisState.status === 'error' && (
                                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-700">
                                                <div className="font-bold flex items-center gap-2 mb-2"><AlertOctagon className="w-5 h-5" /> エラーが発生しました</div>
                                                <p className="text-sm">画像の解析に失敗しました。ネットワーク状況を確認するか、再度撮影してください。</p>
                                                {aiAnalysisState.error && (
                                                    <div className="mt-2 text-xs font-mono text-rose-600 bg-rose-100 p-2 rounded break-all whitespace-pre-wrap">
                                                        {aiAnalysisState.error}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {aiAnalysisState.status === 'result' && aiAnalysisState.result && (
                                            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                                                {aiAnalysisState.result.match ? (
                                                    <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 mb-4 shadow-sm relative overflow-hidden flex-shrink-0">
                                                        <div className="absolute -right-4 -top-4 opacity-10"><CheckCircle2 className="w-24 h-24 text-emerald-600" /></div>
                                                        <h3 className="text-xl font-black text-emerald-700 flex items-center gap-2 mb-1"><CheckCircle2 className="w-6 h-6" /> 判定OK</h3>
                                                        <p className="text-sm text-emerald-800 font-bold">型式と機番の一致を確認しました！</p>
                                                    </div>
                                                ) : (
                                                    <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-4 mb-4 shadow-sm relative overflow-hidden flex-shrink-0">
                                                        <div className="absolute -right-4 -top-4 opacity-10"><AlertTriangle className="w-24 h-24 text-rose-600" /></div>
                                                        <h3 className="text-xl font-black text-rose-700 flex items-center gap-2 mb-1"><AlertTriangle className="w-6 h-6" /> 判定NG</h3>
                                                        <p className="text-sm text-rose-800 font-bold">情報が不足しているか、一致しません。</p>
                                                    </div>
                                                )}

                                                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Info className="w-3 h-3" /> AIの判定理由</div>
                                                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border">{aiAnalysisState.result.reason}</p>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Type className="w-3 h-3" /> 画像から読み取ったテキスト</div>
                                                        <div className="text-xs font-mono text-slate-100 bg-slate-800 p-3 rounded-lg border break-all max-h-32 overflow-y-auto whitespace-pre-wrap">{aiAnalysisState.result.extractedText}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex flex-col gap-2 shrink-0">
                                        {aiAnalysisState.status === 'result' && aiAnalysisState.result?.match && (
                                            <button onClick={applyAiResult} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 text-lg">
                                                <CheckCircle2 className="w-6 h-6" /> 認識データを保存
                                            </button>
                                        )}

                                        {aiAnalysisState.status === 'result' && !aiAnalysisState.result?.match && (
                                            <button onClick={applyAiResult} className="w-full py-2 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-2 text-sm shadow-sm">
                                                <Check className="w-4 h-4" /> NGだが認識データを保存
                                            </button>
                                        )}

                                        <div className="flex gap-2 mt-1">
                                            <button onClick={() => setAiAnalysisState(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-bold text-sm">
                                                閉じる
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* ------------------------------------------- */}

                {showPdf && (<div className="fixed inset-0 z-[70] bg-black/90 flex flex-col p-4"><div className="flex justify-between items-center text-white mb-2"><span className="font-bold">参考PDF</span><button onClick={() => setShowPdf(null)}><X className="w-8 h-8" /></button></div><iframe src={showPdf} className="flex-1 bg-white rounded-lg" /></div>)}

                {expandedImage && (
                    <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col p-4 items-center justify-center cursor-pointer" onClick={() => setExpandedImage(null)}>
                        <div className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors">
                            <X className="w-10 h-10" />
                        </div>
                        <img src={expandedImage} className="max-w-full max-h-[90vh] object-contain cursor-default" onClick={(e) => e.stopPropagation()} />
                    </div>
                )}

                {showDefectModal && (
                    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-rose-600">
                                <AlertCircle /> 不具合報告
                            </h3>
                            {(defectProcessOptions || []).length > 0 && (
                                <div className="mb-4">
                                    <div className="text-sm font-bold text-slate-700 mb-2">原因工程</div>
                                    <div className="flex flex-wrap gap-2">
                                        {(defectProcessOptions || []).map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setDefectCauseProcess(defectCauseProcess === opt ? '' : opt)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${defectCauseProcess === opt ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="mb-4">
                                <div className="text-sm font-bold text-slate-700 mb-2">不具合内容</div>
                                <textarea
                                    className="w-full border rounded p-3 h-28 text-sm"
                                    placeholder="不具合の内容を記載してください"
                                    value={defectLabel}
                                    onChange={e => setDefectLabel(e.target.value)}
                                />
                            </div>
                            <div className="mb-4">
                                <div className="text-sm font-bold text-slate-700 mb-2">参考写真</div>
                                <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border rounded text-sm font-bold text-slate-600 transition-colors">
                                    <Camera className="w-4 h-4" /> 写真を追加
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleDefectPhotoAdd} />
                                </label>
                                {defectPhotos.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {defectPhotos.map((photo, idx) => (
                                            <div key={idx} className="relative group">
                                                <img src={photo} className="w-16 h-16 object-cover rounded border" />
                                                <button
                                                    onClick={() => setDefectPhotos(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-80 hover:opacity-100"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setShowDefectModal(false); setDefectCauseProcess(''); setDefectPhotos([]); }} className="px-4 py-2 border rounded font-bold text-slate-600 hover:bg-slate-50">キャンセル</button>
                                <button onClick={reportDefect} className="px-6 py-2 bg-rose-600 text-white rounded font-bold shadow hover:bg-rose-700">報告</button>
                            </div>
                        </div>
                    </div>
                )}

                {showComplaintModal && (
                    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-600">
                                <Megaphone /> 気付き・不満の報告
                            </h3>
                            <div className="text-sm text-slate-500 mb-2 font-bold">当てはまる内容を選択してください（複数選択不可）</div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {(complaintOptions || []).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setComplaintLabel(opt)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${complaintLabel === opt ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                className="w-full border rounded p-3 mb-4 h-24 text-sm"
                                placeholder="詳細やその他の内容があれば記載してください（任意）"
                                value={complaintText}
                                onChange={e => setComplaintText(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowComplaintModal(false)} className="px-4 py-2 border rounded font-bold text-slate-600 hover:bg-slate-50">キャンセル</button>
                                <button onClick={reportComplaint} className="px-6 py-2 bg-purple-600 text-white rounded font-bold shadow hover:bg-purple-700">報告する</button>
                            </div>
                        </div>
                    </div>
                )}

                {showPackagingPhotoModal && (
                    <PackagingPhotoModal
                        lot={lot}
                        topics={packagingPhotoTopics || ["製品前", "製品後", "製品右", "製品左", "付属品1", "付属品2"]}
                        onClose={() => setShowPackagingPhotoModal(false)}
                        onSave={onSave}
                    />
                )}

                {/* Voice Assistant Bar */}
                <div className="fixed bottom-0 left-0 right-0 z-[200]">
                  {/* Toggle button (always visible) */}
                  <div className="flex justify-end p-2">
                    <button
                      onClick={toggleVoice}
                      className={`p-3 rounded-full shadow-lg transition-all ${voiceEnabled ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      title={voiceEnabled ? '音声OFF' : '音声ON'}
                    >
                      <Mic className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Collapsible bar */}
                  {voiceEnabled && (
                    <div className="bg-slate-900/95 backdrop-blur text-white">
                      <div className="flex items-center gap-2 px-4 py-2 cursor-pointer" onClick={() => setVoiceBarOpen(!voiceBarOpen)}>
                        <Mic className={`w-4 h-4 ${isListeningNow ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`} />
                        <span className="text-sm flex-1 truncate">
                          {voiceError ? <span className="text-red-400">{voiceError}</span>
                           : interimText ? <span className="text-green-300">{interimText}</span>
                           : voiceStatus || '音声アシスタント ON'}
                        </span>
                        {voiceBarOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                      {voiceBarOpen && (
                        <div className="px-4 pb-3 max-h-40 overflow-y-auto">
                          <div className="text-xs text-slate-400 mb-1">コマンド: 開始 / OK(完了) / NG / 次 / 戻る / スキップ / キャンセル / N番開始 / N番OK / カテゴリ名</div>
                          <div className="space-y-0.5">
                            {voiceLogs.slice(-8).map((log, i) => (
                              <div key={i} className={`text-xs ${log.type === 'user' ? 'text-green-300' : 'text-blue-300'}`}>{log.text}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </div>
            );
};

// --- Note Modal (Final Inspection) ---
const FINoteModal = ({ notes, workers, currentUserName, saveData, deleteData, onClose }) => {
  const [tab, setTab] = useState('my');
  const [model, setModel] = useState('');
  const [stepTitle, setStepTitle] = useState('');
  const [content, setContent] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [noteImage, setNoteImage] = useState(null);
  const workerName = currentUserName;
  const myNotes = notes.filter(n => n.isPersonal && n.author === workerName);
  const sharedNotes = notes.filter(n => !n.isPersonal);
  const allModels = [...new Set(notes.map(n => n.model).filter(Boolean))];
  const allSteps = [...new Set(notes.map(n => n.stepTitle).filter(Boolean))];
  const handleSave = () => {
    if (!content.trim() && !noteImage) { alert('内容を入力してください'); return; }
    if (!workerName) { alert('使用者を選択してください'); return; }
    const id = `note_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    saveData('notes', id, { author: workerName, model: model.trim(), stepTitle: stepTitle.trim(), content: content.trim(), image: noteImage || null, isPersonal: !isShared, createdAt: Date.now() });
    setContent(''); setModel(''); setStepTitle(''); setNoteImage(null); setIsShared(false); setTab(isShared ? 'shared' : 'my');
  };
  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center"><h2 className="font-bold flex items-center gap-2"><FileText className="w-5 h-5"/> ノート</h2><button onClick={onClose}><X className="w-5 h-5"/></button></div>
        {!workerName && <div className="px-4 py-2 bg-red-50 border-b text-center text-xs font-bold text-red-500">⚠ ヘッダーから使用者を選択してください</div>}
        <div className="flex bg-slate-100 p-1 mx-4 mt-3 rounded-lg">
          {[{id:'my',label:'個人メモ'},{id:'shared',label:'共有情報'},{id:'create',label:'＋新規'}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${tab === t.id ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>{t.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'create' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs font-bold text-slate-500">型式</label><input value={model} onChange={e=>setModel(e.target.value)} list="fiNoteModels" className="w-full border rounded p-2 text-sm" placeholder="任意"/><datalist id="fiNoteModels">{allModels.map(m => <option key={m} value={m}/>)}</datalist></div>
                <div className="flex-1"><label className="text-xs font-bold text-slate-500">工程</label><input value={stepTitle} onChange={e=>setStepTitle(e.target.value)} list="fiNoteSteps" className="w-full border rounded p-2 text-sm" placeholder="任意"/><datalist id="fiNoteSteps">{allSteps.map(s => <option key={s} value={s}/>)}</datalist></div>
              </div>
              <div><label className="text-xs font-bold text-slate-500">内容</label><textarea value={content} onChange={e=>setContent(e.target.value)} className="w-full border rounded p-2 text-sm h-24" placeholder="メモを入力..."/></div>
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-amber-50 rounded-lg border border-amber-200">
                <input type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} className="rounded"/>
                <div><span className="text-sm font-bold text-amber-700">みんなに共有</span><div className="text-[10px] text-amber-500">該当する型式・工程の作業時に表示</div></div>
              </label>
              <button onClick={handleSave} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">保存</button>
            </div>
          )}
          {tab === 'my' && (<div className="space-y-3">{myNotes.length === 0 && <div className="text-center py-10 text-slate-400">個人メモはありません</div>}{myNotes.map(n => (
            <div key={n.id} className="border rounded-lg p-3 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-1"><div className="text-[10px] text-slate-400">{n.model && <span className="bg-blue-100 text-blue-700 px-1.5 rounded mr-1">{n.model}</span>}{n.stepTitle && <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded">{n.stepTitle}</span>}</div><button onClick={() => deleteData('notes', n.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button></div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{n.content}</div>
              {n.image && <img src={n.image} alt="" className="mt-2 max-h-32 rounded border"/>}
              <div className="text-[9px] text-slate-300 mt-1">{new Date(n.createdAt).toLocaleString('ja-JP')}</div>
            </div>
          ))}</div>)}
          {tab === 'shared' && (<div className="space-y-3">{sharedNotes.length === 0 && <div className="text-center py-10 text-slate-400">共有情報はありません</div>}{sharedNotes.map(n => (
            <div key={n.id} className="border-2 border-amber-300 rounded-lg p-3 bg-amber-50">
              <div className="flex justify-between items-start mb-1"><div className="text-[10px]">{n.model && <span className="bg-blue-100 text-blue-700 px-1.5 rounded mr-1">{n.model}</span>}{n.stepTitle && <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded">{n.stepTitle}</span>}</div><span className="text-[10px] text-amber-600 font-bold">{n.author}</span></div>
              <div className="text-sm text-slate-800 whitespace-pre-wrap font-medium">{n.content}</div>
              {n.image && <img src={n.image} alt="" className="mt-2 max-h-32 rounded border"/>}
              <div className="text-[9px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString('ja-JP')}</div>
            </div>
          ))}</div>)}
        </div>
      </div>
    </div>
  );
};

// --- Announcement Modal (Final Inspection) ---
const FIAnnouncementModal = ({ announcements, workers, currentUserName, saveData, deleteData, onClose }) => {
  const [view, setView] = useState('list');
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [annImage, setAnnImage] = useState(null);
  const [notifyTime1, setNotifyTime1] = useState('');
  const [notifyTime2, setNotifyTime2] = useState('');
  const [annMode, setAnnMode] = useState('confirm');
  const [newComment, setNewComment] = useState('');
  const workerName = currentUserName;

  const handlePost = () => {
    if (!title.trim()) { alert('タイトルを入力してください'); return; }
    if (!workerName) { alert('使用者を選択してください'); return; }
    const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const notifyTimes = [notifyTime1, notifyTime2].filter(Boolean);
    saveData('announcements', id, { author: workerName, title: title.trim(), content: content.trim(), image: annImage || null, comments: [], confirmedBy: [], createdAt: Date.now(), notifyTimes: notifyTimes.length > 0 ? notifyTimes : null, mode: annMode });
    setTitle(''); setContent(''); setAnnImage(null); setNotifyTime1(''); setNotifyTime2(''); setView('list');
  };
  const handleUpdate = () => { if (!selectedAnn) return; const nt = [notifyTime1,notifyTime2].filter(Boolean); saveData('announcements', selectedAnn.id, { title: title.trim(), content: content.trim(), image: annImage ?? selectedAnn.image ?? null, notifyTimes: nt.length > 0 ? nt : null }); setView('detail'); };
  const handleConfirm = (ann) => { if (!workerName) return; const c = [...(ann.confirmedBy||[])]; if (!c.includes(workerName)) c.push(workerName); saveData('announcements', ann.id, { confirmedBy: c }); };
  const addComment = (ann) => { const t = newComment.trim(); if (!t || !workerName) return; saveData('announcements', ann.id, { comments: [...(ann.comments||[]), {author:workerName,text:t,createdAt:Date.now()}] }); setNewComment(''); };
  const openDetail = (ann) => { setSelectedAnn(ann); setView('detail'); };
  const openEdit = (ann) => { setSelectedAnn(ann); setTitle(ann.title); setContent(ann.content||''); setAnnImage(ann.image||null); setNotifyTime1(ann.notifyTimes?.[0]||''); setNotifyTime2(ann.notifyTimes?.[1]||''); setAnnMode(ann.mode||'confirm'); setView('edit'); };
  const currentAnn = selectedAnn ? announcements.find(a => a.id === selectedAnn.id) || selectedAnn : null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-purple-700 text-white p-4 flex justify-between items-center shrink-0">
          <h2 className="font-bold flex items-center gap-2"><Megaphone className="w-5 h-5"/> お知らせ</h2>
          <div className="flex items-center gap-2">
            {view === 'list' && <button onClick={() => { setTitle(''); setContent(''); setAnnImage(null); setNotifyTime1(''); setNotifyTime2(''); setView('create'); }} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded font-bold">＋ 投稿</button>}
            {view !== 'list' && <button onClick={() => setView('list')} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded font-bold">← 一覧</button>}
            <button onClick={onClose}><X className="w-5 h-5"/></button>
          </div>
        </div>
        {workerName && <div className="px-4 py-1.5 bg-purple-50 border-b flex items-center gap-2 shrink-0"><User className="w-3.5 h-3.5 text-purple-500"/><span className="text-sm font-bold text-purple-700">{workerName}</span></div>}
        {!workerName && <div className="px-4 py-2 bg-red-50 border-b text-center shrink-0 text-xs font-bold text-red-500">⚠ ヘッダーから使用者を選択してください</div>}
        <div className="flex-1 overflow-y-auto p-4">
          {view === 'list' && (<div className="space-y-2">{announcements.length === 0 && <div className="text-center py-10 text-slate-400">お知らせはありません</div>}{announcements.map(ann => {
            const confirmed = (ann.confirmedBy||[]).includes(workerName);
            return (<div key={ann.id} onClick={() => openDetail(ann)} className={`border rounded-xl p-3 cursor-pointer hover:shadow-md transition-all ${confirmed ? 'bg-white border-slate-200' : 'bg-purple-50 border-purple-300 ring-1 ring-purple-200'}`}>
              <div className="flex justify-between items-start"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1">{!confirmed && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">未読</span>}<h3 className="font-black text-slate-800 truncate">{ann.title}</h3></div><div className="text-[10px] text-slate-400 flex items-center gap-2"><span className="font-bold text-purple-500">{ann.author}</span><span>{new Date(ann.createdAt).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>{(ann.comments||[]).length > 0 && <span className="text-blue-500">💬{ann.comments.length}</span>}<span className="text-emerald-500">✓{(ann.confirmedBy||[]).length}</span></div></div><ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1"/></div>
            </div>);
          })}</div>)}
          {view === 'detail' && currentAnn && (<div className="space-y-4">
            <div><h3 className="text-xl font-black text-slate-800 mb-1">{currentAnn.title}</h3><div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap"><span className="font-bold text-purple-500">{currentAnn.author}</span><span>{new Date(currentAnn.createdAt).toLocaleString('ja-JP')}</span>{currentAnn.notifyTimes?.length > 0 && <span className="bg-blue-100 text-blue-600 px-1.5 rounded font-bold flex items-center gap-0.5"><Bell className="w-3 h-3"/> {currentAnn.notifyTimes.join(', ')}</span>}</div></div>
            {currentAnn.content && <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border">{currentAnn.content}</p>}
            {currentAnn.image && <img src={currentAnn.image} alt="" className="max-h-60 rounded-lg border"/>}
            <div className="flex items-center gap-2"><span className={`text-xs font-bold px-2 py-0.5 rounded ${(currentAnn.mode||'confirm')==='confirm'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{(currentAnn.mode||'confirm')==='confirm'?'✓ 確認モード':'🔔 アラームモード'}</span></div>
            {(currentAnn.mode||'confirm')==='confirm' && workerName && (<div className="flex items-center gap-3">{!(currentAnn.confirmedBy||[]).includes(workerName) ? <button onClick={() => handleConfirm(currentAnn)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Check className="w-5 h-5"/> 確認しました</button> : <div className="flex-1 py-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5"/> 確認済み</div>}</div>)}
            {(currentAnn.confirmedBy||[]).length > 0 && <div className="text-xs text-slate-500"><span className="font-bold">確認済み ({(currentAnn.confirmedBy||[]).length}名): </span>{(currentAnn.confirmedBy||[]).join(', ')}</div>}
            <div className="flex gap-2 border-t pt-3"><button onClick={() => openEdit(currentAnn)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1"><Pencil className="w-3.5 h-3.5"/> 編集</button><button onClick={() => {if(confirm('削除しますか？')){deleteData('announcements',currentAnn.id);setView('list');}}} className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5"/> 削除</button></div>
            {(currentAnn.mode||'confirm')==='confirm' && (<div className="border-t pt-3"><div className="text-xs font-bold text-slate-500 mb-2">コメント ({(currentAnn.comments||[]).length})</div><div className="space-y-2 mb-3">{(currentAnn.comments||[]).map((c,ci) => (<div key={ci} className="bg-slate-50 rounded-lg p-2"><div className="flex justify-between items-center mb-0.5"><span className="text-xs font-bold text-blue-600">{c.author}</span><span className="text-[9px] text-slate-300">{new Date(c.createdAt).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div><div className="text-sm text-slate-700">{c.text}</div></div>))}</div>{workerName && <div className="flex gap-2"><input value={newComment} onChange={e=>setNewComment(e.target.value)} className="flex-1 border rounded px-3 py-2 text-sm" placeholder="コメント..." onKeyDown={e=>{if(e.key==='Enter')addComment(currentAnn);}}/><button onClick={()=>addComment(currentAnn)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700">送信</button></div>}</div>)}
          </div>)}
          {(view==='create'||view==='edit') && (<div className="space-y-3">
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">モード</label><div className="flex gap-2"><button onClick={()=>setAnnMode('confirm')} className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 border-2 ${annMode==='confirm'?'bg-emerald-600 text-white border-emerald-700':'bg-white text-slate-500 border-slate-200'}`}><CheckCircle2 className="w-4 h-4"/> 確認</button><button onClick={()=>setAnnMode('alarm')} className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 border-2 ${annMode==='alarm'?'bg-amber-500 text-white border-amber-600':'bg-white text-slate-500 border-slate-200'}`}><Bell className="w-4 h-4"/> アラーム</button></div></div>
            <div><label className="text-xs font-bold text-slate-500">タイトル</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full border rounded p-2 text-sm font-bold" placeholder="例: 明日の会議"/></div>
            <div><label className="text-xs font-bold text-slate-500">内容</label><textarea value={content} onChange={e=>setContent(e.target.value)} className="w-full border rounded p-2 text-sm h-24" placeholder="詳細..."/></div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><label className="text-xs font-bold text-blue-700 flex items-center gap-1 mb-2"><Bell className="w-3.5 h-3.5"/> 通知時間</label><div className="flex gap-3"><div className="flex-1"><input type="time" value={notifyTime1} onChange={e=>setNotifyTime1(e.target.value)} className="w-full border rounded p-1.5 text-sm"/></div><div className="flex-1"><input type="time" value={notifyTime2} onChange={e=>setNotifyTime2(e.target.value)} className="w-full border rounded p-1.5 text-sm"/></div></div></div>
            <button onClick={view==='edit'?handleUpdate:handlePost} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700">{view==='edit'?'更新':'投稿'}</button>
          </div>)}
        </div>
      </div>
    </div>
  );
};

            export default function FinalInspectionApp() {
    // 使用者選択
    const [currentUserName, setCurrentUserName] = useState(() => { try { return localStorage.getItem('fi_currentUser') || ''; } catch { return ''; } });
    const selectUser = (name) => { setCurrentUserName(name); try { localStorage.setItem('fi_currentUser', name); } catch(e) {} };

    const [user, setUser] = useState(null);
            const [db, setDb] = useState(null);
            const [isConnected, setIsConnected] = useState(false);
            const [lots, setLots] = useState([]);
            const [workers, setWorkers] = useState([]);
            const [notes, setNotes] = useState([]);
            const [announcements, setAnnouncements] = useState([]);
            const [showNoteModal, setShowNoteModal] = useState(false);
            const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
            const [showIndirectModal, setShowIndirectModal] = useState(false);
            const [showDailySummary, setShowDailySummary] = useState(false);
            const [activeIndirect, setActiveIndirect] = useState(null);
            const [indirectWork, setIndirectWork] = useState([]);
            const [announceBanner, setAnnounceBanner] = useState(null);
            useEffect(() => {
              if (!announcements || announcements.length === 0) return;
              const checkNotify = () => {
                const now = new Date();
                const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                announcements.forEach(ann => { if (ann.notifyTimes?.includes(hhmm)) { setAnnounceBanner(ann); setTimeout(() => setAnnounceBanner(prev => prev?.id === ann.id ? null : prev), 30000); } });
              };
              checkNotify();
              const iv = setInterval(checkNotify, 60000);
              return () => clearInterval(iv);
            }, [announcements]);
            const [settings, setSettings] = useState({mapZones: INITIAL_MAP_ZONES, packagingPhotoTopics: ['製品前', '製品後', '製品右', '製品左', '付属品1', '付属品2'] });
            const [csvMapping, setCsvMapping] = useState(INITIAL_CSV_MAPPING);
            const [itemCsvMapping, setItemCsvMapping] = useState(INITIAL_ITEM_CSV_MAPPING);
            const [masterItems, setMasterItems] = useState(FINAL_INSPECTION_DATA);
            const [breakAlerts, setBreakAlerts] = useState(INITIAL_BREAK_ALERTS);
            const [complaintOptions, setComplaintOptions] = useState(INITIAL_COMPLAINT_OPTIONS);
            const [complaintOptionsText, setComplaintOptionsText] = useState("手順が分かりにくい\n部品が取り出しにくい\n工具が使いにくい\n図面が見づらい\n部品が不足している");
            const [defectProcessOptions, setDefectProcessOptions] = useState(INITIAL_DEFECT_PROCESS_OPTIONS);
            const [defectProcessOptionsText, setDefectProcessOptionsText] = useState(INITIAL_DEFECT_PROCESS_OPTIONS.join('\n'));
            const [packagingPhotoTopicsText, setPackagingPhotoTopicsText] = useState("製品前\n製品後\n製品右\n製品左\n付属品1\n付属品2");
            const [customTargetTimes, setCustomTargetTimes] = useState({ });
            const [targetTimeHistory, setTargetTimeHistory] = useState([]);

            const [activeTab, setActiveTab] = useState('inspection');
            const [showLotModal, setShowLotModal] = useState(false);
            const [editingLot, setEditingLot] = useState(null);
            const [executionLotId, setExecutionLotId] = useState(null);
            const [isLayoutMode, setIsLayoutMode] = useState(false);
            const [localZones, setLocalZones] = useState([]);
            const [localFontSize, setLocalFontSize] = useState(16);
            const [fontSizes, setFontSizes] = useState({});
            const mapRef = useRef(null);
            const [confirmModal, setConfirmModal] = useState({isOpen: false, title: '', message: '', action: null, color: 'bg-red-600' });
            const [showBreakAlert, setShowBreakAlert] = useState(null);

            const [sortOrder, setSortOrder] = useState('entry_asc');
            const [viewMode, setViewMode] = useState('grid');
            const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');
            const [searchQuery, setSearchQuery] = useState('');

            const [selectedConditions, setSelectedConditions] = useState([]);
            const [showPhotoManager, setShowPhotoManager] = useState(false);

            const defectHistory = useMemo(() => {
                return lots.flatMap(l =>
                    (l.interruptions || [])
                        .filter(i => i.type === 'defect')
                        .map(i => ({
                            model: l.model || '',
                            orderNo: l.orderNo || '',
                            stepId: i.stepInfo?.stepId || null,
                            stepCategory: i.stepInfo?.category || '',
                            stepTitle: i.stepInfo?.title || '',
                            label: i.label || '',
                            causeProcess: i.causeProcess || '',
                            timestamp: i.timestamp,
                            workerName: i.workerName || '',
                            photoCount: i.photos?.length || 0
                        }))
                );
            }, [lots]);

    useEffect(() => {
        if (!FIREBASE_CONFIG.apiKey) return;
            const app = initializeApp(FIREBASE_CONFIG);
            const auth = getAuth(app);
            const firestore = getFirestore(app);

            // Firebase Emulator接続設定を無効化（実際のFirebase環境に接続します）

            setDb(firestore);
        const initAuth = async () => {
            const isUserConfig = USER_DEFINED_CONFIG.apiKey && USER_DEFINED_CONFIG.apiKey.length > 0;
            if (isUserConfig) {await signInAnonymously(auth); } else {
                try { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {await signInWithCustomToken(auth, __initial_auth_token); } else {await signInAnonymously(auth); } } catch (error) {console.warn("Auth failed", error); await signInAnonymously(auth); }
            }
        };
            initAuth();
        onAuthStateChanged(auth, (u) => {setUser(u); setIsConnected(!!u); });
    }, []);

    useEffect(() => {
        if (!user || !db) return;
        const getPath = (colName) => collection(db, 'artifacts', APP_DATA_ID, 'public', 'data', colName);
            const unsubs = [
            onSnapshot(getPath('lots'), (snap) => setLots(snap.docs.map(d => ({...d.data(), id: d.id })))),
            onSnapshot(getPath('workers'), (snap) => setWorkers(snap.docs.map(d => ({...d.data(), id: d.id })))),
            onSnapshot(getPath('target_time_history'), (snap) => setTargetTimeHistory(snap.docs.map(d => ({...d.data(), id: d.id })))),
            onSnapshot(getPath('notes'), (snap) => setNotes(snap.docs.map(d => ({...d.data(), id: d.id})).sort((a,b) => (b.createdAt||0) - (a.createdAt||0)))),
            onSnapshot(getPath('announcements'), (snap) => setAnnouncements(snap.docs.map(d => ({...d.data(), id: d.id})).sort((a,b) => (b.createdAt||0) - (a.createdAt||0)))),
            onSnapshot(getPath('indirectWork'), (snap) => setIndirectWork(snap.docs.map(d => ({...d.data(), id: d.id})).sort((a,b) => (b.startTime||0) - (a.startTime||0)))),
            onSnapshot(doc(db, 'artifacts', APP_DATA_ID, 'public', 'data', 'settings', 'config'), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
            const currentZones = data.mapZones !== undefined ? data.mapZones : INITIAL_MAP_ZONES;
                    setSettings(prev => ({...prev, ...data, mapZones: currentZones }));
            setLocalZones(currentZones);
            setLocalFontSize(data.baseFontSize || 16);
            if (data.fontSizes) setFontSizes(data.fontSizes);
            if (data.csvMapping) setCsvMapping(data.csvMapping);
            if (data.itemCsvMapping) setItemCsvMapping(data.itemCsvMapping);
            if (data.masterItems) setMasterItems(data.masterItems);
            if (data.breakAlerts) setBreakAlerts(data.breakAlerts);
            if (data.customTargetTimes) setCustomTargetTimes(data.customTargetTimes);
            if (data.complaintOptions) {
                setComplaintOptions(data.complaintOptions);
            let opts = "手順が分かりにくい\n部品が取り出しにくい\n工具が使いにくい\n図面が見づらい\n部品が不足している";
            if (Array.isArray(data.complaintOptions)) {
                opts = data.complaintOptions.join('\n');
                        }
            setComplaintOptionsText(opts);
                    }
            let photoOpts = "製品前\n製品後\n製品右\n製品左\n付属品1\n付属品2";
            if (data.packagingPhotoTopics && Array.isArray(data.packagingPhotoTopics)) {
                photoOpts = data.packagingPhotoTopics.join('\n');
                    }
            setPackagingPhotoTopicsText(photoOpts);
            if (data.defectProcessOptions && Array.isArray(data.defectProcessOptions)) {
                setDefectProcessOptions(data.defectProcessOptions);
                setDefectProcessOptionsText(data.defectProcessOptions.join('\n'));
            }
                } else {
                setLocalZones(INITIAL_MAP_ZONES);
                }
            })
            ];
        return () => unsubs.forEach(u => u());
    }, [user, db]);

    useEffect(() => {
                document.documentElement.style.fontSize = `${localFontSize}px`;
                applyFontSizes(fontSizes);
    }, [localFontSize, fontSizes]);

    useEffect(() => {
        const checkAlerts = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            breakAlerts.forEach(alert => {
                if (!alert.enabled) return;
            const [alertHour, alertMinute] = alert.time.split(':').map(Number);
            let targetHour = alertHour;
            let targetMinute = alertMinute - 10;
            if (targetMinute < 0) {
                targetMinute += 60;
            targetHour -= 1;
                }
            if (currentHour === targetHour && currentMinute === targetMinute) {
                setShowBreakAlert(alert.message);
                }
            });
        };
            const interval = setInterval(checkAlerts, 60000);
            checkAlerts();
        return () => clearInterval(interval);
    }, [breakAlerts]);

    const cleanUndefined = (obj) => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) return obj.map(cleanUndefined);
        if (typeof obj === 'object' && obj.constructor === Object) {
            const cleaned = {};
            for (const [k, v] of Object.entries(obj)) { if (v !== undefined) cleaned[k] = cleanUndefined(v); }
            return cleaned;
        }
        return obj;
    };
    const saveData = async (col, id, data) => { if (!user || !db) return; await setDoc(doc(db, 'artifacts', APP_DATA_ID, 'public', 'data', col, id), {...cleanUndefined(data), updatedAt: serverTimestamp() }, {merge: true }); };
    const deleteData = async (col, id) => { if (!user || !db) return; await deleteDoc(doc(db, 'artifacts', APP_DATA_ID, 'public', 'data', col, id)); };
    const saveSettingsConfig = async (newSettings) => { if (!user || !db) return; await setDoc(doc(db, 'artifacts', APP_DATA_ID, 'public', 'data', 'settings', 'config'), newSettings, {merge: true }); };

    const handleCreateZone = async (newZone) => {
        const newZones = [...localZones, newZone];
            setLocalZones(newZones);
            await saveSettingsConfig({mapZones: newZones });
    };

    const availableConditions = useMemo(() => {
        const conditions = new Set();
        masterItems.forEach(item => {
            if (item.specialCondition) conditions.add(item.specialCondition);
        });
            return Array.from(conditions);
    }, [masterItems]);

    const sortedLots = useMemo(() => {
                let temp = lots.filter(l => l.status !== 'completed');
            if (selectedZoneFilter !== 'all') {
                temp = temp.filter(l => l.mapZoneId === selectedZoneFilter);
        }
            if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            temp = temp.filter(l =>
            (l.orderNo && l.orderNo.toLowerCase().includes(lowerQ)) ||
            (l.model && l.model.toLowerCase().includes(lowerQ))
            );
        }
            if (sortOrder === 'entry_asc') {
                temp.sort((a, b) => (getSafeTime(a.entryAt)) - (getSafeTime(b.entryAt)));
        } else if (sortOrder === 'entry_desc') {
                temp.sort((a, b) => (getSafeTime(b.entryAt)) - (getSafeTime(a.entryAt)));
        } else if (sortOrder === 'due_asc') {
                temp.sort((a, b) => {
                    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                    return aTime - bTime;
                });
        }
            return temp;
    }, [lots, sortOrder, selectedZoneFilter, searchQuery]);

    const handleAddLot = async (formData) => {
        const {model, orderNo, quantity, entryAt, priority, dueDate, appearanceNote} = formData;
            const id = editingLot ? editingLot.id : generateId();
            const timestamp = Date.now();

            const hasTail = formData.hasTail === 'on';
            const qty = Number(quantity);
            const serials = [];
            for (let i = 0; i < qty; i++) serials.push(formData[`serial_${i}`] || `#${i + 1}`);

            let finalSteps = [];

            if (editingLot) {
                finalSteps = [...editingLot.steps];
            if (!hasTail && editingLot.hasTail) {
                finalSteps = finalSteps.filter(s => s.targetPart !== 'tail');
            }
            if (hasTail && !editingLot.hasTail) {
                const tailItemsToAdd = masterItems.filter(ms => ms.targetPart === 'tail' && (!ms.specialCondition || selectedConditions.includes(ms.specialCondition)));
                tailItemsToAdd.forEach(item => {
                    if (!finalSteps.some(fs => fs.title === item.title && fs.category === item.category)) {
                finalSteps.push({ ...item, id: generateId() });
                    }
                });
            }

            finalSteps = finalSteps.filter(s => {
                if (s.specialCondition && !selectedConditions.includes(s.specialCondition)) return false;
            return true;
            });

            selectedConditions.forEach(cond => {
                const alreadyExists = finalSteps.some(s => s.specialCondition === cond);
            if (!alreadyExists) {
                    const itemsToAdd = masterItems.filter(ms => ms.specialCondition === cond && (hasTail || ms.targetPart !== 'tail'));
                    itemsToAdd.forEach(item => finalSteps.push({...item, id: generateId() }));
                }
            });
        } else {
                finalSteps = masterItems.filter(s => {
                    if (!hasTail && s.targetPart === 'tail') return false;
                    if (s.specialCondition) return selectedConditions.includes(s.specialCondition);
                    return true;
                }).map(s => ({ ...s, id: generateId() }));
        }

        finalSteps = finalSteps.map(s => {
            const stepKey = `${s.category}_${s.title}`;
            let newTarget = s.targetTime;
            if (model && customTargetTimes[`model_${model}`]?.[stepKey]) {
                newTarget = customTargetTimes[`model_${model}`][stepKey];
            }
            if (appearanceNote && customTargetTimes[`app_${appearanceNote}`]?.[stepKey]) {
                newTarget = customTargetTimes[`app_${appearanceNote}`][stepKey];
            }
            return {...s, targetTime: newTarget };
        });

            const lotData = {
                id, model, orderNo, serialNo: orderNo, quantity: qty,
            entryAt: entryAt ? new Date(entryAt).getTime() : timestamp,
            priority: priority || 'normal', dueDate: dueDate || '',
            appearanceNote, hasTail,
            specialConditions: selectedConditions,
            unitSerialNumbers: serials,
            status: editingLot ? editingLot.status : 'waiting',
            location: editingLot ? editingLot.location : settings.mapZones?.[0]?.id || 'zone_inspection_1',
            mapZoneId: editingLot ? editingLot.mapZoneId : settings.mapZones?.[0]?.id || 'zone_inspection_1',
            steps: finalSteps,
            templateId: INITIAL_TEMPLATE.id, createdAt: editingLot ? editingLot.createdAt : timestamp,
            tasks: editingLot ? editingLot.tasks : { }, interruptions: editingLot ? editingLot.interruptions : []
        };
            await saveData('lots', id, lotData); setShowLotModal(false); setEditingLot(null); setSelectedConditions([]);
    };

    const downloadTemplateCsv = (filename, headers, rows) => {
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            const blob = new Blob([bom, csvContent], {type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click();
    };

    const downloadLotCsvTemplate = () => {
        const labels = {orderNo: '指図番号', model: '型式', quantity: '台数', dueDate: '納期', entryAt: '入荷日時', appearanceNote: '外観図備考', hasTail: 'テール有無', serialNoStart: '機番1' };
            const indexMap = { };
            let maxIndex = 0;
        Object.keys(csvMapping).forEach(key => { const idx = colToIndex(csvMapping[key]); if (idx >= 0) {indexMap[key] = idx; if (idx > maxIndex) maxIndex = idx; } });
            const headerRow = Array(maxIndex + 1).fill('');
        Object.keys(indexMap).forEach(key => {headerRow[indexMap[key]] = labels[key] || key; });

        const activeLots = lots.filter(l => l.status !== 'completed');
        const dataRows = activeLots.map(lot => {
            const serialStartIdx = indexMap.serialNoStart;
            const lotMaxIndex = serialStartIdx >= 0 ? Math.max(maxIndex, serialStartIdx + lot.quantity - 1) : maxIndex;
            const row = Array(lotMaxIndex + 1).fill('');
            if (indexMap.orderNo >= 0) row[indexMap.orderNo] = `"${lot.orderNo || ''}"`;
            if (indexMap.model >= 0) row[indexMap.model] = `"${lot.model || ''}"`;
            if (indexMap.quantity >= 0) row[indexMap.quantity] = lot.quantity;
            if (indexMap.dueDate >= 0) row[indexMap.dueDate] = `"${lot.dueDate || ''}"`;
            if (indexMap.entryAt >= 0) row[indexMap.entryAt] = lot.entryAt ? `"${toDatetimeLocal(getSafeTime(lot.entryAt))}"` : '';
            if (indexMap.appearanceNote >= 0) row[indexMap.appearanceNote] = `"${lot.appearanceNote || ''}"`;
            if (indexMap.hasTail >= 0) row[indexMap.hasTail] = lot.hasTail ? 'あり' : '';
            if (serialStartIdx >= 0 && lot.unitSerialNumbers) {
                lot.unitSerialNumbers.forEach((sn, i) => { row[serialStartIdx + i] = `"${sn || ''}"`; if (!headerRow[serialStartIdx + i]) headerRow[serialStartIdx + i] = `機番${i + 1}`; });
            }
            return row;
        });
            downloadTemplateCsv(`lot_template_${toDateShort(Date.now()).replace('/', '')}.csv`, headerRow, dataRows);
    };

    const downloadItemCsvTemplate = () => {
        const labels = {category: 'カテゴリ', title: '項目名', description: '内容・基準', targetPart: '適用対象', targetTime: '目標時間', checkType: 'チェック方式', tags: 'タグ(重要等)', specialCondition: '特注追加条件', defaultCount: '基準数量(員数のみ)' };
            const indexMap = { };
            let maxIndex = 0;
        Object.keys(itemCsvMapping).forEach(key => { const idx = colToIndex(itemCsvMapping[key]); if (idx >= 0) {indexMap[key] = idx; if (idx > maxIndex) maxIndex = idx; } });
            const headerRow = Array(maxIndex + 1).fill('');
        Object.keys(indexMap).forEach(key => {headerRow[indexMap[key]] = labels[key] || key; });

        const dataRows = masterItems.map(item => {
            const row = Array(maxIndex + 1).fill('');
            if (indexMap.category >= 0) row[indexMap.category] = `"${item.category || ''}"`;
            if (indexMap.title >= 0) row[indexMap.title] = `"${item.title || ''}"`;
            if (indexMap.description >= 0) row[indexMap.description] = `"${item.description || ''}"`;
            let targetPartLabel = '共通';
            if (item.targetPart === 'main') targetPartLabel = '本体';
            if (item.targetPart === 'tail') targetPartLabel = 'テール';
            if (indexMap.targetPart >= 0) row[indexMap.targetPart] = `"${targetPartLabel}"`;
            if (indexMap.targetTime >= 0) row[indexMap.targetTime] = item.targetTime;
            let checkTypeLabel = '個別';
            if (item.checkType === 'count') checkTypeLabel = '員数';
            if (indexMap.checkType >= 0) row[indexMap.checkType] = `"${checkTypeLabel}"`;
            let tagsLabel = '';
            if (item.tags?.includes('important')) tagsLabel = '重要';
            if (indexMap.tags >= 0) row[indexMap.tags] = `"${tagsLabel}"`;
            if (indexMap.specialCondition >= 0) row[indexMap.specialCondition] = `"${item.specialCondition || ''}"`;
            if (indexMap.defaultCount >= 0) row[indexMap.defaultCount] = item.defaultCount || '';
            return row;
        });
            downloadTemplateCsv(`inspection_items_template_${toDateShort(Date.now()).replace('/', '')}.csv`, headerRow, dataRows);
    };

    const handleCsvUpload = async (e) => {
        const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split(/\r\n|\n/).map(row => row.split(','));
            let count = 0; let startIndex = 0;
            const orderNoIdx = colToIndex(csvMapping.orderNo);
            if (rows.length > 0 && orderNoIdx >= 0 && rows[0][orderNoIdx] && rows[0][orderNoIdx].includes('指図')) startIndex = 1;

            for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i];
            if (row.length < 2) continue;
                const getVal = (key) => { const idx = colToIndex(csvMapping[key]); return idx >= 0 && row[idx] ? row[idx].replace(/^"|"$/g, '').trim() : ''; };
            const orderNo = getVal('orderNo');
            if (!orderNo) continue;
                const existingLot = lots.find(l => l.orderNo === orderNo);
            const id = existingLot ? existingLot.id : generateId();
            const timestamp = Date.now();
            const model = getVal('model') || (existingLot ? existingLot.model : '不明');
            const quantity = Number(getVal('quantity')) || (existingLot ? existingLot.quantity : 1);
            const dueDateStr = getVal('dueDate');
            const dueDate = dueDateStr ? dueDateStr.replace(/\//g, '-') : (existingLot ? existingLot.dueDate : '');
            const entryAtStr = getVal('entryAt');
            const entryAt = entryAtStr ? new Date(entryAtStr).getTime() : (existingLot ? existingLot.entryAt : timestamp);
            const appearanceNote = getVal('appearanceNote') || (existingLot ? existingLot.appearanceNote : '');
            const hasTailVal = getVal('hasTail');
            const hasTail = hasTailVal ? ['あり', '1', 'true', 'yes', 'on'].includes(hasTailVal.toLowerCase()) : (existingLot ? existingLot.hasTail : false);

            const serials = [];
            const startIdx = colToIndex(csvMapping.serialNoStart);
                if (startIdx >= 0) {
                    for (let i = 0; i < quantity; i++) {
                        const val = row[startIdx + i];
            serials.push(val ? val.replace(/^"|"$/g, '').trim() : `#${i + 1}`);
                    }
                } else if (existingLot && existingLot.unitSerialNumbers) {
                serials.push(...existingLot.unitSerialNumbers);
                } else {
                    for (let i = 0; i < quantity; i++) serials.push(`#${i + 1}`);
                }

            const baseSteps = existingLot ? existingLot.steps : masterItems;
                let finalSteps = existingLot ? baseSteps : baseSteps.filter(s => {
                    if (!hasTail && s.targetPart === 'tail') return false;
            if (s.specialCondition) return false;
            return true;
                }).map(s => ({...s, id: generateId() }));

                finalSteps = finalSteps.map(s => {
                    const stepKey = `${s.category}_${s.title}`;
            let newTarget = s.targetTime;
            if (model && customTargetTimes[`model_${model}`]?.[stepKey]) {
                newTarget = customTargetTimes[`model_${model}`][stepKey];
                    }
            if (appearanceNote && customTargetTimes[`app_${appearanceNote}`]?.[stepKey]) {
                newTarget = customTargetTimes[`app_${appearanceNote}`][stepKey];
                    }
            return {...s, targetTime: newTarget };
                });

            const lotData = {
                id, model, orderNo, serialNo: orderNo, quantity,
            entryAt: isNaN(entryAt) ? timestamp : entryAt,
            priority: existingLot ? existingLot.priority : 'normal',
            dueDate, appearanceNote, hasTail,
            unitSerialNumbers: serials,
            status: existingLot ? existingLot.status : 'waiting',
            location: existingLot ? existingLot.location : settings.mapZones?.[0]?.id || 'zone_inspection_1',
            mapZoneId: existingLot ? existingLot.mapZoneId : settings.mapZones?.[0]?.id || 'zone_inspection_1',
            steps: finalSteps,
            templateId: INITIAL_TEMPLATE.id,
            createdAt: existingLot ? existingLot.createdAt : timestamp,
            updatedAt: serverTimestamp(),
            tasks: existingLot ? existingLot.tasks : { },
            interruptions: existingLot ? existingLot.interruptions : []
                };
            await saveData('lots', id, lotData);
            count++;
            }
            alert(`${count}件のデータを処理しました。`);
            setShowLotModal(false);
        };
            reader.readAsText(file, 'Shift_JIS');
    };

    const handleInspectionItemCsvUpload = async (e) => {
        const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split(/\r\n|\n/).map(row => row.split(','));
            const newItems = [];
            let startIndex = 0;
            const catIdx = colToIndex(itemCsvMapping.category);
            if (rows.length > 0 && catIdx >= 0 && rows[0][catIdx] && rows[0][catIdx].includes('カテゴリ')) startIndex = 1;

            for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i];
            if (row.length < 2) continue;
                const getVal = (key) => { const idx = colToIndex(itemCsvMapping[key]); return idx >= 0 && row[idx] ? row[idx].replace(/^"|"$/g, '').trim() : ''; };
            const title = getVal('title');
            if (!title) continue;
            const targetPartVal = getVal('targetPart');
            let targetPart = 'both';
            if (targetPartVal.includes('本体')) targetPart = 'main';
            if (targetPartVal.includes('テール')) targetPart = 'tail';

            const newItem = {
                id: generateId(),
            category: getVal('category') || 'その他',
            title: title,
            description: getVal('description'),
            targetPart: targetPart,
            targetTime: Number(getVal('targetTime')) || 60,
            checkType: getVal('checkType').includes('員数') ? 'count' : 'individual',
            defaultCount: Number(getVal('defaultCount')) || null,
            tags: getVal('tags').includes('重要') ? ['important'] : [],
            specialCondition: getVal('specialCondition') || null
                };
            newItems.push(newItem);
            }
            if (newItems.length > 0) {
                setMasterItems(newItems);
            await saveSettingsConfig({masterItems: newItems, itemCsvMapping });
            alert(`${newItems.length}件の検査項目を取り込みました。`);
            }
        };
            reader.readAsText(file, 'Shift_JIS');
    };

    const handleMoveLot = (lotId, zoneId) => {saveData('lots', lotId, { mapZoneId: zoneId, location: zoneId }); };
    const handleZoneDragStart = (e, zoneId) => { if (!isLayoutMode) return; e.dataTransfer.setData('zoneId', zoneId); e.stopPropagation(); };
    const handleMapDrop = (e) => {e.preventDefault(); if (!mapRef.current) return; const zoneId = e.dataTransfer.getData('zoneId'); if (zoneId && isLayoutMode) { const rect = mapRef.current.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * 100; const y = ((e.clientY - rect.top) / rect.height) * 100; const newZones = localZones.map(z => { if (z.id === zoneId) { return {...z, x: Math.max(0, Math.min(100 - z.w, x)), y: Math.max(0, Math.min(100 - z.h, y)) }; } return z; }); setLocalZones(newZones); } };
    const saveLayout = () => {saveSettingsConfig({ mapZones: localZones }); setIsLayoutMode(false); };
    const handleAddZone = () => { const newZone = {id: `zone_${generateId()}`, name: '新しいエリア', x: 10, y: 10, w: 20, h: 30, color: ZONE_COLORS[0].class, isPersonal: false }; const newZones = [...localZones, newZone]; setLocalZones(newZones); saveSettingsConfig({mapZones: newZones }); };
    const handleUpdateZone = (id, field, value) => { const newZones = localZones.map(z => z.id === id ? {...z, [field]: value } : z); setLocalZones(newZones); };
    const handleSaveZoneChanges = () => {
        const newComplaintOptions = complaintOptionsText.split('\n').map(s => s.trim()).filter(Boolean);
        const newPhotoTopics = packagingPhotoTopicsText.split('\n').map(s => s.trim()).filter(Boolean);
        const newDefectProcessOptions = defectProcessOptionsText.split('\n').map(s => s.trim()).filter(Boolean);
        setDefectProcessOptions(newDefectProcessOptions);
            saveSettingsConfig({mapZones: localZones, baseFontSize: localFontSize, fontSizes, csvMapping, itemCsvMapping, breakAlerts, complaintOptions: newComplaintOptions, packagingPhotoTopics: newPhotoTopics, defectProcessOptions: newDefectProcessOptions });
            alert('設定を保存しました');
    };

    const triggerDeleteZone = (id) => {
                setConfirmModal({
                    isOpen: true, title: '削除確認', message: 'このエリアを削除しますか？', confirmText: '削除する', confirmColor: 'bg-red-600',
                    action: () => {
                        const newZones = localZones.filter(z => z.id !== id);
                        setLocalZones(newZones);
                        saveSettingsConfig({ mapZones: newZones });
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                });
    };

    const triggerDeleteLot = (id) => {
                setConfirmModal({
                    isOpen: true, title: '削除確認', message: 'このロットを削除しますか？', confirmText: '削除', confirmColor: 'bg-red-600',
                    action: () => { deleteData('lots', id); setConfirmModal(prev => ({ ...prev, isOpen: false })); }
                });
    };

            const [modalQty, setModalQty] = useState(1);
            const [serialInputs, setSerialInputs] = useState([]);
            const [serialPrefix, setSerialPrefix] = useState('');
            const [serialStartNum, setSerialStartNum] = useState(1);

    useEffect(() => {
        if (editingLot) {
                setModalQty(editingLot.quantity);
            setSerialInputs(editingLot.unitSerialNumbers || []);
            setSelectedConditions(editingLot.specialConditions || []);
        } else {
                setModalQty(1);
            setSerialInputs([]);
            setSelectedConditions([]);
        }
    }, [editingLot]);

    const handleGenerateSerials = () => {
        const newSerials = Array.from({length: modalQty }, (_, i) => `${serialPrefix}${serialStartNum + i}`);
            setSerialInputs(newSerials);
    };

    const toggleCondition = (cond) => {
        if (selectedConditions.includes(cond)) setSelectedConditions(selectedConditions.filter(c => c !== cond));
            else setSelectedConditions([...selectedConditions, cond]);

    };

            return (
            <div className="h-screen bg-slate-100 font-sans flex flex-col text-slate-900 overflow-hidden relative">
                {showBreakAlert && (
                    <div className="absolute top-0 left-0 right-0 bg-orange-500 text-white z-[100] p-4 flex justify-between items-center shadow-lg animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-3 text-lg font-bold"><Bell className="w-6 h-6 animate-bounce" />{String(showBreakAlert)}</div>
                        <button onClick={() => setShowBreakAlert(null)} className="bg-white/20 hover:bg-white/30 rounded-full p-1"><X className="w-6 h-6" /></button>
                    </div>
                )}

                <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} confirmText={confirmModal.confirmText} confirmColor={confirmModal.confirmColor} />
                <header data-fs="header" className="min-h-[3.5rem] h-auto py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between px-6 shadow-md z-50 shrink-0 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 p-1.5 rounded shrink-0"><ShieldCheck className="w-5 h-5 text-white" /></div>
                        <h1 className="font-bold text-lg tracking-tight whitespace-nowrap">Final Inspection <span className="text-xs font-normal text-slate-400 ml-1">Cloud</span></h1>
                        <div className="h-6 w-px bg-slate-600 mx-1"/>
                        {currentUserName ? (
                          <div className="flex items-center gap-1.5 bg-slate-700 rounded-full pl-2 pr-1 py-0.5">
                            <User className="w-3.5 h-3.5 text-emerald-400"/>
                            <span className="text-sm font-bold text-emerald-300">{currentUserName}</span>
                            <button onClick={() => selectUser('')} className="text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-600"><X className="w-3 h-3"/></button>
                          </div>
                        ) : (
                          <select onChange={e => selectUser(e.target.value)} value="" className="bg-transparent border border-red-400 rounded px-2 py-0.5 text-sm font-bold text-red-400 animate-pulse cursor-pointer">
                            <option value="" className="text-slate-800">⚠ 使用者選択</option>
                            {localZones.filter(z => z.isPersonal).map(z => <option key={z.id} value={z.name} className="text-slate-800">{z.name}</option>)}
                            {workers.map(w => <option key={w.id} value={w.name} className="text-slate-800">{w.name}</option>)}
                            <option value="フリー" className="text-slate-800">フリー</option>
                            <option value="管理者" className="text-slate-800">管理者</option>
                          </select>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-wrap bg-slate-800 rounded-lg p-1 gap-1">
                            <button onClick={() => { setActiveTab('inspection'); setSelectedZoneFilter('all'); setIsLayoutMode(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'inspection' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}><List className="w-4 h-4" /> 検査リスト</button>
                            <button onClick={() => { setActiveTab('map'); setIsLayoutMode(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'map' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}><MapIcon className="w-4 h-4" /> エリアマップ</button>
                            <button onClick={() => { setActiveTab('history'); setIsLayoutMode(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'history' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}><CheckSquare className="w-4 h-4" /> 完了履歴</button>
                            <button onClick={() => { setActiveTab('analytics'); setIsLayoutMode(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'analytics' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}><BarChart3 className="w-4 h-4" /> 分析</button>
                            <button onClick={() => { setActiveTab('settings'); setIsLayoutMode(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}><Settings className="w-4 h-4" /> 設定</button>
                        </div>
                        <button onClick={() => setShowIndirectModal(true)} className={`px-2 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm whitespace-nowrap ${activeIndirect ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}><Coffee className="w-3.5 h-3.5"/> {activeIndirect ? `${activeIndirect.category}...` : '間接作業'}</button>
                        <button onClick={() => setShowDailySummary(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-2 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"><Clock className="w-3.5 h-3.5"/> 日次集計</button>
                        <button onClick={() => setShowNoteModal(true)} className="relative bg-slate-600 hover:bg-slate-500 text-white px-2 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"><FileText className="w-3.5 h-3.5"/> ノート</button>
                        <button onClick={() => setShowAnnouncementModal(true)} className="relative bg-purple-600 hover:bg-purple-500 text-white px-2 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"><Megaphone className="w-3.5 h-3.5"/> お知らせ
                          {(() => { const unread = announcements.filter(a => (a.mode || 'confirm') === 'confirm' && !(a.confirmedBy || []).includes(currentUserName)).length; return unread > 0 ? <span className="absolute -top-1 -right-1 bg-red-500 text-[9px] text-white rounded-full w-4 h-4 flex items-center justify-center font-black">{unread}</span> : null; })()}
                        </button>
                        <button onClick={() => setShowPhotoManager(true)} className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 shadow-sm whitespace-nowrap"><ImageDown className="w-4 h-4" /> 画像管理</button>
                        <button onClick={() => { setEditingLot(null); setShowLotModal(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 shadow-sm whitespace-nowrap"><Plus className="w-4 h-4" /> 検査対象登録</button>
                    </div>
                </header>
                <main className="flex-1 overflow-hidden relative bg-slate-100 p-4">
                    {activeTab === 'inspection' && (
                        <div className="flex flex-col h-full gap-4">
                            <div className="flex flex-wrap justify-between items-center bg-white p-2 rounded-lg shadow-sm border border-slate-200 shrink-0 gap-2">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                        <MapPin className="w-4 h-4" /> エリア:
                                        <select value={selectedZoneFilter} onChange={(e) => setSelectedZoneFilter(e.target.value)} className="border rounded px-2 py-1 bg-slate-50 text-slate-800 max-w-[10rem] md:max-w-[12rem] truncate">
                                            <option value="all">すべて</option>
                                            {settings.mapZones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                        <ArrowUpDown className="w-4 h-4" /> 並び替え:
                                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border rounded px-2 py-1 bg-slate-50 text-slate-800">
                                            <option value="entry_asc">入荷日時 (早い順)</option>
                                            <option value="entry_desc">入荷日時 (遅い順)</option>
                                            <option value="due_asc">納期 (近い順)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border shadow-sm ml-2">
                                        <Search className="w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="指図・型式で検索..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="text-sm outline-none w-32 md:w-48 font-bold text-slate-700"
                                        />
                                    </div>
                                </div>
                                <div className="flex bg-slate-100 rounded p-1">
                                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="グリッド表示"><LayoutGrid className="w-5 h-5" /></button>
                                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="リスト表示"><List className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto min-h-0">
                                {sortedLots.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <Package className="w-16 h-16 mb-4 opacity-20" />
                                        <p>検査待ちの製品はありません</p>
                                        <button onClick={() => setShowLotModal(true)} className="mt-4 text-emerald-600 font-bold hover:underline">新規登録する</button>
                                    </div>
                                ) : (
                                    viewMode === 'grid' ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start pb-10">
                                            {sortedLots.map(lot => (
                                                <LotCard key={lot.id} lot={lot} workers={workers} mapZones={settings.mapZones} onOpenExecution={(l) => setExecutionLotId(l.id)} onEdit={(l) => { setEditingLot(l); setShowLotModal(true); }} onDelete={(id) => triggerDeleteLot(id)} showActions={true} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-lg shadow border overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs text-slate-500 uppercase">
                                                    <tr>
                                                        <th className="p-3 font-bold border-b">指図番号</th>
                                                        <th className="p-3 font-bold border-b">型式</th>
                                                        <th className="p-3 font-bold border-b text-center">台数</th>
                                                        <th className="p-3 font-bold border-b">入荷日時</th>
                                                        <th className="p-3 font-bold border-b">納期</th>
                                                        <th className="p-3 font-bold border-b">場所/担当</th>
                                                        <th className="p-3 font-bold border-b text-center">状態</th>
                                                        <th className="p-3 font-bold border-b text-right">操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm">
                                                    {sortedLots.map(lot => {
                                                        const isPaused = Object.values(lot.tasks || {}).some(t => t.status === 'paused');
                                                        return (
                                                            <tr key={lot.id} onClick={() => setExecutionLotId(lot.id)} className="hover:bg-blue-50 cursor-pointer transition-colors">
                                                                <td className="p-3 font-bold text-slate-800">{lot.orderNo}</td>
                                                                <td className="p-3">
                                                                    <div className="font-bold text-slate-700">{lot.model}</div>
                                                                    {lot.hasTail && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-1">テール有</span>}
                                                                </td>
                                                                <td className="p-3 text-center">{lot.quantity}</td>
                                                                <td className="p-3 text-slate-500 text-xs">{toDateShort(getSafeTime(lot.entryAt))} {toTimeShort(getSafeTime(lot.entryAt))}</td>
                                                                <td className="p-3 text-xs font-bold text-blue-600">{lot.dueDate || '-'}</td>
                                                                <td className="p-3 text-xs text-slate-500">{settings.mapZones?.find(z => z.id === lot.mapZoneId)?.name || '-'}</td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${lot.status === 'processing' ? (isPaused ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700') : 'bg-slate-100 text-slate-500'}`}>
                                                                        {lot.status === 'processing' ? (isPaused ? '一時停止' : '作業中') : '待機'}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                                        <button onClick={() => { setEditingLot(lot); setShowLotModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                                                                        <button onClick={() => triggerDeleteLot(lot.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'map' && (<div className="h-full flex flex-col gap-2"><div className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm border border-slate-200 shrink-0"><div className="text-sm font-bold text-slate-600 flex items-center gap-2"><MapIcon className="w-4 h-4" /> エリアマップ <span className="text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500">ドラッグ&ドロップでロットを移動できます</span></div><button onClick={() => isLayoutMode ? saveLayout() : setIsLayoutMode(true)} className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded border font-bold transition-colors ${isLayoutMode ? 'bg-green-600 text-white border-green-700 shadow-lg animate-pulse' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{isLayoutMode ? <><Save className="w-3 h-3" /> レイアウト保存</> : <><LayoutGrid className="w-3 h-3" /> レイアウト編集</>}</button></div><div ref={mapRef} onDragOver={(e) => e.preventDefault()} onDrop={handleMapDrop} className="flex-1 bg-white rounded-xl border border-slate-300 relative overflow-hidden shadow-inner" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>{localZones.map(zone => (<div key={zone.id} draggable={isLayoutMode} onDragStart={(e) => handleZoneDragStart(e, zone.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const lotId = e.dataTransfer.getData('lotId'); if (lotId && !isLayoutMode) handleMoveLot(lotId, zone.id); }} className={`absolute border-2 rounded-lg flex flex-col transition-all ${zone.color} ${isLayoutMode ? 'cursor-move border-dashed border-blue-500 z-50 shadow-xl opacity-90' : 'z-10'}`} style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}><div onClick={() => { if (!isLayoutMode) { setSelectedZoneFilter(zone.id); setActiveTab('inspection'); } }} title={!isLayoutMode ? "このエリアのリストを表示" : ""} className={`bg-black/5 px-2 py-1 text-xs font-bold text-slate-700 flex justify-between items-center select-none shrink-0 ${!isLayoutMode ? 'cursor-pointer hover:bg-black/10 transition-colors' : ''}`}><span>{zone.name}</span>{!isLayoutMode && <span className="bg-white/50 px-1.5 rounded-full text-[0.625rem]">{lots.filter(l => l.mapZoneId === zone.id && l.status !== 'completed').length}</span>}</div><div className="flex-1 p-2 overflow-y-auto space-y-2 relative">{lots.filter(l => l.mapZoneId === zone.id && l.status !== 'completed').sort((a, b) => { const aEntry = getSafeTime(a.entryAt); const bEntry = getSafeTime(b.entryAt); if (aEntry !== bEntry) return aEntry - bEntry; const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity; const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity; return aDue - bDue; }).map(lot => (<LotCard key={lot.id} lot={lot} workers={workers} mapZones={localZones} onOpenExecution={(l) => setExecutionLotId(l.id)} showActions={false} compact={true} />))}{isLayoutMode && (<div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm"><Move className="w-8 h-8 text-slate-400" /></div>)}</div>{isLayoutMode && (<div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize rounded-tl shadow-sm z-50" draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('resizeZoneId', zone.id); }} />)}</div>))}</div></div>)}
                    {activeTab === 'history' && (<HistoryView lots={lots} workers={workers} onDelete={(id) => triggerDeleteLot(id)} onEdit={(lot) => { setEditingLot(lot); setShowLotModal(true); }} onSaveLot={(id, data) => saveData('lots', id, data)} />)}
                    {activeTab === 'analytics' && (<AnalyticsView lots={lots} onSaveLot={(id, data) => saveData('lots', id, data)} masterItems={masterItems} customTargetTimes={customTargetTimes} onSaveSettings={saveSettingsConfig} onSaveHistory={(data) => saveData('target_time_history', generateId(), data)} targetTimeHistory={targetTimeHistory} defectProcessOptions={defectProcessOptions} currentUserName={currentUserName} indirectWork={indirectWork} />)}
                    {activeTab === 'settings' && (<div className="max-w-4xl mx-auto h-full flex flex-col gap-6 overflow-y-auto pb-10">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Type className="w-6 h-6 text-blue-600" /> 表示設定</h2>
                                <button onClick={handleSaveZoneChanges} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> 保存する</button>
                            </div>
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-slate-700 mb-2">全体の文字サイズ: {localFontSize}px <span className="text-xs font-normal text-slate-500">(標準: 16px)</span></label>
                                <div className="flex items-center gap-4">
                                    <span className="text-slate-400 text-sm font-bold">小</span>
                                    <input type="range" min="12" max="24" step="1" value={localFontSize} onChange={(e) => setLocalFontSize(Number(e.target.value))} className="w-full max-w-md cursor-pointer accent-blue-600" />
                                    <span className="text-slate-400 text-lg font-bold">大</span>
                                </div>
                            </div>

                            {/* 詳細フォントサイズ設定 */}
                            <div className="mb-8 border rounded-xl p-4 bg-slate-50">
                              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Type className="w-4 h-4"/> 各エリアの文字サイズ調整</h4>
                              <div className="space-y-3">
                                {FI_FONT_SIZE_AREAS.map(area => {
                                  const currentVal = fontSizes[area.key] || area.default;
                                  return (
                                    <div key={area.key} className="flex items-center gap-3">
                                      <div className="w-28 shrink-0"><div className="text-xs font-bold text-slate-700">{area.label}</div><div className="text-[9px] text-slate-400">{area.desc}</div></div>
                                      <input type="range" min={area.min} max={area.max} value={currentVal} onChange={e => setFontSizes(prev => ({...prev, [area.key]: parseInt(e.target.value)}))} className="flex-1 accent-blue-600 cursor-pointer"/>
                                      <span className="text-xs font-mono font-bold w-10 text-right">{currentVal}%</span>
                                      {currentVal !== 100 && <button onClick={() => setFontSizes(prev => ({...prev, [area.key]: 100}))} className="text-[9px] text-slate-400 hover:text-red-500">リセット</button>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="border-t pt-6 mb-8">
                                <BreakAlertSettings alerts={breakAlerts} onChange={setBreakAlerts} />
                            </div>

                            <div className="border-t pt-6 mb-8">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 mb-4"><Megaphone className="w-5 h-5 text-purple-600" /> 気付き・不満の報告オプション</h3>
                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                    <p className="text-xs text-purple-800 mb-3 font-bold">作業者が簡単に選択できるボタンの内容を設定します（1行に1つの選択肢を入力してください）</p>
                                    <textarea
                                        value={complaintOptionsText}
                                        onChange={e => setComplaintOptionsText(e.target.value)}
                                        className="w-full border rounded p-3 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                        placeholder="例: 手順が分かりにくい&#13;&#10;部品が取り出しにくい"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-6 mb-8">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 mb-4"><AlertTriangle className="w-5 h-5 text-rose-600" /> 不具合 原因工程オプション</h3>
                                <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                                    <p className="text-xs text-rose-800 mb-3 font-bold">不具合報告時に選択する原因工程を設定します（1行に1つの選択肢を入力してください）</p>
                                    <textarea
                                        value={defectProcessOptionsText}
                                        onChange={e => setDefectProcessOptionsText(e.target.value)}
                                        className="w-full border rounded p-3 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-rose-400"
                                        placeholder="例: 前班&#13;&#10;高木班&#13;&#10;設計"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-6 mb-8">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 mb-4"><Camera className="w-5 h-5 text-indigo-600" /> 荷姿写真 撮影項目オプション</h3>
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                    <p className="text-xs text-indigo-800 mb-2 font-bold">検査画面の「📸荷姿写真撮影」モーダルで表示される撮影対象（トピック）のリストを設定します（1行に1つの選択肢を入力）</p>
                                    <p className="text-[10px] text-indigo-700 mb-3 opacity-90">複数枚撮影させたい場合はカンマ区切りで枚数を指定できます（例: <code>製品前,2</code>）。また、台数分撮影させたい場合は <code>ALL</code> を指定できます（例: <code>シリアルラベル,ALL</code>）</p>
                                    <textarea
                                        value={packagingPhotoTopicsText}
                                        onChange={e => setPackagingPhotoTopicsText(e.target.value)}
                                        className="w-full border rounded p-3 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                                        placeholder="例:&#13;&#10;製品前&#13;&#10;製品右,2&#13;&#10;シリアル,ALL"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-6 mb-8">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 mb-4"><ListChecks className="w-5 h-5 text-purple-600" /> 検査項目マスタ (CSV取込)</h3>
                                <div className="bg-purple-50 p-4 rounded-lg mb-4 border border-purple-100">
                                    <p className="text-xs text-purple-800 mb-2 font-bold">CSV取込列設定 (アルファベット)</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div><label className="block text-[10px] text-slate-500 font-bold mb-1">カテゴリ</label><input value={itemCsvMapping.category} onChange={e => setItemCsvMapping({ ...itemCsvMapping, category: e.target.value })} className="w-full border rounded p-1 text-center" /></div>
                                        <div><label className="block text-[10px] text-slate-500 font-bold mb-1">項目名</label><input value={itemCsvMapping.title} onChange={e => setItemCsvMapping({ ...itemCsvMapping, title: e.target.value })} className="w-full border rounded p-1 text-center" /></div>
                                        <div><label className="block text-[10px] text-slate-500 font-bold mb-1">内容・基準</label><input value={itemCsvMapping.description} onChange={e => setItemCsvMapping({ ...itemCsvMapping, description: e.target.value })} className="w-full border rounded p-1 text-center" /></div>
                                        <div><label className="block text-[10px] text-slate-500 font-bold mb-1">適用対象</label><input value={itemCsvMapping.targetPart} onChange={e => setItemCsvMapping({ ...itemCsvMapping, targetPart: e.target.value })} className="w-full border rounded p-1 text-center" /></div>
                                        <div><label className="block text-[10px] text-slate-500 font-bold mb-1">目標時間</label><input value={itemCsvMapping.targetTime} onChange={e => setItemCsvMapping({ ...itemCsvMapping, targetTime: e.target.value })} className="w-full border rounded p-1 text-center" /></div>
                                        <div><label className="block text-[10px] text-slate-500 font-bold mb-1">チェック方式</label><input value={itemCsvMapping.checkType} onChange={e => setItemCsvMapping({ ...itemCsvMapping, checkType: e.target.value })} className="w-full border rounded p-1 text-center" /></div>
                                        <div><label className="block text-[10px] text-slate-500 font-bold mb-1">基準数量</label><input value={itemCsvMapping.defaultCount} onChange={e => setItemCsvMapping({ ...itemCsvMapping, defaultCount: e.target.value })} className="w-full border rounded p-1 text-center" /></div>
                                        <div><label className="block text-[10px] text-slate-500 font-bold mb-1">タグ(重要等)</label><input value={itemCsvMapping.tags} onChange={e => setItemCsvMapping({ ...itemCsvMapping, tags: e.target.value })} className="w-full border rounded p-1 text-center" /></div>
                                        <div><label className="block text-[10px] text-slate-500 font-bold mb-1">特注追加条件</label><input value={itemCsvMapping.specialCondition} onChange={e => setItemCsvMapping({ ...itemCsvMapping, specialCondition: e.target.value })} className="w-full border rounded p-1 text-center" /></div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={downloadItemCsvTemplate} className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200 px-3 py-1.5 rounded text-xs font-bold inline-flex items-center gap-1 shadow-sm"><Download className="w-4 h-4" /> 登録済みデータDL (CSV)</button>
                                        <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-bold inline-flex items-center gap-1 shadow-sm"><Upload className="w-4 h-4" /> 項目マスタCSV取込<input type="file" accept=".csv" className="hidden" onChange={handleInspectionItemCsvUpload} /></label>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-6 mb-8">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 mb-4"><FileSpreadsheet className="w-5 h-5 text-green-600" /> ロット情報 CSV取込設定</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">指図番号 (必須)</label><input value={csvMapping.orderNo} onChange={e => setCsvMapping({ ...csvMapping, orderNo: e.target.value })} className="w-full border rounded p-2 text-center font-mono font-bold" placeholder="A" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">型式 (Model)</label><input value={csvMapping.model} onChange={e => setCsvMapping({ ...csvMapping, model: e.target.value })} className="w-full border rounded p-2 text-center font-mono font-bold" placeholder="B" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">台数</label><input value={csvMapping.quantity} onChange={e => setCsvMapping({ ...csvMapping, quantity: e.target.value })} className="w-full border rounded p-2 text-center font-mono font-bold" placeholder="C" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">納期</label><input value={csvMapping.dueDate} onChange={e => setCsvMapping({ ...csvMapping, dueDate: e.target.value })} className="w-full border rounded p-2 text-center font-mono font-bold" placeholder="D" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">入荷日時</label><input value={csvMapping.entryAt} onChange={e => setCsvMapping({ ...csvMapping, entryAt: e.target.value })} className="w-full border rounded p-2 text-center font-mono font-bold" placeholder="E" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">外観図備考</label><input value={csvMapping.appearanceNote} onChange={e => setCsvMapping({ ...csvMapping, appearanceNote: e.target.value })} className="w-full border rounded p-2 text-center font-mono font-bold" placeholder="F" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">テール有無 (あり/1/True)</label><input value={csvMapping.hasTail} onChange={e => setCsvMapping({ ...csvMapping, hasTail: e.target.value })} className="w-full border rounded p-2 text-center font-mono font-bold" placeholder="G" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">機番1の列 (以降、台数分読込)</label><input value={csvMapping.serialNoStart} onChange={e => setCsvMapping({ ...csvMapping, serialNoStart: e.target.value })} className="w-full border rounded p-2 text-center font-mono font-bold" placeholder="H" /></div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={downloadLotCsvTemplate} className="bg-green-100 hover:bg-green-200 text-green-700 border border-green-200 px-3 py-1.5 rounded text-xs font-bold inline-flex items-center gap-1 shadow-sm"><Download className="w-4 h-4" /> 登録済みデータDL (CSV)</button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><MapIcon className="w-6 h-6 text-blue-600" /> エリア(ゾーン)設定</h2><button onClick={handleSaveZoneChanges} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> 保存する</button></div><div className="mb-6 flex gap-2"><button onClick={handleAddZone} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-emerald-700 flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> 新しいエリアを追加</button></div><div className="space-y-3">{localZones.map((zone, idx) => (<div key={zone.id} className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50 hover:bg-white transition-colors"><div className="flex flex-col gap-1 items-center w-10 shrink-0"><button disabled={idx === 0} onClick={() => { const newZones = [...localZones];[newZones[idx - 1], newZones[idx]] = [newZones[idx], newZones[idx - 1]]; setLocalZones(newZones); }} className="text-slate-400 hover:text-blue-600 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button><button disabled={idx === localZones.length - 1} onClick={() => { const newZones = [...localZones];[newZones[idx + 1], newZones[idx]] = [newZones[idx], newZones[idx + 1]]; setLocalZones(newZones); }} className="text-slate-400 hover:text-blue-600 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button></div><div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><div><label className="text-xs font-bold text-slate-500 block mb-1">エリア名</label><input value={zone.name} onChange={(e) => handleUpdateZone(zone.id, 'name', e.target.value)} className="w-full border rounded p-2 text-sm font-bold" /></div><div><label className="text-xs font-bold text-slate-500 block mb-1">個人エリア(エリア名＝担当者)</label><div className="flex items-center h-full"><input type="checkbox" checked={zone.isPersonal || false} onChange={(e) => handleUpdateZone(zone.id, 'isPersonal', e.target.checked)} className="w-5 h-5" /></div></div><div className="flex gap-2"><div className="flex-1"><label className="text-xs font-bold text-slate-500 block mb-1">幅(%)</label><input type="number" value={Math.round(zone.w)} onChange={(e) => handleUpdateZone(zone.id, 'w', Number(e.target.value))} className="w-full border rounded p-2 text-sm text-right" /></div><div className="flex-1"><label className="text-xs font-bold text-slate-500 block mb-1">高さ(%)</label><input type="number" value={Math.round(zone.h)} onChange={(e) => handleUpdateZone(zone.id, 'h', Number(e.target.value))} className="w-full border rounded p-2 text-sm text-right" /></div></div><div><label className="text-xs font-bold text-slate-500 block mb-1">カラーテーマ</label><div className="flex gap-1">{ZONE_COLORS.map(c => (<button key={c.name} onClick={() => handleUpdateZone(zone.id, 'color', c.class)} className={`w-6 h-6 rounded-full border-2 ${c.class.split(' ')[0]} ${zone.color === c.class ? 'ring-2 ring-slate-800 border-white' : 'border-transparent'}`} title={c.name} />))}</div></div></div><button onClick={() => triggerDeleteZone(zone.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-5 h-5" /></button></div>))}</div></div><div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start text-blue-800 text-sm"><HelpCircle className="w-5 h-5 shrink-0" /><div><div className="font-bold mb-1">ヒント</div><p>「個人エリア」をONにすると、そのエリアでの作業は自動的にエリア名が担当者名として記録されます。<br />タッチアップエリアなどはOFFにしてください。</p></div></div></div>)}
                </main>
                {executionLotId && (<FinalInspectionModal lot={lots.find(l => l.id === executionLotId)} onClose={() => setExecutionLotId(null)} onSave={(data) => saveData('lots', executionLotId, data)} onFinish={() => setExecutionLotId(null)} mapZones={localZones} onCreateZone={handleCreateZone} workers={workers} complaintOptions={complaintOptions} defectProcessOptions={defectProcessOptions} packagingPhotoTopics={settings?.packagingPhotoTopics} defectHistory={defectHistory} />)}
                {/* Indirect Work Modal */}
                {showIndirectModal && (
                  <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowIndirectModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                      <div className="bg-amber-600 text-white p-4 flex justify-between items-center"><h2 className="font-bold flex items-center gap-2"><Coffee className="w-5 h-5"/> 間接作業</h2><button onClick={() => setShowIndirectModal(false)}><X className="w-5 h-5"/></button></div>
                      {activeIndirect ? (
                        <div className="p-6 text-center">
                          <div className="text-sm text-slate-500 mb-1">実行中</div>
                          <div className="text-2xl font-black text-amber-700 mb-6">{activeIndirect.category}</div>
                          <button onClick={() => { const dur = Math.floor((Date.now() - activeIndirect.startTime) / 1000); saveData('indirectWork', activeIndirect.id, { ...activeIndirect, duration: dur, endTime: Date.now(), createdAt: Date.now() }); setActiveIndirect(null); setShowIndirectModal(false); }} className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-lg">停止して記録</button>
                        </div>
                      ) : (
                        <div className="p-4 grid grid-cols-2 gap-3">
                          {(settings?.indirectCategories || ['改善','準備','会議','教育','片付け','5S','その他']).map(cat => (
                            <button key={cat} onClick={() => { const id = `iw_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; setActiveIndirect({ id, category: cat, startTime: Date.now(), workerName: currentUserName }); setShowIndirectModal(false); }} className="py-4 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 rounded-xl font-bold text-amber-800 text-sm">{cat}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Daily Summary Modal */}
                {showDailySummary && (() => {
                  const today = new Date().toISOString().split('T')[0];
                  const DailySummaryInner = () => {
                    const [dateFrom, setDateFrom] = useState(today);
                    const [dateTo, setDateTo] = useState(today);
                    const [selWorkers, setSelWorkers] = useState(currentUserName ? [currentUserName] : []);
                    const [addCat, setAddCat] = useState(''); const [addDur, setAddDur] = useState(''); const [addNote, setAddNote] = useState('');
                    const cats = settings?.indirectCategories || ['改善','準備','会議','教育','片付け','5S','その他'];
                    const personalZones = (settings?.mapZones || []).filter(z => z.isPersonal);
                    const allNames = [...new Set([...personalZones.map(z => z.name), ...workers.map(w => w.name)])];
                    const toggleW = n => setSelWorkers(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]);
                    const fromTs = new Date(dateFrom); fromTs.setHours(0,0,0,0);
                    const toTs = new Date(dateTo); toTs.setHours(23,59,59,999);
                    const isSingleDay = dateFrom === dateTo;
                    // 直工
                    let directSec = 0; const directDetails = [];
                    lots.forEach(lot => { if (!lot.tasks) return; Object.entries(lot.tasks).forEach(([key, task]) => { if (selWorkers.length > 0 && !selWorkers.includes(task.workerName)) return; if (!task.duration || task.duration <= 0) return; const te = (task.startTime || lot.workStartTime || lot.createdAt || 0) + (task.duration * 1000); if (te < fromTs.getTime() || te > toTs.getTime() + 86400000) return; directSec += task.duration; const step = lot.steps?.find(s => key.startsWith(s.id + '-')) || lot.steps?.[parseInt(key.split('-')[0])]; directDetails.push({ lot: lot.orderNo, model: lot.model, step: step?.title || key, duration: task.duration, worker: task.workerName }); }); });
                    // 間接
                    const fIndirect = indirectWork.filter(w => { if (selWorkers.length > 0 && !selWorkers.includes(w.workerName)) return false; return w.startTime >= fromTs.getTime() && w.startTime <= toTs.getTime() + 86400000; });
                    const indirectSec = fIndirect.reduce((a, w) => a + (w.duration || 0), 0);
                    const totalH = (directSec + indirectSec) / 3600;
                    const dr = (directSec + indirectSec) > 0 ? (directSec / (directSec + indirectSec)) * 100 : 0;
                    return (
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-800 text-white p-3 flex justify-between items-center shrink-0"><h2 className="font-bold flex items-center gap-2"><Clock className="w-5 h-5"/> 時間集計</h2><button onClick={() => setShowDailySummary(false)}><X className="w-5 h-5"/></button></div>
                        <div className="px-4 py-2 bg-slate-50 border-b shrink-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap"><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-2 py-1 text-sm"/><span className="text-slate-400 text-xs">〜</span><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-2 py-1 text-sm"/><button onClick={() => { setDateFrom(today); setDateTo(today); }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">本日</button></div>
                          <div className="flex items-center gap-1 flex-wrap"><span className="text-[10px] text-slate-500 font-bold mr-1">作業者:</span>{allNames.map(n => <button key={n} onClick={() => toggleW(n)} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${selWorkers.includes(n) ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-400 border-slate-200'}`}>{n}</button>)}</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          <div className="grid grid-cols-4 gap-2">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 text-center"><div className="text-[10px] text-blue-500 font-bold">直工</div><div className="text-xl font-black text-blue-700 font-mono">{(directSec/3600).toFixed(2)}h</div></div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-center"><div className="text-[10px] text-amber-500 font-bold">間接</div><div className="text-xl font-black text-amber-700 font-mono">{(indirectSec/3600).toFixed(2)}h</div></div>
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-2 text-center"><div className="text-[10px] text-purple-500 font-bold">直工比率</div><div className="text-xl font-black text-purple-700 font-mono">{dr.toFixed(0)}%</div></div>
                            <div className={`border rounded-xl p-2 text-center ${totalH >= 7.75 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}><div className="text-[10px] font-bold text-slate-500">合計</div><div className={`text-xl font-black font-mono ${totalH >= 7.75 ? 'text-emerald-700' : 'text-rose-700'}`}>{totalH.toFixed(2)}h</div></div>
                          </div>
                          <div className="border rounded-xl overflow-hidden"><div className="bg-blue-600 text-white px-3 py-1.5 text-sm font-bold flex justify-between"><span>直工 ({directDetails.length}件)</span><span className="font-mono">{formatTime(directSec)}</span></div>{directDetails.length > 0 ? <div className="divide-y max-h-40 overflow-y-auto">{directDetails.map((d,i) => <div key={i} className="px-3 py-1 text-xs flex justify-between"><span><span className="font-bold text-blue-700">{d.worker}</span> {d.model} {d.lot} — {d.step}</span><span className="font-mono font-bold text-blue-600">{formatTime(d.duration)}</span></div>)}</div> : <div className="p-3 text-center text-slate-400 text-xs">データなし</div>}</div>
                          <div className="border rounded-xl overflow-hidden"><div className="bg-amber-600 text-white px-3 py-1.5 text-sm font-bold flex justify-between"><span>間接 ({fIndirect.length}件)</span><span className="font-mono">{formatTime(indirectSec)}</span></div>{fIndirect.length > 0 ? <div className="divide-y max-h-40 overflow-y-auto">{fIndirect.map((w,i) => <div key={i} className="px-3 py-1 text-xs flex justify-between"><span><span className="font-bold text-amber-700">{w.workerName}</span> <span className="bg-amber-100 text-amber-700 px-1.5 rounded">{w.category}</span>{w.manual && <span className="text-purple-400 ml-1">(手動)</span>}</span><span className="font-mono font-bold text-amber-600">{formatTime(w.duration||0)}</span></div>)}</div> : <div className="p-3 text-center text-slate-400 text-xs">データなし</div>}</div>
                          {isSingleDay && selWorkers.length === 1 && <div className="border-2 border-dashed border-purple-300 rounded-xl p-3 bg-purple-50"><div className="text-xs font-bold text-purple-700 mb-2">追加登録（{selWorkers[0]}）</div><div className="flex gap-2 flex-wrap"><select value={addCat} onChange={e => setAddCat(e.target.value)} className="border rounded px-2 py-1 text-xs flex-1 min-w-[100px]"><option value="">ジャンル</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select><input type="number" value={addDur} onChange={e => setAddDur(e.target.value)} className="border rounded px-2 py-1 text-xs w-16" placeholder="分"/><button onClick={() => { if (!addCat || !addDur) return; const id = `iw_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; const d = new Date(dateFrom); d.setHours(12); saveData('indirectWork', id, { workerName: selWorkers[0], category: addCat, duration: Math.round(parseFloat(addDur)*60), startTime: d.getTime(), note: '手動追加', manual: true, createdAt: Date.now() }); setAddDur(''); setAddCat(''); }} className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold">追加</button></div></div>}
                        </div>
                      </div>
                    );
                  };
                  return <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDailySummary(false)}><DailySummaryInner/></div>;
                })()}
                {showNoteModal && <FINoteModal notes={notes} workers={workers} currentUserName={currentUserName} saveData={saveData} deleteData={deleteData} onClose={() => setShowNoteModal(false)} />}
                {showAnnouncementModal && <FIAnnouncementModal announcements={announcements} workers={workers} currentUserName={currentUserName} saveData={saveData} deleteData={deleteData} onClose={() => setShowAnnouncementModal(false)} />}
                {/* お知らせ通知バナー */}
                {announceBanner && (
                  <div className="fixed top-0 left-0 right-0 bg-purple-600 text-white z-[300] p-4 flex justify-between items-center shadow-lg animate-pulse">
                    <div className="flex items-center gap-3"><Megaphone className="w-6 h-6 shrink-0"/><div><div className="text-lg font-black">{announceBanner.title}</div>{announceBanner.content && <div className="text-sm opacity-90">{announceBanner.content}</div>}</div></div>
                    <button onClick={() => setAnnounceBanner(null)} className="bg-white/20 hover:bg-white/30 rounded-full p-2 shrink-0"><X className="w-6 h-6"/></button>
                  </div>
                )}
                {showPhotoManager && (<PhotoManagerModal lots={lots} completedLots={[]} onClose={() => setShowPhotoManager(false)} onSave={(lotId, data) => saveData('lots', lotId, data)} />)}
                {showLotModal && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-5xl my-auto"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2"><Package className="w-6 h-6" /> {editingLot ? '検査対象編集' : '新規検査対象登録'}</h2><div className="relative"><label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-sm"><FileSpreadsheet className="w-4 h-4" /> CSV一括登録<input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} /></label></div></div><form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.target); handleAddLot(Object.fromEntries(formData)); }} className="space-y-6"><div className="grid grid-cols-1 lg:grid-cols-4 gap-6"><div><label className="block text-sm font-bold text-slate-700 mb-1">型式 (Model)</label><input name="model" defaultValue={editingLot?.model} required className="w-full border rounded p-2 bg-slate-50" placeholder="例: A-100" /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">指図番号</label><input name="orderNo" defaultValue={editingLot?.orderNo} required className="w-full border rounded p-2 bg-slate-50" placeholder="例: 001" /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">台数</label><input name="quantity" type="number" min="1" value={modalQty} onChange={(e) => setModalQty(Number(e.target.value))} className="w-full border rounded p-2 bg-slate-50 disabled:opacity-50" /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">優先度</label><select name="priority" defaultValue={editingLot?.priority || 'normal'} className="w-full border rounded p-2 bg-slate-50"><option value="normal">通常</option><option value="high">急ぎ</option></select></div><div><label className="block text-sm font-bold text-slate-700 mb-1">製品入荷日時</label><input name="entryAt" type="datetime-local" defaultValue={editingLot?.entryAt ? toDatetimeLocal(getSafeTime(editingLot.entryAt)) : toDatetimeLocal(Date.now())} className="w-full border rounded p-2 bg-slate-50" /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">納期</label><input name="dueDate" defaultValue={editingLot?.dueDate} type="date" className="w-full border rounded p-2 bg-slate-50" /></div><div className="lg:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-1">外観図 (番号・図番)</label><input name="appearanceNote" defaultValue={editingLot?.appearanceNote} className="w-full border rounded p-2" placeholder="例: Dwg-12345" /></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="border p-4 rounded bg-slate-50"><label className="block text-sm font-bold text-slate-500 mb-2 flex items-center gap-1"><Hash className="w-4 h-4" /> 機番 (シリアルNo) 設定</label><div className="flex gap-2 mb-2"><input placeholder="接頭辞 (例: S/N-)" value={serialPrefix} onChange={e => setSerialPrefix(e.target.value)} className="w-1/3 border rounded p-1.5 text-xs" /><input type="number" placeholder="開始番号" value={serialStartNum} onChange={e => setSerialStartNum(Number(e.target.value))} className="w-1/3 border rounded p-1.5 text-xs" /><button type="button" onClick={handleGenerateSerials} className="flex-1 bg-blue-600 text-white rounded text-xs font-bold">自動入力</button></div><div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto">{Array.from({ length: modalQty }).map((_, i) => (<input key={i} name={`serial_${i}`} defaultValue={serialInputs[i] || ''} placeholder={`#${i + 1}`} className="border rounded p-1.5 text-xs text-center" />))}</div></div><div className="space-y-4"><label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer p-2 border rounded hover:bg-slate-50"><input type="checkbox" name="hasTail" defaultChecked={editingLot ? editingLot.hasTail : false} className="w-5 h-5 accent-blue-600" />テール (オプション) あり</label>{availableConditions.length > 0 && (<div className="border p-3 rounded bg-amber-50"><div className="text-xs font-bold text-amber-800 mb-2">特注仕様 (追加項目)</div><div className="flex flex-wrap gap-3">{availableConditions.map(cond => (<label key={cond} className="flex items-center gap-1 text-sm font-bold text-slate-700 cursor-pointer"><input type="checkbox" checked={selectedConditions.includes(cond)} onChange={() => toggleCondition(cond)} className="w-4 h-4 accent-amber-600" />{cond}</label>))}</div></div>)}</div></div><div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowLotModal(false)} className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded font-bold">キャンセル</button><button type="submit" className="px-8 py-2 bg-emerald-600 text-white rounded font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700">{editingLot ? '更新' : '登録実行'}</button></div></form></div></div>)}
            </div>
            );
}
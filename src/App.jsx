import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Building2,
  MapPin,
  Banknote,
  Briefcase,
  Search,
  Sparkles,
  Loader2,
  X,
  Plus,
  Trash2,
  Pencil,
  ScrollText,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Download,
  Upload,
  Settings,
} from "lucide-react";

// ---------------------------------------------------------------------------
// フィールド定義
// ---------------------------------------------------------------------------
const FIELD_SECTIONS = [
  {
    title: "基本情報",
    fields: [
      { key: "business", label: "事業内容", type: "textarea" },
      { key: "philosophy", label: "企業理念", type: "textarea" },
      { key: "features", label: "特徴", type: "textarea" },
      { key: "jobType", label: "希望職種・募集職種", type: "text" },
      { key: "salary", label: "平均年収", type: "number", unit: "万円" },
      {
        key: "myPageUrl",
        label: "マイページURL",
        type: "url",
        personal: true,
        placeholder: "https://...",
      },
    ],
  },
  {
    title: "社風・将来性",
    fields: [
      { key: "teamwork", label: "チームワーク", type: "textarea" },
      {
        key: "growthStage",
        label: "成長企業か",
        type: "select",
        options: ["不明", "成長中", "安定", "縮小傾向"],
      },
      { key: "futureGoals", label: "今後の目標", type: "textarea" },
      {
        key: "noExperienceOk",
        label: "未経験でも〇か",
        type: "select",
        options: ["不明", "可", "条件付きで可", "不可"],
      },
      { key: "requiredTalent", label: "求められる人材", type: "textarea" },
      { key: "suitedPerson", label: "向いている人の特徴", type: "textarea" },
      {
        key: "decisivePoint",
        label: "決め手",
        type: "textarea",
        personal: true,
        placeholder: "自分がこの企業を志望する決め手をメモ",
      },
    ],
  },
  {
    title: "制度",
    fields: [
      { key: "education", label: "教育制度", type: "textarea" },
      { key: "skillUpSystem", label: "スキルアップ制度", type: "textarea" },
      { key: "benefits", label: "福利厚生", type: "textarea" },
    ],
  },
  {
    title: "働き方",
    fields: [
      { key: "locations", label: "勤務地（読点区切りで複数可）", type: "locations" },
      {
        key: "overseasWork",
        label: "海外勤務",
        type: "select_with_note",
        options: ["不明", "あり", "なし"],
        noteKey: "overseasWorkNote",
        notePlaceholder: "メモ（例：希望者のみ、拠点名 など）",
      },
      {
        key: "remoteWork",
        label: "リモートワーク",
        type: "select",
        options: ["不明", "フル可", "一部可", "不可"],
      },
      {
        key: "flexSystem",
        label: "フレックス制度",
        type: "select",
        options: ["不明", "あり", "なし"],
      },
      {
        key: "noTransfer",
        label: "転勤の有無",
        type: "select",
        options: ["不明", "転勤なし", "転勤あり"],
      },
      {
        key: "monthlyOvertimeHours",
        label: "月残業時間",
        type: "number",
        unit: "h",
      },
    ],
  },
  {
    title: "募集・採用",
    fields: [
      { key: "internship", label: "インターン情報", type: "textarea", placeholder: "開催時期、内容、参加条件など" },
      {
        key: "recruitmentInfo",
        label: "採用情報",
        type: "textarea",
        placeholder: "募集人数、選考フロー、応募資格など",
      },
    ],
  },
];

const CONDITION_CHIPS = [
  { field: "remoteWork", value: "フル可", label: "フルリモート可" },
  { field: "remoteWork", value: "一部可", label: "一部リモート可" },
  { field: "flexSystem", value: "あり", label: "フレックスあり" },
  { field: "noTransfer", value: "転勤なし", label: "転勤なし" },
  { field: "noExperienceOk", value: "可", label: "未経験可" },
  { field: "noExperienceOk", value: "条件付きで可", label: "未経験条件付き可" },
  { field: "growthStage", value: "成長中", label: "成長中" },
];

const ALL_FIELDS = FIELD_SECTIONS.flatMap((s) => s.fields);
const STORAGE_KEY = "company-notebook:companies:v2";
const CUSTOM_FIELDS_STORAGE_KEY = "company-notebook:custom-fields:v1";
const API_KEY_STORAGE_KEY = "company-notebook:api-key";

// Webブラウザと独自環境の両方に対応するストレージラッパー
const storageUtil = {
  get: async (key) => {
    if (typeof window !== "undefined" && window.storage) {
      const res = await window.storage.get(key, false);
      return res ? res.value : null;
    }
    return localStorage.getItem(key);
  },
  set: async (key, value) => {
    if (typeof window !== "undefined" && window.storage) {
      await window.storage.set(key, value, false);
    } else {
      localStorage.setItem(key, value);
    }
  }
};

function emptyForm() {
  const base = { name: "" };
  ALL_FIELDS.forEach((f) => {
    if (f.type === "select" || f.type === "select_with_note") base[f.key] = f.options[0];
    else base[f.key] = "";
    if (f.noteKey) base[f.noteKey] = "";
  });
  return base;
}

function normalizeCompany(raw) {
  const base = emptyForm();
  return { id: raw.id, addedAt: raw.addedAt, ...base, ...raw };
}

function parseAiJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function overtimeTone(hours) {
  if (hours === null || hours === undefined || hours === "") return null;
  const n = Number(hours);
  if (n >= 30) return "rose";
  if (n >= 20) return "amber";
  return "emerald";
}

function FileTab({ index }) {
  return (
    <div className="absolute -top-3 left-5 px-2 py-0.5 bg-emerald-700 text-stone-50 text-xs tracking-widest">
      No.{String(index + 1).padStart(3, "0")}
    </div>
  );
}

function Tag({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded border ${tones[tone]} whitespace-nowrap`}>
      {children}
    </span>
  );
}

function FieldInput({ field, value, onChange }) {
  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={field.placeholder}
        className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
      />
    );
  }
  if (field.type === "number") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        {field.unit && <span className="text-xs text-slate-400">{field.unit}</span>}
      </div>
    );
  }
  if (field.type === "select" || field.type === "select_with_note") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
      >
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "url") {
    return (
      <input
        type="url"
        inputMode="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
    />
  );
}

function renderCompareValue(field, company) {
  const v = company[field.key];
  if (field.type === "locations") {
    return v && v.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {v.map((l) => (
          <Tag key={l}>{l}</Tag>
        ))}
      </div>
    ) : (
      "—"
    );
  }
  if (field.type === "select") {
    return v && v !== "不明" ? v : "—";
  }
  if (field.type === "select_with_note") {
    const note = company[field.noteKey];
    const base = v && v !== "不明" ? v : "—";
    if (!note) return base;
    return (
      <>
        {base}
        <span className="text-slate-400"> — {note}</span>
      </>
    );
  }
  if (field.type === "url") {
    if (!v) return "—";
    return (
      <a href={v} target="_blank" rel="noreferrer" className="text-emerald-700 underline break-all">
        {v}
      </a>
    );
  }
  if (field.type === "number") {
    if (!v) return "—";
    const tone = field.key === "monthlyOvertimeHours" ? overtimeTone(v) : null;
    return tone ? <Tag tone={tone}>{v}{field.unit}</Tag> : `${v}${field.unit || ""}`;
  }
  return v ? v : "—";
}

export default function CompanyNotebook() {
  const [companies, setCompanies] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Settings & AI states
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [locationFilter, setLocationFilter] = useState([]);
  const [conditionFilter, setConditionFilter] = useState([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [overtimeMax, setOvertimeMax] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  const [selectedIds, setSelectedIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const val1 = await storageUtil.get(STORAGE_KEY);
        if (val1) setCompanies(JSON.parse(val1).map(normalizeCompany));
        
        const val2 = await storageUtil.get(CUSTOM_FIELDS_STORAGE_KEY);
        if (val2) setCustomFields(JSON.parse(val2));

        const storedKey = await storageUtil.get(API_KEY_STORAGE_KEY);
        if (storedKey) setApiKey(storedKey);
      } catch (e) {
        console.error("データの読み込みに失敗しました", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    storageUtil.set(STORAGE_KEY, JSON.stringify(companies));
  }, [companies, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storageUtil.set(CUSTOM_FIELDS_STORAGE_KEY, JSON.stringify(customFields));
  }, [customFields, loaded]);

  function exportData() {
    const blob = new Blob([JSON.stringify(companies, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `company-notebook-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error("invalid format");
        const normalized = parsed.map((raw) => normalizeCompany({ ...raw, id: raw.id || `${Date.now()}-${Math.random()}` }));
        setCompanies((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const merged = [...prev];
          normalized.forEach((c) => {
            if (!existingIds.has(c.id)) merged.push(c);
          });
          return merged;
        });
      } catch (err) {
        alert("読み込みに失敗しました。書き出したJSONファイルを選択してください。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const allLocations = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => (c.locations || []).forEach((l) => set.add(l)));
    return Array.from(set);
  }, [companies]);

  const textSearchValue = (c) =>
    [
      c.name,
      ...ALL_FIELDS.filter((f) => f.type === "textarea" || f.type === "text").map((f) => c[f.key]),
      ...customFields.map((cf) => c[cf.key]),
    ]
      .join(" ")
      .toLowerCase();

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (keyword.trim() && !textSearchValue(c).includes(keyword.trim().toLowerCase())) return false;
      if (locationFilter.length > 0 && !(c.locations || []).some((l) => locationFilter.includes(l))) return false;
      if (conditionFilter.length > 0) {
        const ok = conditionFilter.every((chipKey) => {
          const chip = CONDITION_CHIPS.find((ch) => `${ch.field}:${ch.value}` === chipKey);
          return chip && c[chip.field] === chip.value;
        });
        if (!ok) return false;
      }
      if (salaryMin && (!c.salary || Number(c.salary) < Number(salaryMin))) return false;
      if (salaryMax && (!c.salary || Number(c.salary) > Number(salaryMax))) return false;
      if (overtimeMax && (!c.monthlyOvertimeHours || Number(c.monthlyOvertimeHours) > Number(overtimeMax)))
        return false;
      return true;
    });
  }, [companies, keyword, locationFilter, conditionFilter, salaryMin, salaryMax, overtimeMax]);

  function toggleFromList(value, list, setList) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function resetFilters() {
    setKeyword("");
    setLocationFilter([]);
    setConditionFilter([]);
    setSalaryMin("");
    setSalaryMax("");
    setOvertimeMax("");
  }

  function openAddForm() {
    const f = emptyForm();
    customFields.forEach((cf) => {
      f[cf.key] = "";
    });
    setForm(f);
    setEditingId(null);
    setAiError("");
    setShowForm(true);
  }

  function openEditForm(company) {
    const f = emptyForm();
    ALL_FIELDS.forEach((field) => {
      if (field.type === "locations") f[field.key] = (company.locations || []).join("、");
      else f[field.key] = company[field.key] ?? f[field.key];
      if (field.noteKey) f[field.noteKey] = company[field.noteKey] ?? f[field.noteKey];
    });
    customFields.forEach((cf) => {
      f[cf.key] = company[cf.key] || "";
    });
    f.name = company.name;
    setForm(f);
    setEditingId(company.id);
    setAiError("");
    setShowForm(true);
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addCustomField() {
    const label = newCustomLabel.trim();
    if (!label) return;
    const key = `custom_${Date.now()}`;
    setCustomFields((prev) => [...prev, { key, label }]);
    setForm((prev) => ({ ...prev, [key]: "" }));
    setNewCustomLabel("");
  }

  function removeCustomField(key) {
    setCustomFields((prev) => prev.filter((cf) => cf.key !== key));
  }

  function saveCompany() {
    if (!form.name.trim()) return;
    const payload = { name: form.name.trim() };
    ALL_FIELDS.forEach((field) => {
      if (field.type === "locations") {
        payload.locations = form.locations
          .split(/[、,]/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (field.type === "number") {
        payload[field.key] = form[field.key] ? Number(form[field.key]) : null;
      } else {
        payload[field.key] = form[field.key];
      }
      if (field.noteKey) payload[field.noteKey] = form[field.noteKey];
    });
    customFields.forEach((cf) => {
      payload[cf.key] = form[cf.key] || "";
    });
    if (editingId) {
      setCompanies((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c)));
    } else {
      setCompanies((prev) => [...prev, { id: `${Date.now()}`, addedAt: Date.now(), ...payload }]);
    }
    setShowForm(false);
    setForm(emptyForm());
    setEditingId(null);
  }

  function deleteCompany(id) {
    if(window.confirm("この企業のデータを削除してもよろしいですか？")) {
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function toggleExpand(id) {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function saveApiKey() {
    storageUtil.set(API_KEY_STORAGE_KEY, apiKey);
    setShowSettings(false);
  }

  async function generateWithAi() {
    if (!form.name.trim()) return;
    if (!apiKey.trim()) {
      setAiError("APIキーが設定されていません。右上の歯車マークからAnthropic APIキーを設定してください。");
      return;
    }
    
    setAiLoading(true);
    setAiError("");
    try {
      const aiFields = ALL_FIELDS.filter((f) => !f.personal);
      const schemaLines = aiFields
        .map((f) => {
          if (f.type === "locations") return `"locations": ["主な勤務地/拠点を2〜4件"]`;
          if (f.type === "number") return `"${f.key}": 数値(${f.unit || ""}単位、不明ならnull)`;
          if (f.type === "select" || f.type === "select_with_note")
            return `"${f.key}": "${f.options.slice(1).join("|")}のいずれか"`;
          return `"${f.key}": "${f.label}を80字程度で"`;
        })
        .join(",\n");
        
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerously-allow-browser": "true" 
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620", // モデルをアップデート
          max_tokens: 1500,
          messages: [
            {
              role: "user",
              content: `企業名「${form.name}」について、一般的に知られている情報をもとに以下のJSON形式のみで出力してください。前置き・説明・コードブロック記号は一切不要です。不明な項目はnullか"不明"にしてください。推測であることを前提に、断定しすぎない自然な内容にしてください。\n\n{\n${schemaLines}\n}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API Request Failed: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content.map((b) => b.text || "").join("\n");
      const parsed = parseAiJson(text);
      
      setForm((prev) => {
        const next = { ...prev };
        aiFields.forEach((f) => {
          if (f.type === "locations") {
            if (Array.isArray(parsed.locations)) next.locations = parsed.locations.join("、");
          } else if (f.type === "number") {
            if (parsed[f.key] !== undefined && parsed[f.key] !== null) next[f.key] = String(parsed[f.key]);
          } else if (f.type === "select" || f.type === "select_with_note") {
            if (parsed[f.key] && f.options.includes(parsed[f.key])) next[f.key] = parsed[f.key];
          } else if (parsed[f.key]) {
            next[f.key] = parsed[f.key];
          }
        });
        return next;
      });
    } catch (e) {
      setAiError(`AI生成に失敗しました。APIキーが正しいか、CORS制約に引っかかっていないか確認してください。(${e.message || "不明なエラー"})`);
    } finally {
      setAiLoading(false);
    }
  }

  const selectedCompanies = companies.filter((c) => selectedIds.includes(c.id));

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 pb-24 font-sans">
      <header className="border-b border-stone-300 bg-stone-50/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <ScrollText className="w-6 h-6 text-emerald-700" />
            <div>
              <h1 className="text-xl text-slate-900 tracking-wide font-bold">企業比較ノート</h1>
              <p className="text-xs text-slate-500">気になる企業を1社ずつ記録して、条件で見比べる</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(true)}
              title="設定 (APIキーなど)"
              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-stone-100 rounded"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={exportData}
              title="データをJSONファイルとして書き出し"
              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-stone-100 rounded"
            >
              <Download className="w-4 h-4" />
            </button>
            <label
              title="書き出したJSONファイルを読み込み"
              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept="application/json" onChange={importData} className="hidden" />
            </label>
            <button
              onClick={openAddForm}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-stone-50 text-sm px-3 py-2 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              企業を追加
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        {/* フィルター */}
        <div className="bg-white border border-stone-200 rounded-md mb-6 shadow-sm">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-700"
          >
            <span className="flex items-center gap-2 font-bold">
              <Search className="w-4 h-4 text-slate-400" />
              絞り込み
              {(locationFilter.length > 0 || conditionFilter.length > 0 || salaryMin || salaryMax || overtimeMax || keyword) && 
                <span className="text-emerald-700 text-xs">（適用中）</span>}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {showFilters && (
            <div className="px-4 pb-4 border-t border-stone-100 pt-4 space-y-4">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="企業名・事業内容・理念などで検索"
                className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />

              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 shrink-0">年収(万円)</span>
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="下限"
                    className="w-20 border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <span className="text-slate-400">〜</span>
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="上限"
                    className="w-20 border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">月残業上限(h)</span>
                  <input
                    type="number"
                    value={overtimeMax}
                    onChange={(e) => setOvertimeMax(e.target.value)}
                    placeholder="例）20"
                    className="w-20 border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {allLocations.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                    <MapPin className="w-3.5 h-3.5" /> 勤務地
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allLocations.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => toggleFromList(loc, locationFilter, setLocationFilter)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          locationFilter.includes(loc)
                            ? "bg-emerald-700 text-stone-50 border-emerald-700"
                            : "bg-white text-slate-600 border-stone-300 hover:border-emerald-400"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> 条件（すべて満たす企業のみ表示）
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITION_CHIPS.map((chip) => {
                    const key = `${chip.field}:${chip.value}`;
                    return (
                      <button
                        key={key}
                        onClick={() => toggleFromList(key, conditionFilter, setConditionFilter)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          conditionFilter.includes(key)
                            ? "bg-emerald-700 text-stone-50 border-emerald-700"
                            : "bg-white text-slate-600 border-stone-300 hover:border-emerald-400"
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-rose-600 underline underline-offset-2">
                条件をクリア
              </button>
            </div>
          )}
        </div>

        {/* 企業一覧 */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 border border-dashed border-stone-300 rounded-md bg-white">
            {companies.length === 0 ? (
              <>
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">まだ企業が登録されていません。</p>
                <p className="text-sm">「企業を追加」から最初の1社を記録しましょう。</p>
              </>
            ) : (
              <p className="text-sm">条件に一致する企業がありません。</p>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {filtered.map((c) => {
              const originalIndex = companies.findIndex((x) => x.id === c.id);
              const selected = selectedIds.includes(c.id);
              const expanded = expandedIds.includes(c.id);
              const otTone = overtimeTone(c.monthlyOvertimeHours);
              
              return (
                <div
                  key={c.id}
                  className={`relative bg-white border rounded-md pt-5 pb-4 px-4 transition-shadow shadow-sm hover:shadow-md ${
                    selected ? "border-emerald-500 ring-1 ring-emerald-400" : "border-stone-200"
                  }`}
                >
                  <FileTab index={originalIndex} />
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base text-slate-900 font-bold">{c.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditForm(c)} className="p-1 text-slate-400 hover:text-emerald-700" aria-label="編集">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCompany(c.id)} className="p-1 text-slate-400 hover:text-rose-600" aria-label="削除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-3 min-h-[2.5em]">{c.business || "事業内容は未入力です"}</p>

                  <div className="flex items-center gap-1.5 text-sm mb-2">
                    <Banknote className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-slate-700">{c.salary ? `平均年収 約${c.salary}万円` : "平均年収 不明"}</span>
                    {otTone && <Tag tone={otTone}>残業 月{c.monthlyOvertimeHours}h</Tag>}
                  </div>

                  {c.locations && c.locations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.locations.map((l) => (
                        <Tag key={l}>{l}</Tag>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {CONDITION_CHIPS.filter((chip) => c[chip.field] === chip.value).map((chip) => (
                      <Tag key={`${chip.field}:${chip.value}`} tone="emerald">
                        {chip.label}
                      </Tag>
                    ))}
                  </div>

                  <button
                    onClick={() => toggleExpand(c.id)}
                    className="flex items-center gap-1 text-xs text-emerald-700 font-bold mb-2 hover:underline"
                  >
                    {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    詳細を{expanded ? "閉じる" : "見る"}
                  </button>

                  {expanded && (
                    <div className="space-y-2.5 mb-3 border-t border-stone-100 pt-3">
                      {FIELD_SECTIONS.map((section) => (
                        <div key={section.title}>
                          <p className="text-xs text-slate-400 mb-1 font-bold">{section.title}</p>
                          <div className="space-y-1.5">
                            {section.fields.map((f) => {
                              const val = c[f.key];
                              const isEmpty = f.type === "locations" ? !val || val.length === 0 : !val || val === "不明";
                              if (isEmpty) return null;
                              return (
                                <div key={f.key} className="text-xs text-slate-600 flex">
                                  <span className="text-slate-400 w-24 shrink-0">{f.label}：</span>
                                  <div className="flex-1">{renderCompareValue(f, c)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {customFields.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1 font-bold">カスタム項目</p>
                          <div className="space-y-1.5">
                            {customFields.filter((cf) => c[cf.key]).map((cf) => (
                              <div key={cf.key} className="text-xs text-slate-600 flex">
                                <span className="text-slate-400 w-24 shrink-0">{cf.label}：</span>
                                <div className="flex-1">{c[cf.key]}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-slate-500 border-t border-stone-100 pt-2.5 cursor-pointer hover:text-slate-700 transition-colors">
                    <input type="checkbox" checked={selected} onChange={() => toggleSelect(c.id)} className="accent-emerald-700 w-4 h-4 cursor-pointer" />
                    比較する企業に追加
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 比較用フローティングバー */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-stone-50 z-30 shadow-[0_-4px_6px_rgba(0,0,0,0.1)]">
          <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <div className="text-sm">
              比較リスト: <span className="text-emerald-400 font-bold">{selectedIds.length}社</span>選択中
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCompare(true)} className="bg-emerald-600 hover:bg-emerald-500 text-stone-50 px-4 py-1.5 rounded text-sm font-bold transition-colors">
                比較表を開く
              </button>
              <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-stone-50 text-xs px-2 py-1 underline underline-offset-2 transition-colors">
                クリア
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 比較表モーダル */}
      {showCompare && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-md shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h2 className="text-lg text-slate-900 font-bold">比較表 ({selectedCompanies.length}社)</h2>
              <button onClick={() => setShowCompare(false)} className="p-1.5 text-slate-400 hover:bg-stone-100 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-sm text-left border-collapse min-w-max">
                <thead>
                  <tr>
                    <th className="border border-stone-300 bg-stone-100 p-2 sticky left-0 z-10 min-w-[120px]">項目</th>
                    {selectedCompanies.map((c) => (
                      <th key={c.id} className="border border-stone-300 bg-stone-50 p-3 min-w-[200px] text-base font-bold">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FIELD_SECTIONS.map((section) => (
                    <Fragment key={section.title}>
                      <tr>
                        <td colSpan={selectedCompanies.length + 1} className="bg-slate-200 text-slate-800 font-bold p-2 text-xs uppercase tracking-wider">
                          {section.title}
                        </td>
                      </tr>
                      {section.fields.map((f) => (
                        <tr key={f.key} className="hover:bg-stone-50/50">
                          <td className="border border-stone-300 p-2 bg-stone-50 text-slate-700 sticky left-0 z-10 whitespace-nowrap">
                            {f.label} {f.personal && <span className="text-emerald-700 text-[10px] ml-1">(メモ)</span>}
                          </td>
                          {selectedCompanies.map((c) => (
                            <td key={c.id} className="border border-stone-300 p-2 align-top whitespace-pre-wrap leading-relaxed">
                              {renderCompareValue(f, c)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {customFields.length > 0 && (
                    <Fragment>
                      <tr>
                        <td colSpan={selectedCompanies.length + 1} className="bg-slate-200 text-slate-800 font-bold p-2 text-xs uppercase tracking-wider">
                          カスタム項目
                        </td>
                      </tr>
                      {customFields.map((cf) => (
                        <tr key={cf.key} className="hover:bg-stone-50/50">
                          <td className="border border-stone-300 p-2 bg-stone-50 text-slate-700 sticky left-0 z-10 whitespace-nowrap">
                            {cf.label}
                          </td>
                          {selectedCompanies.map((c) => (
                            <td key={c.id} className="border border-stone-300 p-2 align-top whitespace-pre-wrap leading-relaxed">
                              {c[cf.key] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 設定モーダル */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-md shadow-2xl overflow-hidden">
            <div className="bg-slate-50 border-b border-stone-200 p-4 flex items-center justify-between">
              <h2 className="text-lg text-slate-900 font-bold">設定</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 text-slate-400 hover:bg-stone-200 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Anthropic API キー</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-xs text-slate-500 mt-2">
                  ブラウザのローカルストレージに保存されます。公開先でこの情報が他人に共有されることはありません。
                </p>
              </div>
            </div>
            <div className="bg-stone-50 border-t border-stone-200 p-4 flex justify-end">
              <button onClick={saveApiKey} className="px-6 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded transition-colors">
                保存して閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 企業追加・編集フォーム */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-md shadow-2xl overflow-hidden relative">
              <div className="bg-slate-50 border-b border-stone-200 p-4 sticky top-0 z-10 flex items-center justify-between">
                <h2 className="text-lg text-slate-900 font-bold">{editingId ? "企業情報を編集" : "企業を追加"}</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:bg-stone-200 rounded transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-8">
                {/* AIジェネレーター */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-emerald-900 font-bold">AI自動入力アシスト</p>
                      <p className="text-xs text-emerald-700/80">
                        企業名を入力してボタンを押すと、一般的な公開情報をもとに基本項目を推測・自動入力します。
                      </p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          placeholder="企業名を入力（例：株式会社〇〇）"
                          className="flex-1 border border-emerald-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                        />
                        <button
                          onClick={generateWithAi}
                          disabled={!form.name.trim() || aiLoading}
                          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-stone-50 text-sm px-4 py-2 rounded transition-colors flex items-center justify-center gap-1.5 shrink-0"
                        >
                          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          AIで入力
                        </button>
                      </div>
                      {aiError && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded mt-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span className="break-all">{aiError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {FIELD_SECTIONS.map((section) => (
                    <section key={section.title} className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 border-b border-stone-200 pb-1">
                        {section.title}
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {section.fields.map((f) => (
                          <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                            <label className="block text-xs text-slate-600 mb-1.5 font-medium">
                              {f.label} {f.personal && <span className="text-emerald-700 ml-1">(主観メモ)</span>}
                            </label>
                            <FieldInput
                              field={f}
                              value={form[f.key]}
                              onChange={(val) => updateField(f.key, val)}
                            />
                            {f.type === "select_with_note" && (
                              <input
                                type="text"
                                value={form[f.noteKey] || ""}
                                onChange={(e) => updateField(f.noteKey, e.target.value)}
                                placeholder={f.notePlaceholder}
                                className="w-full mt-2 border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}

                  {/* カスタム項目セクション */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 border-b border-stone-200 pb-1">
                      自分だけの評価項目
                    </h3>
                    {customFields.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        {customFields.map((cf) => (
                          <div key={cf.key} className="relative group">
                            <label className="block text-xs text-slate-600 mb-1.5 font-medium">{cf.label}</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={form[cf.key] || ""}
                                onChange={(e) => updateField(cf.key, e.target.value)}
                                className="flex-1 border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                              />
                              <button
                                onClick={() => removeCustomField(cf.key)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="この項目を削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={newCustomLabel}
                        onChange={(e) => setNewCustomLabel(e.target.value)}
                        placeholder="新しい項目の名前（例：面接の雰囲気）"
                        className="flex-1 sm:w-64 border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        onKeyDown={(e) => e.key === "Enter" && addCustomField()}
                      />
                      <button
                        onClick={addCustomField}
                        disabled={!newCustomLabel.trim()}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors font-bold whitespace-nowrap"
                      >
                        追加
                      </button>
                    </div>
                  </section>
                </div>
              </div>

              <div className="bg-stone-50 border-t border-stone-200 p-4 sticky bottom-0 z-10 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-stone-200 rounded transition-colors font-bold"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveCompany}
                  disabled={!form.name.trim()}
                  className="px-6 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  保存する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
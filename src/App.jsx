import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Banknote,
  Search,
  Sparkles,
  Loader2,
  X,
  Plus,
  Trash2,
  Pencil,
  ScrollText,
  ChevronDown,
  Download,
  Upload,
  SlidersHorizontal,
} from "lucide-react";

// ★ Supabase クライアントのインポート
import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------------------------
function isValidNumber(val) {
  if (val === null || val === undefined || val === "") return false;
  return !isNaN(Number(val));
}

function cleanCompanyData(data) {
  const cleaned = { ...data };
  if (cleaned.revenue && (!isValidNumber(cleaned.revenue) || cleaned.revenue === cleaned.myPageId)) {
    cleaned.revenue = "";
  }
  if (cleaned.employees && (!isValidNumber(cleaned.employees) || cleaned.employees === cleaned.myPagePw)) {
    cleaned.employees = "";
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// フィールド定義
// ---------------------------------------------------------------------------
const FIELD_SECTIONS = [
  {
    title: "基本情報",
    fields: [
      { key: "features", label: "特徴", type: "textarea" },
      { key: "business", label: "事業内容", type: "textarea" },
      { key: "philosophy", label: "企業理念", type: "textarea" },
      { key: "salary", label: "平均年収", type: "number", unit: "万円" },
      {
        key: "growthStage",
        label: "成長企業か",
        type: "select",
        options: ["不明", "成長中", "安定", "縮小傾向"],
      },
    ],
  },
  {
    title: "社風・将来性",
    fields: [
      { key: "teamwork", label: "チームワーク", type: "textarea" },
      { key: "futureGoals", label: "今後の目標", type: "textarea" },
      {
        key: "decisivePoint",
        label: "決め手",
        type: "textarea",
        personal: true,
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
      { key: "locations", label: "勤務地", type: "locations" },
      {
        key: "noTransfer",
        label: "転勤の有無",
        type: "select",
        options: ["不明", "転勤なし", "転勤あり"],
      },
      {
        key: "overseasWork",
        label: "海外勤務",
        type: "select_with_note",
        options: ["不明", "あり", "なし"],
        noteKey: "overseasWorkNote",
        notePlaceholder: "メモ",
      },
      {
        key: "remoteWork",
        label: "リモートワーク",
        type: "select",
        options: ["不明", "可", "ハイブリット", "部門による", "不可"],
      },
      {
        key: "flexSystem",
        label: "フレックス制度",
        type: "select",
        options: ["不明", "コア", "フル", "部門による", "なし"],
      },
      {
        key: "monthlyOvertimeHours",
        label: "月残業時間",
        type: "number",
        unit: "h",
      },
      { key: "memoStyle", label: "メモ", type: "textarea" },
    ],
  },
  {
    title: "募集・採用",
    fields: [
      { key: "jobType", label: "希望職種・募集職種", type: "textarea" },
      { key: "requiredTalent", label: "求められる人材", type: "textarea" },
      {
        key: "noExperienceOk",
        label: "未経験可否",
        type: "select",
        options: ["不明", "可", "条件付きで可", "不可"],
      },
      { key: "internship", label: "インターン情報", type: "textarea" },
      {
        key: "recruitmentInfo",
        label: "採用情報",
        type: "textarea",
        placeholder: "選考フロー等",
      },
      {
        key: "myPageUrl",
        label: "マイページURL",
        type: "url",
        personal: true,
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
const CUSTOM_FIELDS_STORAGE_KEY = "company-notebook:custom-fields:v1";

// カードに表示する初期設定項目
const DEFAULT_VISIBLE_FIELDS = ["features", "business", "salary", "locations", "remoteWork", "monthlyOvertimeHours"];

function emptyForm() {
  const initial = { name: "" };
  ALL_FIELDS.forEach((f) => {
    initial[f.key] = "";
    if (f.noteKey) initial[f.noteKey] = "";
  });

  initial.myPageId = "";
  initial.myPagePw = "";
  initial.revenue = "";
  initial.employees = "";
  initial.memoStyle = "";

  return initial;
}

function normalizeCompany(raw) {
  const base = emptyForm();
  return { id: raw.id, addedAt: raw.addedAt, ...base, ...raw };
}

function parseAiJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function FileTab({ index }) {
  return (
    <div className="absolute -top-3 left-5 px-2 py-0.5 bg-emerald-700 text-stone-50 text-xs tracking-widest rounded-t">
      No.{String(index + 1).padStart(3, "0")}
    </div>
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
        className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
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
          className="w-32 border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
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
        className="border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
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
        className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
    />
  );
}

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [user, setUser] = useState(null);

  // カードに表示する項目の管理
  const [visibleKeys, setVisibleKeys] = useState(DEFAULT_VISIBLE_FIELDS);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [locationFilter, setLocationFilter] = useState([]);
  const [conditionFilter, setConditionFilter] = useState([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [overtimeMax, setOvertimeMax] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // Auth 監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabase データ読み込み
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (data) {
          const loadedCompanies = data.map((item) => {
            const cleanedData = cleanCompanyData(item.data || {});
            return {
              id: item.id,
              name: item.name,
              addedAt: new Date(item.created_at).getTime(),
              ...cleanedData,
            };
          });
          setCompanies(loadedCompanies.map(normalizeCompany));
        }
      } catch (e) {
        console.error("読み込みエラー:", e.message);
      }

      try {
        const savedCustom = localStorage.getItem(CUSTOM_FIELDS_STORAGE_KEY);
        if (savedCustom) setCustomFields(JSON.parse(savedCustom));
      } catch (e) {
        console.error("カスタム項目読み込みエラー:", e);
      } finally {
        setLoaded(true);
      }
    };

    fetchData();
  }, []);

  // カスタム項目の保存
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(CUSTOM_FIELDS_STORAGE_KEY, JSON.stringify(customFields));
    } catch (e) {
      console.error("カスタム項目保存エラー:", e);
    }
  }, [customFields, loaded]);

  // 表示項目のトグル制御
  function toggleVisibleKey(key) {
    setVisibleKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function addCustomField() {
    if (!newCustomLabel.trim()) return;
    const key = `custom_${Date.now()}`;
    const newField = { key, label: newCustomLabel.trim() };
    setCustomFields((prev) => [...prev, newField]);
    setVisibleKeys((prev) => [...prev, key]); // 追加した項目は自動で表示対象に
    setNewCustomLabel("");
  }

  function removeCustomField(key) {
    if (!window.confirm("この追加項目を削除しますか？")) return;
    setCustomFields((prev) => prev.filter((cf) => cf.key !== key));
  }

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/company-notebook/' }
    });
    if (error) console.error("ログインエラー:", error.message);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("ログアウトエラー:", error.message);
  };

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
        alert("読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

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

    f.name = company.name || "";
    f.myPageId = company.myPageId ?? company.data?.myPageId ?? "";
    f.myPagePw = company.myPagePw ?? company.data?.myPagePw ?? "";

    const rawRevenue = company.revenue ?? company.data?.revenue ?? "";
    f.revenue = isValidNumber(rawRevenue) ? String(rawRevenue) : "";

    const rawEmployees = company.employees ?? company.data?.employees ?? "";
    f.employees = isValidNumber(rawEmployees) ? String(rawEmployees) : "";

    f.memoStyle = company.memoStyle ?? company.data?.memoStyle ?? "";

    customFields.forEach((cf) => {
      f[cf.key] = company[cf.key] ?? company.data?.[cf.key] ?? "";
    });

    setForm(f);
    setEditingId(company.id);
    setAiError("");
    setShowForm(true);
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveCompany() {
    try {
      if (!form.name || !form.name.trim()) {
        alert("企業名を入力してください。");
        return;
      }

      const payloadFields = {};
      ALL_FIELDS.forEach((field) => {
        if (field.type === "locations") {
          const locStr = form.locations || "";
          payloadFields.locations = locStr
            .split(/[、,]/)
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (field.type === "number") {
          payloadFields[field.key] = form[field.key] ? Number(form[field.key]) : null;
        } else {
          payloadFields[field.key] = form[field.key] ?? "";
        }
        if (field.noteKey) payloadFields[field.noteKey] = form[field.noteKey] ?? "";
      });

      payloadFields.myPageId = form.myPageId || "";
      payloadFields.myPagePw = form.myPagePw || "";
      payloadFields.revenue = isValidNumber(form.revenue) ? String(form.revenue) : "";
      payloadFields.employees = isValidNumber(form.employees) ? String(form.employees) : "";
      payloadFields.memoStyle = form.memoStyle || "";

      customFields.forEach((cf) => {
        payloadFields[cf.key] = form[cf.key] || "";
      });

      const recordData = {
        name: form.name.trim(),
        data: payloadFields,
      };

      if (editingId) {
        const { error } = await supabase
          .from("companies")
          .update(recordData)
          .eq("id", editingId);

        if (error) throw error;

        setCompanies((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, name: form.name.trim(), ...payloadFields } : c))
        );
      } else {
        const { data, error } = await supabase
          .from("companies")
          .insert([recordData])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          const newCompany = {
            id: data[0].id,
            addedAt: new Date(data[0].created_at).getTime(),
            name: data[0].name,
            ...data[0].data,
          };
          setCompanies((prev) => [...prev, newCompany]);
        }
      }

      setShowForm(false);
      setForm(emptyForm());
      setEditingId(null);

    } catch (e) {
      console.error("保存詳細エラー:", e);
      alert(`保存できませんでした。\n【理由】: ${e.message || JSON.stringify(e)}`);
    }
  }

  async function deleteCompany(id) {
    if (!window.confirm("この企業の情報を削除してもよろしいですか？")) return;
    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert("削除に失敗しました: " + e.message);
    }
  }

  async function generateWithAi() {
    if (!form.name.trim()) return;
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [
            {
              role: "user",
              content: `企業名「${form.name}」について、一般的に知られている情報をもとに以下のJSON形式のみで出力してください。前置き・説明・コードブロック記号は一切不要です。不明な項目はnullか"不明"にしてください。\n\n{\n${schemaLines}\n}`,
            },
          ],
        }),
      });
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
      setAiError(`AI生成に失敗しました: ${e.message || "不明なエラー"}`);
    } finally {
      setAiLoading(false);
    }
  }

  // 表示項目として選択可能な全リスト
  const ALL_DISPLAY_OPTIONS = [
    ...ALL_FIELDS.map((f) => ({ key: f.key, label: f.label, unit: f.unit })),
    ...customFields.map((cf) => ({ key: cf.key, label: cf.label })),
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 pb-24">
      {/* ヘッダー */}
      <header className="border-b border-stone-300 bg-stone-50/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <ScrollText className="w-6 h-6 text-emerald-700" />
            <div>
              <h1 className="text-xl text-slate-900 tracking-wide font-title">企業比較ノート</h1>
              <p className="text-xs text-slate-500">気になる企業を1社ずつ記録して、条件で見比べる</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded hover:bg-slate-900 transition-colors"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
              >
                Googleでログイン
              </button>
            )}

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

      {/* メインコンテンツ */}
      <main className="max-w-5xl mx-auto px-5 py-6">

        {/* 🎛 表（カード）に出す項目のカスタマイズ設定パネル */}
        <div className="bg-white border border-stone-200 rounded-md mb-4 p-3 shadow-sm">
          <button
            onClick={() => setShowDisplaySettings((s) => !s)}
            className="flex items-center justify-between w-full text-xs font-bold text-slate-700"
          >
            <span className="flex items-center gap-1.5 text-emerald-800">
              <SlidersHorizontal className="w-4 h-4" />
              表（カード）に表示する項目を設定・変更する
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDisplaySettings ? "rotate-180" : ""}`} />
          </button>

          {showDisplaySettings && (
            <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
              <p className="text-xs text-slate-500">チェックを入れた項目が企業カード上に表示されます。</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {ALL_DISPLAY_OPTIONS.map((opt) => {
                  const active = visibleKeys.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      onClick={() => toggleVisibleKey(opt.key)}
                      className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                        active
                          ? "bg-emerald-700 text-white border-emerald-700 font-semibold"
                          : "bg-stone-100 text-slate-600 border-stone-200 hover:bg-stone-200"
                      }`}
                    >
                      {active ? "✓ " : "+ "}{opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* フィルター */}
        <div className="bg-white border border-stone-200 rounded-md mb-6">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-700"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              絞り込み
              {(locationFilter.length > 0 ||
                conditionFilter.length > 0 ||
                salaryMin ||
                salaryMax ||
                overtimeMax ||
                keyword) && <span className="text-emerald-700">（適用中）</span>}
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
                className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
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
                    className="w-20 border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                  <span className="text-slate-400">〜</span>
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="上限"
                    className="w-20 border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">月残業上限(h)</span>
                  <input
                    type="number"
                    value={overtimeMax}
                    onChange={(e) => setOvertimeMax(e.target.value)}
                    placeholder="例）20"
                    className="w-20 border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>
              </div>

              <button
                onClick={resetFilters}
                className="text-xs text-slate-500 hover:text-rose-600 underline underline-offset-2"
              >
                条件をクリア
              </button>
            </div>
          )}
        </div>

        {/* 企業一覧 */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 border border-dashed border-stone-300 rounded-md">
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

              return (
                <div
                  key={c.id}
                  className="relative bg-white border border-stone-200 rounded-md pt-5 pb-4 px-4 transition-shadow space-y-3"
                >
                  <FileTab index={originalIndex} />
                  
                  {/* ヘッダー部（企業名・操作ボタン） */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base text-slate-900 font-title font-bold">{c.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditForm(c)} className="p-1 text-slate-400 hover:text-emerald-700" aria-label="編集">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCompany(c.id)} className="p-1 text-slate-400 hover:text-rose-600" aria-label="削除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 売上高・従業員数・1人あたり売上 */}
                  <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500">売上高: </span>
                      <span className="font-bold text-slate-800">
                        {isValidNumber(c.revenue) ? `${c.revenue}億円` : "-"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500">従業員: </span>
                      <span className="font-bold text-slate-800">
                        {isValidNumber(c.employees) ? `${c.employees}人` : "-"}
                      </span>
                    </div>

                    <div className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">
                      1人あたり: {(() => {
                        if (!isValidNumber(c.revenue) || !isValidNumber(c.employees)) return "-";
                        const rev = parseFloat(c.revenue);
                        const emp = parseFloat(c.employees);
                        if (rev <= 0 || emp <= 0) return "-";
                        
                        const perEmp = (rev * 10000) / emp; 
                        return perEmp >= 10000
                          ? `${(perEmp / 10000).toFixed(1)}億円`
                          : `${Math.round(perEmp).toLocaleString()}万円`;
                      })()}
                    </div>
                  </div>

                  {/* ★ 選択された表示項目のダイナミックレンダリング */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-stone-100">
                    {ALL_DISPLAY_OPTIONS.filter((opt) => visibleKeys.includes(opt.key)).map((opt) => {
                      let rawVal = c[opt.key];
                      if (Array.isArray(rawVal)) rawVal = rawVal.join("、");
                      if (!rawVal) return null;

                      return (
                        <div key={opt.key} className="line-clamp-3">
                          <span className="font-bold text-slate-700">{opt.label}: </span>
                          <span>{rawVal}{opt.unit ? opt.unit : ""}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* マイページ情報 */}
                  {(c.myPageId || c.myPagePw) && (
                    <div className="mt-2 p-2 bg-stone-100 rounded text-xs text-slate-700 flex flex-wrap gap-3">
                      {c.myPageId && <div><span className="font-bold text-slate-500">ID:</span> {c.myPageId}</div>}
                      {c.myPagePw && <div><span className="font-bold text-slate-500">PW:</span> {c.myPagePw}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 登録・編集モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? "企業情報を編集" : "新しい企業を追加"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 企業名 & AI生成 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">企業名 *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="株式会社〇〇"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="flex-1 border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>
              {aiError && <p className="text-xs text-rose-600 mt-1">{aiError}</p>}
            </div>

            {/* 売上高・従業員数 */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <span className="block text-xs font-bold text-stone-700 mb-2">業績・規模</span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-stone-600">売上高:</span>
                  <input
                    type="number"
                    value={form.revenue || ""}
                    onChange={(e) => updateField("revenue", e.target.value)}
                    placeholder="100"
                    className="w-20 border border-stone-300 rounded px-2 py-1 text-sm bg-white"
                  />
                  <span className="text-xs text-stone-500">億円</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xs text-stone-600">従業員数:</span>
                  <input
                    type="number"
                    value={form.employees || ""}
                    onChange={(e) => updateField("employees", e.target.value)}
                    placeholder="500"
                    className="w-20 border border-stone-300 rounded px-2 py-1 text-sm bg-white"
                  />
                  <span className="text-xs text-stone-500">人</span>
                </div>

                <div className="flex items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                  <span className="text-xs font-bold text-emerald-800">1人あたり:</span>
                  <span className="text-xs font-extrabold text-emerald-900">
                    {(() => {
                      if (!isValidNumber(form.revenue) || !isValidNumber(form.employees)) return "-";
                      const rev = parseFloat(form.revenue);
                      const emp = parseFloat(form.employees);
                      if (rev <= 0 || emp <= 0) return "-";
                      
                      const perEmp = (rev * 10000) / emp; 
                      return perEmp >= 10000
                        ? `${(perEmp / 10000).toFixed(1)}億円/人`
                        : `${Math.round(perEmp).toLocaleString()}万円/人`;
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* 各セクションの入力項目 */}
            {FIELD_SECTIONS.map((sec) => (
              <div key={sec.title} className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-400 border-b pb-1">{sec.title}</h3>
                <div className="grid gap-3">
                  {sec.fields.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{f.label}</label>
                      <FieldInput field={f} value={form[f.key] || ""} onChange={(v) => updateField(f.key, v)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* 独自追加項目セクション */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
              <span className="text-xs font-bold text-stone-700 block">独自追加項目</span>

              {customFields.length > 0 && (
                <div className="space-y-2">
                  {customFields.map((cf) => (
                    <div key={cf.key} className="flex items-center gap-2">
                      <label className="w-1/3 text-xs font-semibold text-slate-700 truncate">{cf.label}</label>
                      <input
                        type="text"
                        value={form[cf.key] || ""}
                        onChange={(e) => updateField(cf.key, e.target.value)}
                        className="flex-1 border border-stone-300 rounded px-2 py-1 text-xs bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(cf.key)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="項目を削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
                <input
                  type="text"
                  placeholder="新しい項目名（例：選考倍率、グループ会社など）"
                  value={newCustomLabel}
                  onChange={(e) => setNewCustomLabel(e.target.value)}
                  className="flex-1 border border-stone-300 rounded px-2 py-1 text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={addCustomField}
                  className="bg-slate-700 hover:bg-slate-800 text-white text-xs px-3 py-1 rounded shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  項目を追加
                </button>
              </div>
            </div>

            {/* ID / PW 欄 */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
              <span className="block text-xs font-bold text-stone-700">マイページログイン情報（自分用メモ）</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="ID"
                  value={form.myPageId || ""}
                  onChange={(e) => updateField("myPageId", e.target.value)}
                  className="border border-stone-300 rounded px-2 py-1 text-xs bg-white"
                />
                <input
                  type="password"
                  placeholder="PW"
                  value={form.myPagePw || ""}
                  onChange={(e) => updateField("myPagePw", e.target.value)}
                  className="border border-stone-300 rounded px-2 py-1 text-xs bg-white"
                />
              </div>
            </div>

            {/* 保存・キャンセルボタン */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-stone-100 rounded"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={saveCompany}
                className="px-4 py-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
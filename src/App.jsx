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
} from "lucide-react";

// ★ Supabase クライアントのインポート（パスは環境に合わせて調整してください）
import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// フィールド定義（唯一の情報源）
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
      { key: "requiredTalent", label: "求められる人材/向いている人", type: "textarea" },
      {
        key: "decisivePoint",
        label: "決め手",
        type: "textarea",
        personal: true
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
        options: ["不明", "あり","なし"],
        noteKey: "overseasWorkNote",
        notePlaceholder: "メモ（例：希望者のみ、拠点名 など）",
      },
      {
        key: "remoteWork",
        label: "リモートワーク",
        type: "select",
        options: ["不明","可", "ハイブリット","部門による","不可"],
      },
      {
        key: "flexSystem",
        label: "フレックス制度",
        type: "select",
        options: [ "不明","コア","フル","部門による", "なし",],
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
      { key: "memoStyle", label: "メモ", type: "textarea" },
    ],
  },
  {
    title: "募集・採用",
    fields: [
      {
      key: "myPageUrl",
      label: "マイページURL",
      type: "url",
      personal: true,
      placeholder: "https://... ",
    },
    
      { key: "internship", label: "インターン情報", type: "textarea" },
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
const CUSTOM_FIELDS_STORAGE_KEY = "company-notebook:custom-fields:v1";

function emptyForm() {
  const initial = { name: "" };
  ALL_FIELDS.forEach((f) => {
    initial[f.key]="";
    if (f.noteKey) initial[f.noteKey] = "";
  });

  initial.myPageId="";
  initial.myPagePw="";
  
  initial.revenue="";
  initial.employees="";

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

  useEffect(() => {
    // 現在ログインしているユーザーがいるか確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // ログイン・ログアウトの動きを監視して自動でuserを更新
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  // ログアウト処理を追加します
  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/company-notebook/'
      }
    });
    if (error) {
      console.error("ログインに失敗しました:", error.message);
    }
  };
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("ログアウトに失敗しました:", error.message);
    }
  };

  // ★ 1. 【初期データ取得】Supabase から企業データをロード
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (data) {
          // JSONB型「data」の中身を展開してステート用にパースする
          const loadedCompanies = data.map((item) => ({
            id: item.id,
            name: item.name,
            addedAt: new Date(item.created_at).getTime(),
            ...item.data, // 詳細データ(JSONB)をそのままマージ
          }));
          setCompanies(loadedCompanies.map(normalizeCompany));
        }
      } catch (e) {
        console.error("Supabaseからの読み込みに失敗しました:", e.message);
      }

      // カスタム表示設定はブラウザ固有の LocalStorage に保存
      try {
        const savedCustom = localStorage.getItem(CUSTOM_FIELDS_STORAGE_KEY);
        if (savedCustom) setCustomFields(JSON.parse(savedCustom));
      } catch (e) {
        console.error("カスタム項目の読み込みに失敗しました:", e);
      } finally {
        setLoaded(true);
      }
    };

    fetchData();
  }, []);

  // ★ カスタム項目の定義が変更されたら LocalStorage に同期
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(CUSTOM_FIELDS_STORAGE_KEY, JSON.stringify(customFields));
    } catch (e) {
      console.error("カスタム項目の保存に失敗しました:", e);
    }
  }, [customFields, loaded]);

  // ローカルエクスポート・インポート
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

    f.myPageId = company.myPageId || company.data?.myPageId || "";
    f.myPagePw = company.myPagePw || company.data?.myPagePw || "";
    
    f.revenue = company.revenue || company.data?.revenue || "";
    f.employees = company.employees || company.data?.revenue || "";

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

  // ★ 2. 【保存処理】Supabase の JSONB(data) 形式に合わせて新規作成・編集を送信
  // ★ 究極の安全版 saveCompany 関数
  async function saveCompany() {
    // 💡 関数の最初から全体を try で囲み、どんなエラーも逃さないようにします
    try {
      if (!form.name || !form.name.trim()) {
        alert("企業名を入力してください。");
        return;
      }

      // 1. 送信データの整形
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

      payloadFields.revenue = form.myPageId || "";
      payloadFields.employees = form.myPagePw || "";

      customFields.forEach((cf) => {
        payloadFields[cf.key] = form[cf.key] || "";
      });

      // 2. 送信する基本データ
      const recordData = {
        name: form.name.trim(),
        data: payloadFields,
      };

      // 3. Supabaseへ送信
      if (editingId) {
        // 【更新】
        const { error } = await supabase
          .from("companies")
          .update(recordData)
          .eq("id", editingId);

        if (error) throw error;

        setCompanies((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, name: form.name.trim(), ...payloadFields } : c))
        );
      } else {
        // 【新規追加】
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

      // 4. 成功処理
      setShowForm(false);
      setForm(emptyForm());
      setEditingId(null);

    } catch (e) {
      console.error("保存詳細エラー:", e);
      // エラーの理由をポップアップで具体的に表示
      alert(`保存できませんでした。\n【理由】: ${e.message || JSON.stringify(e)}`);
    }
  }


  // ★ 3. 【削除処理】Supabase から削除
  async function deleteCompany(id) {
    if (!window.confirm("この企業の情報を削除してもよろしいですか？")) return;
    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCompanies((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (e) {
      alert("削除に失敗しました: " + e.message);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function toggleExpand(id) {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  // AI自動生成ロジック
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
              content: `企業名「${form.name}」について、一般的に知られている情報をもとに以下のJSON形式のみで出力してください。前置き・説明・コードブロック記号は一切不要です。不明な項目はnullか"不明"にしてください。推測であることを前提に、断定しすぎない自然な内容にしてください。\n\n{\n${schemaLines}\n}`,
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

  const selectedCompanies = companies.filter((c) => selectedIds.includes(c.id));

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 pb-24">
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
            
            {/* 👇 このボタンのコードを差し込みます */}
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
              title="データをJSONファイルとして書き出し（他の端末へ移すときに使う）"
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
              const selected = selectedIds.includes(c.id);
              const expanded = expandedIds.includes(c.id);
              const otTone = overtimeTone(c.monthlyOvertimeHours);
              return (
                <div
                  key={c.id}
                  className={`relative bg-white border rounded-md pt-5 pb-4 px-4 transition-shadow ${
                    selected ? "border-emerald-500 ring-1 ring-emerald-400" : "border-stone-200"
                  }`}
                >
                  <FileTab index={originalIndex} />
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base text-slate-900 font-title">{c.name}</h3>
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
                    {otTone && (
                      <Tag tone={otTone}>残業 月{c.monthlyOvertimeHours}h</Tag>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 my-3 p-2 bg-stone-50 rounded-lg border border-stone-200">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-stone-600">売上高;</span>
                      <input
                        type="number"
                        value={form.revenue || ""}
                        onChange={(e)=>updateField("revenue", e.target.value)}
                        placeholder="100"
                        className="w-20 border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                        <span className="text-xs text-stone-500">億円</span>
                    </div>

                    <div className="flex items-center gap-1">
    <span className="text-xs font-bold text-stone-600">従業員数:</span>
    <input
      type="number"
      value={form.employees || ""}
      onChange={(e) => updateField("employees", e.target.value)}
      placeholder="500"
      className="w-20 border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
    />
    <span className="text-xs text-stone-500">人</span>
  </div>

  {/* 1人当たり売上（自動計算結果） */}
  <div className="flex items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
    <span className="text-xs font-bold text-emerald-800">1人あたり:</span>
    <span className="text-sm font-extrabold text-emerald-900">
      {(() => {
        const rev = parseFloat(form.revenue);
        const emp = parseFloat(form.employees);
        if (!rev || !emp || emp <= 0) return "-";
        
        // 売上(億円) ÷ 従業員数(人) から「万円」を算出
        const perEmp = (rev * 10000) / emp; 
        
        return perEmp >= 10000
          ? `${(perEmp / 10000).toFixed(1)}億円/人`
          : `${Math.round(perEmp).toLocaleString()}万円/人`;
      })()}
    </span>
  </div>
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
                    className="flex items-center gap-1 text-xs text-emerald-700 mb-2"
                  >
                    {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    詳細を{expanded ? "閉じる" : "見る"}
                  </button>

                  {expanded && (
                    <div className="space-y-2.5 mb-3 border-t border-stone-100 pt-3">
                      {FIELD_SECTIONS.map((section) => (
                        <div key={section.title}>
                          <p className="text-xs text-slate-400 mb-1">{section.title}</p>
                          <div className="space-y-1.5">
                            {section.fields.map((f) => {
                              const val = c[f.key];
                              const isEmpty =
                                f.type === "locations"
                                  ? !val || val.length === 0
                                  : !val || val === "不明";
                              if (isEmpty) return null;
                              return (
                                <div key={f.key} className="text-xs text-slate-600">
                                  <span className="text-slate-400">{f.label}：</span>
                                  {renderCompareValue(f, c)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {customFields.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">カスタム項目</p>
                          <div className="space-y-1.5">
                            {customFields
                              .filter((cf) => c[cf.key])
                              .map((cf) => (
                                <div key={cf.key} className="text-xs text-slate-600">
                                  <span className="text-slate-400">{cf.label}：</span>
                                  {c[cf.key]}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-slate-500 border-t border-stone-100 pt-2.5 cursor-pointer">
                    <input type="checkbox" checked={selected} onChange={() => toggleSelect(c.id)} className="accent-emerald-700" />
                    比較する企業に追加
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-stone-50 z-30">
          <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <div className="text-sm">
              比較リスト: <span className="text-emerald-400">{selectedIds.length}社</span>選択中
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCompare(true)} className="bg-emerald-600 hover:bg-emerald-500 text-stone-50 text-sm px-3 py-1.5 rounded">
                比較表を見る
              </button>
              <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-stone-100 text-sm px-2 py-1.5">
                選択解除
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompare && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-md max-w-6xl w-full mt-8 mb-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h2 className="text-lg text-slate-900 font-title">企業比較表</h2>
              <button onClick={() => setShowCompare(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto p-5">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr>
                    <td className="w-32 text-xs text-slate-400 align-top py-3 pr-3">企業名</td>
                    {selectedCompanies.map((c) => (
                      <td key={c.id} className="align-top py-3 px-3 border-l border-stone-100 text-slate-900 min-w-[200px] font-title">
                        {c.name}
                      </td>
                    ))}
                  </tr>
                  {FIELD_SECTIONS.map((section) => (
                    <Fragment key={section.title}>
                      <tr className="border-t border-stone-200">
                        <td colSpan={selectedCompanies.length + 1} className="text-xs text-emerald-700 pt-4 pb-1 font-medium">
                          {section.title}
                        </td>
                      </tr>
                      {section.fields.map((f) => (
                        <tr key={f.key} className="border-t border-stone-100">
                          <td className="text-xs text-slate-400 align-top py-3 pr-3">{f.label}</td>
                          {selectedCompanies.map((c) => (
                            <td key={c.id} className="align-top py-3 px-3 border-l border-stone-100 text-slate-600">
                              {renderCompareValue(f, c)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {customFields.length > 0 && (
                    <Fragment>
                      <tr className="border-t border-stone-200">
                        <td colSpan={selectedCompanies.length + 1} className="text-xs text-emerald-700 pt-4 pb-1 font-medium">
                          カスタム項目
                        </td>
                      </tr>
                      {customFields.map((cf) => (
                        <tr key={cf.key} className="border-t border-stone-100">
                          <td className="text-xs text-slate-400 align-top py-3 pr-3">{cf.label}</td>
                          {selectedCompanies.map((c) => (
                            <td key={c.id} className="align-top py-3 px-3 border-l border-stone-100 text-slate-600">
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

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-md max-w-2xl w-full mt-8 mb-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h2 className="text-lg text-slate-900 font-title">{editingId ? "企業情報を編集" : "企業を追加"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* 企業名 */}
        <div>
          <label className="text-xs text-slate-500 block mb-1">企業名</label>
          <input
            type="text"
            value={form.name} // 
            onChange={(e) => updateField("name", e.target.value)} // 
            placeholder="例）株式会社◯◯"
            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

              {FIELD_SECTIONS.map((section) => (
        <div key={section.title}>
          {/* セクションの見出し（基本情報、募集・採用など） */}
          <p className="text-xs text-emerald-700 font-medium mb-2 border-b border-stone-100 pb-1">{section.title}</p>
          
          <div className="space-y-3">
            {section.fields.map((f) => {
              // 👇 マイページURLの時だけ「URL・ID・PW」を横並びにする特別ルール
              if (f.key === "myPageUrl") {
                return (
                  <div key={f.key}>
                    <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                    
                    {/* flexで3つの入力ボックスを横並びにするコンテナ */}
                    <div className="flex gap-2">
                      {/* 左側：URL入力欄 */}
                      <div className="flex-1">
                        <FieldInput field={f} value={form[f.key]} onChange={(v) => updateField(f.key, v)} />
                      </div>
                      
                      {/* 真ん中：ID入力欄 */}
                      <input
                        type="text"
                        value={form.myPageId || ""}
                        onChange={(e) => updateField("myPageId", e.target.value)}
                        placeholder="ID"
                        className="w-28 border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      
                      {/* 右側：パスワード入力欄 */}
                      <input
                        type="text"
                        value={form.myPagePw || ""}
                        onChange={(e) => updateField("myPagePw", e.target.value)}
                        placeholder="PW"
                        className="w-24 border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                );
              }

              // メモ付きのセレクトボックス（通常ルール）
              if (f.type === "select_with_note") {
                return (
                  <div key={f.key}>
                    <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                    <div className="flex gap-2 flex-wrap">
                      <FieldInput field={f} value={form[f.key]} onChange={(v) => updateField(f.key, v)} />
                      <input
                        type="text"
                        value={form[f.noteKey]}
                        onChange={(e) => updateField(f.noteKey, e.target.value)}
                        placeholder={f.notePlaceholder || "メモ"}
                        className="flex-1 min-w-[160px] border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                );
              }

              // その他の通常の入力欄
              return (
                <div key={f.key}>
                  <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                  <FieldInput field={f} value={form[f.key]} onChange={(v) => updateField(f.key, v)} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
                <p className="text-xs text-emerald-700 font-medium mb-2 border-b border-stone-100 pb-1">カスタム項目</p>
                <div className="space-y-3">
                  {customFields.map((cf) => (
                    <div key={cf.key}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-500">{cf.label}</label>
                        <button
                          onClick={() => removeCustomField(cf.key)}
                          className="text-slate-300 hover:text-rose-600"
                          title="この項目を削除"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={form[cf.key] || ""}
                        onChange={(e) => updateField(cf.key, e.target.value)}
                        className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 items-center pt-1">
                    <input
                      type="text"
                      value={newCustomLabel}
                      onChange={(e) => setNewCustomLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomField()}
                      placeholder="新しい項目名（例：選考ステータス）"
                      className="flex-1 border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      onClick={addCustomField}
                      disabled={!newCustomLabel.trim()}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-stone-50 text-xs px-3 py-2 rounded whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      項目を追加
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">追加した項目はすべての企業カードに表示され、比較表にも追加されます。</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-stone-200">
              <button onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-2">
                キャンセル
              </button>
              <button
                onClick={saveCompany}
                disabled={!form.name.trim()}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-stone-50 text-sm px-4 py-2 rounded"
              >
                保存する
              </button>
            </div>
          </div>
      
      )}
    </div>
  );
}
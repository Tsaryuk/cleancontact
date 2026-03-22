"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Upload,
  Download,
  User,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import {
  fetchContacts,
  importVcf,
  exportVcf,
  Contact,
  ImportResult,
} from "../lib/api";
import ContactCard from "./components/ContactCard";

const CIRCLES = [
  { value: "", label: "Все" },
  { value: "close", label: "Ближний" },
  { value: "middle", label: "Средний" },
  { value: "distant", label: "Дальний" },
  { value: "unknown", label: "Без круга" },
];

export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [circle, setCircle] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchContacts(search || undefined, circle || undefined);
      setContacts(data);
    } finally {
      setLoading(false);
    }
  }, [search, circle]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importVcf(file);
      setImportResult(result);
      load();
    } catch {
      alert("Ошибка импорта");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportVcf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cleancontact_export.vcf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 flex flex-col bg-white border-r border-gray-200 shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">CleanContact</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} контактов</p>
        </div>

        {/* Actions */}
        <div className="p-3 flex gap-2 border-b border-gray-200">
          <label className="flex-1 cursor-pointer">
            <input
              type="file"
              accept=".vcf"
              className="hidden"
              onChange={handleImport}
              disabled={importing}
            />
            <span
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                importing
                  ? "bg-gray-100 text-gray-400"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <Upload size={15} />
              {importing ? "Импорт..." : "Импорт .vcf"}
            </span>
          </label>
          <button
            onClick={handleExport}
            disabled={exporting || contacts.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download size={15} />
            {exporting ? "..." : "Экспорт"}
          </button>
        </div>

        {/* Import result */}
        {importResult && (
          <div className="mx-3 mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-green-800">Импортировано</p>
                <p className="text-green-700 mt-0.5 text-xs">
                  Всего: {importResult.total} · Новых: {importResult.created} · Обновлено: {importResult.updated}
                </p>
              </div>
              <button
                onClick={() => setImportResult(null)}
                className="text-green-600 hover:text-green-800 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Circle filter */}
        <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
          {CIRCLES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCircle(c.value)}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                circle === c.value
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-400">Загрузка...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              {search ? "Не найдено" : "Нет контактов. Загрузите .vcf файл."}
            </div>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                  selected?.id === c.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {c.raw_name ||
                        `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
                        "Без имени"}
                    </p>
                    {c.ai_suggestions && (
                      <Sparkles size={12} className="text-purple-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.organization && (
                      <p className="text-xs text-gray-500 truncate">{c.organization}</p>
                    )}
                    {c.circle && c.circle !== "unknown" && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                          c.circle === "close"
                            ? "bg-green-100 text-green-700"
                            : c.circle === "middle"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.circle === "close"
                          ? "Близкий"
                          : c.circle === "middle"
                          ? "Средний"
                          : "Дальний"}
                      </span>
                    )}
                  </div>
                  {c.phones?.[0]?.display && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.phones[0].display}
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={14}
                  className="text-gray-300 group-hover:text-gray-400 shrink-0"
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <ContactCard
            contact={selected}
            onUpdate={(updated) => {
              setSelected(updated);
              setContacts((prev) =>
                prev.map((c) => (c.id === updated.id ? updated : c))
              );
            }}
            onDelete={(id) => {
              setSelected(null);
              setContacts((prev) => prev.filter((c) => c.id !== id));
            }}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <User size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Выберите контакт для просмотра</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

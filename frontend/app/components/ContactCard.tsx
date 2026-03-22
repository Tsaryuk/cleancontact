"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  Building,
  Tag,
  Sparkles,
  Save,
  X,
  AlertTriangle,
  Check,
  Calendar,
  AtSign,
  Link,
  User,
  Briefcase,
  Trash2,
} from "lucide-react";
import {
  Contact,
  updateContact,
  deleteContact,
  enrichContact,
  confirmSuggestions,
} from "../../lib/api";

interface Props {
  contact: Contact;
  onUpdate: (c: Contact) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const CIRCLE_OPTIONS = [
  { value: "", label: "Не задан" },
  { value: "close", label: "Ближний круг" },
  { value: "middle", label: "Средний круг" },
  { value: "distant", label: "Дальний круг" },
  { value: "unknown", label: "Неизвестно" },
];

export default function ContactCard({ contact: initial, onUpdate, onDelete, onClose }: Props) {
  const [contact, setContact] = useState<Contact>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [draft, setDraft] = useState<Partial<Contact>>({});

  // Sync when parent changes selected contact
  if (initial.id !== contact.id) {
    setContact(initial);
    setEditing(false);
    setDraft({});
  }

  const current = editing ? { ...contact, ...draft } : contact;

  async function save() {
    setSaving(true);
    try {
      const updated = await updateContact(contact.id, draft);
      setContact(updated);
      onUpdate(updated);
      setEditing(false);
      setDraft({});
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(false);
    setDraft({});
  }

  function field<K extends keyof Contact>(key: K, value: Contact[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleDelete() {
    const name = contact.raw_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "контакт";
    if (!confirm(`Удалить «${name}»?`)) return;
    setDeleting(true);
    try {
      await deleteContact(contact.id);
      onDelete(contact.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  async function handleEnrich() {
    setEnriching(true);
    try {
      const result = await enrichContact(contact.id);
      if (result.suggestions && !result.suggestions.error) {
        const updated = { ...contact, ai_suggestions: result.suggestions };
        setContact(updated as Contact);
        onUpdate(updated as Contact);
      } else {
        alert("Ошибка AI: " + (result.suggestions?.error || "неизвестная ошибка"));
      }
    } finally {
      setEnriching(false);
    }
  }

  async function handleConfirmSuggestions() {
    if (!contact.ai_suggestions) return;
    const s = contact.ai_suggestions as {
      ai_summary?: string;
      relationship?: string;
      circle?: string;
      tags?: string[];
    };
    await confirmSuggestions(contact.id, {
      ai_summary: s.ai_summary,
      relationship: s.relationship,
      circle: s.circle,
      tags: s.tags,
    });
    const updated = {
      ...contact,
      ai_summary: s.ai_summary || contact.ai_summary,
      relationship_ctx: s.relationship || contact.relationship_ctx,
      circle: s.circle || contact.circle,
      tags: s.tags || contact.tags,
      ai_suggestions: null,
    };
    setContact(updated as Contact);
    onUpdate(updated as Contact);
  }

  function handleDismissSuggestions() {
    const updated = { ...contact, ai_suggestions: null };
    setContact(updated as Contact);
    onUpdate(updated as Contact);
    updateContact(contact.id, { ai_suggestions: null });
  }

  const displayName =
    current.raw_name ||
    `${current.first_name || ""} ${current.last_name || ""}`.trim() ||
    "Без имени";

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <User size={24} className="text-blue-600" />
          </div>
          <div>
            {editing ? (
              <div className="flex gap-2">
                <input
                  value={(draft.first_name ?? current.first_name) || ""}
                  onChange={(e) => field("first_name", e.target.value)}
                  placeholder="Имя"
                  className="text-lg font-bold border-b border-blue-400 focus:outline-none w-32"
                />
                <input
                  value={(draft.last_name ?? current.last_name) || ""}
                  onChange={(e) => field("last_name", e.target.value)}
                  placeholder="Фамилия"
                  className="text-lg font-bold border-b border-blue-400 focus:outline-none w-36"
                />
              </div>
            ) : (
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
            )}
            {editing ? (
              <input
                value={(draft.organization ?? current.organization) || ""}
                onChange={(e) => field("organization", e.target.value)}
                placeholder="Организация"
                className="text-sm text-gray-500 border-b border-blue-300 focus:outline-none mt-1 w-64"
              />
            ) : (
              current.organization && (
                <p className="text-sm text-gray-500 mt-0.5">{current.organization}</p>
              )
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!editing ? (
            <>
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                <Sparkles size={14} />
                {enriching ? "AI..." : "AI обогащение"}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Редактировать
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Удалить контакт"
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Сохраняю..." : "Сохранить"}
              </button>
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* AI Suggestions Banner */}
      {contact.ai_suggestions && !("error" in contact.ai_suggestions) && (
        <div className="mb-5 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-purple-600" />
              <span className="text-sm font-medium text-purple-800">AI предлагает</span>
            </div>
            <button
              onClick={handleDismissSuggestions}
              className="text-purple-400 hover:text-purple-600"
            >
              <X size={14} />
            </button>
          </div>
          {(contact.ai_suggestions as { ai_summary?: string }).ai_summary && (
            <p className="text-sm text-purple-700 mb-2">
              {(contact.ai_suggestions as { ai_summary?: string }).ai_summary}
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-xs mb-3">
            {(contact.ai_suggestions as { circle?: string }).circle && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Круг: {(contact.ai_suggestions as { circle?: string }).circle}
              </span>
            )}
            {(contact.ai_suggestions as { relationship?: string }).relationship && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {(contact.ai_suggestions as { relationship?: string }).relationship}
              </span>
            )}
            {((contact.ai_suggestions as { tags?: string[] }).tags || []).map((t) => (
              <span key={t} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                #{t}
              </span>
            ))}
          </div>
          <button
            onClick={handleConfirmSuggestions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            <Check size={14} />
            Применить
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* Phones */}
        <Section title="Телефоны" icon={<Phone size={16} />}>
          {(current.phones || []).length === 0 ? (
            <p className="text-sm text-gray-400">Нет телефонов</p>
          ) : (
            (current.phones || []).map((ph, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-900">
                  {ph.display || ph.raw}
                </span>
                <span className="text-xs text-gray-400">{ph.type}</span>
                {ph.needs_review && (
                  <span title="Требует проверки"><AlertTriangle size={13} className="text-amber-500" /></span>
                )}
              </div>
            ))
          )}
        </Section>

        {/* Emails */}
        {(current.emails?.length ?? 0) > 0 && (
          <Section title="Email" icon={<Mail size={16} />}>
            {(current.emails || []).map((e, i) => (
              <p key={i} className="text-sm text-gray-900">{e}</p>
            ))}
          </Section>
        )}

        {/* Title / Job */}
        {(editing || current.title) && (
          <Section title="Должность" icon={<Briefcase size={16} />}>
            {editing ? (
              <input
                value={(draft.title ?? current.title) || ""}
                onChange={(e) => field("title", e.target.value)}
                placeholder="Должность"
                className="text-sm w-full border-b border-blue-300 focus:outline-none"
              />
            ) : (
              <p className="text-sm text-gray-900">{current.title}</p>
            )}
          </Section>
        )}

        {/* Telegram */}
        {(editing || current.telegram) && (
          <Section title="Telegram" icon={<AtSign size={16} />}>
            {editing ? (
              <input
                value={(draft.telegram ?? current.telegram) || ""}
                onChange={(e) => field("telegram", e.target.value)}
                placeholder="@username"
                className="text-sm w-full border-b border-blue-300 focus:outline-none"
              />
            ) : (
              <p className="text-sm text-gray-900">{current.telegram}</p>
            )}
          </Section>
        )}

        {/* Birthday */}
        {(editing || current.birthday) && (
          <Section title="День рождения" icon={<Calendar size={16} />}>
            {editing ? (
              <input
                type="date"
                value={(draft.birthday ?? current.birthday) || ""}
                onChange={(e) => field("birthday", e.target.value as never)}
                className="text-sm border-b border-blue-300 focus:outline-none"
              />
            ) : (
              <p className="text-sm text-gray-900">{current.birthday}</p>
            )}
          </Section>
        )}

        {/* Circle */}
        <Section title="Круг общения" icon={<User size={16} />}>
          {editing ? (
            <select
              value={(draft.circle ?? current.circle) || ""}
              onChange={(e) => field("circle", e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CIRCLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <span
              className={`inline-block text-sm px-2 py-0.5 rounded-full ${
                current.circle === "close"
                  ? "bg-green-100 text-green-700"
                  : current.circle === "middle"
                  ? "bg-blue-100 text-blue-700"
                  : current.circle === "distant"
                  ? "bg-gray-100 text-gray-600"
                  : "bg-yellow-50 text-yellow-700"
              }`}
            >
              {CIRCLE_OPTIONS.find((o) => o.value === current.circle)?.label || "Не задан"}
            </span>
          )}
        </Section>

        {/* Tags */}
        <Section title="Теги" icon={<Tag size={16} />}>
          {editing ? (
            <input
              value={((draft.tags ?? current.tags) || []).join(", ")}
              onChange={(e) =>
                field(
                  "tags",
                  e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                )
              }
              placeholder="тег1, тег2, тег3"
              className="text-sm w-full border-b border-blue-300 focus:outline-none"
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(current.tags || []).length === 0 ? (
                <p className="text-sm text-gray-400">Нет тегов</p>
              ) : (
                (current.tags || []).map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                  >
                    #{t}
                  </span>
                ))
              )}
            </div>
          )}
        </Section>

        {/* AI Summary */}
        {(editing || current.ai_summary) && (
          <Section title="AI описание" icon={<Sparkles size={16} />}>
            {editing ? (
              <textarea
                value={(draft.ai_summary ?? current.ai_summary) || ""}
                onChange={(e) => field("ai_summary", e.target.value)}
                placeholder="Кто этот человек..."
                rows={3}
                className="text-sm w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-700">{current.ai_summary}</p>
            )}
          </Section>
        )}

        {/* Notes */}
        <Section title="Заметки" icon={<Link size={16} />}>
          {editing ? (
            <textarea
              value={(draft.notes ?? current.notes) || ""}
              onChange={(e) => field("notes", e.target.value)}
              placeholder="Добавьте заметки..."
              rows={4}
              className="text-sm w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          ) : current.notes ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{current.notes}</p>
          ) : (
            <p className="text-sm text-gray-400">Нет заметок</p>
          )}
        </Section>

        {/* Relationship */}
        {(editing || current.relationship_ctx) && (
          <Section title="Контекст" icon={<Building size={16} />}>
            {editing ? (
              <input
                value={(draft.relationship_ctx ?? current.relationship_ctx) || ""}
                onChange={(e) => field("relationship_ctx", e.target.value)}
                placeholder="Коллега, друг, клиент..."
                className="text-sm w-full border-b border-blue-300 focus:outline-none"
              />
            ) : (
              <p className="text-sm text-gray-700">{current.relationship_ctx}</p>
            )}
          </Section>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 flex gap-4">
        {contact.import_uid && <span>UID: {contact.import_uid.slice(0, 12)}…</span>}
        {contact.imported_at && (
          <span>Импорт: {new Date(contact.imported_at).toLocaleDateString("ru-RU")}</span>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-gray-400">{icon}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

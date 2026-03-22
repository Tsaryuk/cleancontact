const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PhoneEntry {
  raw: string;
  normalized?: string;
  display?: string;
  type: string;
  needs_review: boolean;
}

export interface Contact {
  id: string;
  raw_name?: string;
  first_name?: string;
  last_name?: string;
  phones: PhoneEntry[];
  emails: string[];
  birthday?: string;
  organization?: string;
  title?: string;
  notes?: string;
  telegram?: string;
  social_links: Record<string, string | string[]>;
  circle?: string;
  tags: string[];
  relationship_ctx?: string;
  ai_summary?: string;
  ai_suggestions?: Record<string, unknown> | null;
  cleaned: boolean;
  import_uid?: string;
  imported_at?: string;
  updated_at?: string;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

export interface AISuggestion {
  contact_id: string;
  suggestions: {
    ai_summary?: string;
    relationship?: string;
    circle?: string;
    tags?: string[];
    error?: string;
  };
}

export async function fetchContacts(q?: string, circle?: string): Promise<Contact[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (circle) params.set("circle", circle);
  params.set("limit", "500");
  const res = await fetch(`${API_BASE}/contacts?${params}`);
  return res.json();
}

export async function fetchContact(id: string): Promise<Contact> {
  const res = await fetch(`${API_BASE}/contacts/${id}`);
  return res.json();
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
  const res = await fetch(`${API_BASE}/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteContact(id: string): Promise<void> {
  await fetch(`${API_BASE}/contacts/${id}`, { method: "DELETE" });
}

export async function importVcf(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/import`, { method: "POST", body: form });
  return res.json();
}

export async function exportVcf(): Promise<Blob> {
  const res = await fetch(`${API_BASE}/export`);
  return res.blob();
}

export async function enrichContact(id: string): Promise<AISuggestion> {
  const res = await fetch(`${API_BASE}/ai/enrich/${id}`, { method: "POST" });
  return res.json();
}

export async function confirmSuggestions(id: string, data: {
  ai_summary?: string;
  relationship?: string;
  circle?: string;
  tags?: string[];
}): Promise<void> {
  await fetch(`${API_BASE}/ai/confirm/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getAIEstimate(): Promise<{
  contacts: number;
  estimated_cost_usd: number;
}> {
  const res = await fetch(`${API_BASE}/ai/estimate`);
  return res.json();
}

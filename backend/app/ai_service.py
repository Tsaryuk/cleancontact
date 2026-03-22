"""
AI enrichment via Claude API.
Returns suggestions only — user must confirm before saving.
"""
import os
import json
import anthropic
from typing import Optional

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client

SYSTEM_PROMPT = """Ты помощник для обогащения контактной книги. Анализируй данные о контакте и возвращай предложения в JSON.
Отвечай ТОЛЬКО валидным JSON без объяснений. Формат:
{
  "ai_summary": "краткое описание (1-2 предложения) кто этот человек",
  "relationship": "colleague | friend | client | family | acquaintance | other",
  "circle": "close | middle | distant | unknown",
  "tags": ["тег1", "тег2"]
}
Если данных недостаточно — используй null для полей. Не придумывай факты."""


def enrich_contact(contact_data: dict) -> Optional[dict]:
    """
    Send contact to Claude API for enrichment suggestions.
    Returns dict with suggestions or None on error.
    """
    prompt_parts = []
    if contact_data.get("raw_name"):
        prompt_parts.append(f"Имя: {contact_data['raw_name']}")
    if contact_data.get("organization"):
        prompt_parts.append(f"Организация: {contact_data['organization']}")
    if contact_data.get("title"):
        prompt_parts.append(f"Должность: {contact_data['title']}")
    if contact_data.get("notes"):
        prompt_parts.append(f"Заметки: {contact_data['notes']}")
    if contact_data.get("telegram"):
        prompt_parts.append(f"Telegram: {contact_data['telegram']}")
    if contact_data.get("emails"):
        prompt_parts.append(f"Email: {', '.join(contact_data['emails'])}")

    if not prompt_parts:
        return None

    user_msg = "Проанализируй контакт:\n" + "\n".join(prompt_parts)

    try:
        response = _get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        text = response.content[0].text.strip()
        # Extract JSON even if wrapped in ```json
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


def estimate_enrichment_cost(count: int) -> dict:
    """Estimate API cost for enriching N contacts."""
    avg_input_tokens = 150
    avg_output_tokens = 100
    total_input = count * avg_input_tokens
    total_output = count * avg_output_tokens
    # claude-sonnet-4-6: ~$3/MTok input, ~$15/MTok output (rough estimate)
    cost_usd = (total_input * 3 + total_output * 15) / 1_000_000
    return {
        "contacts": count,
        "estimated_input_tokens": total_input,
        "estimated_output_tokens": total_output,
        "estimated_cost_usd": round(cost_usd, 4),
    }

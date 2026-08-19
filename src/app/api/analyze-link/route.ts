import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ANLASS_ALL } from "@/lib/places";

const MAX_PAGE_CHARS = 15000;

interface AnalyzeResult {
  name: string;
  region: string;
  types: { zelt: boolean; wowa: boolean; haus: boolean };
  strom: "ja" | "nein" | "unklar";
  eco: 1 | 2 | 3;
  anlass: string[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PAGE_CHARS);
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Keine JSON-Antwort gefunden");
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY nicht konfiguriert" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const url: string | undefined = body?.url;
  if (!url) {
    return NextResponse.json({ error: "url fehlt" }, { status: 400 });
  }

  let pageText: string;
  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CampingFinderBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!pageRes.ok) {
      return NextResponse.json({ error: `Seite konnte nicht geladen werden (HTTP ${pageRes.status})` }, { status: 502 });
    }
    const html = await pageRes.text();
    pageText = stripHtml(html);
  } catch {
    return NextResponse.json({ error: "Seite konnte nicht geladen werden" }, { status: 502 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system:
        "Du extrahierst Camping-/Stellplatz-Infos aus Webseiten-Text für eine Campingplatz-Finder-App. " +
        "Antworte AUSSCHLIESSLICH mit einem einzelnen JSON-Objekt, ohne Erklärtext, ohne Markdown-Codeblock. " +
        `Schema: {"name": string, "region": string (Ort/Region, Format "Ort, Bundesland/Land"), ` +
        `"types": {"zelt": boolean, "wowa": boolean, "haus": boolean}, ` +
        `"strom": "ja"|"nein"|"unklar", "eco": 1|2|3 (grobe Einschätzung: 1=konventionell, 2=naturnah, 3=stark ökologisch/zertifiziert), ` +
        `"anlass": string[] (0-3 Werte, NUR aus dieser Liste: ${ANLASS_ALL.join(", ")})}. ` +
        "Wenn Informationen unklar sind, triff eine plausible Einschätzung statt das Feld wegzulassen.",
      messages: [
        {
          role: "user",
          content: `Analysiere folgende Webseite eines Campingplatzes und fülle das Schema aus.\n\nURL: ${url}\n\nSeiteninhalt (Text):\n${pageText}`,
        },
      ],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) {
      return NextResponse.json({ error: "Keine Antwort vom Modell" }, { status: 502 });
    }

    const parsed = extractJson(textBlock.text) as Partial<AnalyzeResult>;

    const result: AnalyzeResult = {
      name: typeof parsed.name === "string" && parsed.name ? parsed.name : "Unbenannter Platz",
      region: typeof parsed.region === "string" ? parsed.region : "",
      types: {
        zelt: !!parsed.types?.zelt,
        wowa: !!parsed.types?.wowa,
        haus: !!parsed.types?.haus,
      },
      strom: parsed.strom === "ja" || parsed.strom === "nein" ? parsed.strom : "unklar",
      eco: parsed.eco === 1 || parsed.eco === 2 || parsed.eco === 3 ? parsed.eco : 1,
      anlass: Array.isArray(parsed.anlass) ? parsed.anlass.filter((a): a is string => ANLASS_ALL.includes(a as (typeof ANLASS_ALL)[number])) : [],
    };

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Claude-API-Fehler: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "Analyse fehlgeschlagen" }, { status: 500 });
  }
}

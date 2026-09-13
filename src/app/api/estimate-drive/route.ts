import { NextRequest, NextResponse } from "next/server";
import { estimateDrive } from "@/lib/drive-estimate";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY nicht konfiguriert" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const name: string | undefined = body?.name;
  const region: string | undefined = body?.region;
  if (!name) {
    return NextResponse.json({ error: "name fehlt" }, { status: 400 });
  }

  const drive = await estimateDrive(apiKey, region ? `${name} ${region}` : name);
  if (!drive) {
    return NextResponse.json(
      { error: "Fahrzeit konnte nicht berechnet werden (Ort nicht gefunden oder keine Route möglich)" },
      { status: 502 }
    );
  }

  return NextResponse.json(drive);
}

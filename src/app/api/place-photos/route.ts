import { NextRequest, NextResponse } from "next/server";

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface PlacePhotoResult {
  photoUrls: string[];
  mapsUrl: string | null;
  source: "places-api" | "unavailable";
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  if (!query) {
    return NextResponse.json({ error: "query fehlt" }, { status: 400 });
  }

  if (!PLACES_API_KEY) {
    const empty: PlacePhotoResult = { photoUrls: [], mapsUrl: null, source: "unavailable" };
    return NextResponse.json(empty);
  }

  try {
    const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id,places.photos,places.googleMapsUri",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "de" }),
    });

    if (!searchRes.ok) {
      return NextResponse.json({ error: "Places-Suche fehlgeschlagen" }, { status: 502 });
    }

    const data = await searchRes.json();
    const place = data.places?.[0];
    if (!place) {
      const empty: PlacePhotoResult = { photoUrls: [], mapsUrl: null, source: "unavailable" };
      return NextResponse.json(empty);
    }

    const photoNames: string[] = (place.photos ?? []).slice(0, 3).map((p: { name: string }) => p.name);
    const photoUrls = photoNames.map(
      (name) =>
        `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${PLACES_API_KEY}`
    );

    const result: PlacePhotoResult = {
      photoUrls,
      mapsUrl: place.googleMapsUri ?? null,
      source: "places-api",
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unerwarteter Fehler" }, { status: 500 });
  }
}

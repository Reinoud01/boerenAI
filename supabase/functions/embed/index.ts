/**
 * Supabase Edge Function: embed
 * Genereert een embedding vector voor een zoekopdracht.
 *
 * Deploy via:
 *   supabase functions deploy embed
 *
 * Of via Supabase dashboard → Edge Functions → New Function → plak deze code
 *
 * Gebruikt hetzelfde model als het indexeer-script (multilingual-e5-small, 384 dims).
 * Volledig gratis — draait in Deno op Supabase's infra.
 */

import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js";

// Model wordt gecached na eerste aanroep
let embeddingPipeline: any = null;

async function getModel() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-small",
      { quantized: true }  // kleinere/snellere versie
    );
  }
  return embeddingPipeline;
}

Deno.serve(async (req: Request) => {
  // CORS voor de React app
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey",
      },
    });
  }

  try {
    const { tekst } = await req.json();

    if (!tekst || typeof tekst !== "string") {
      return new Response(JSON.stringify({ error: "tekst vereist" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // multilingual-e5 verwacht 'query: ' prefix voor zoekopdrachten
    const invoer = `query: ${tekst}`;

    const model = await getModel();
    const output = await model(invoer, {
      pooling: "mean",
      normalize: true,
    });

    const embedding = Array.from(output.data as Float32Array);

    return new Response(JSON.stringify({ embedding }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Embed fout:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

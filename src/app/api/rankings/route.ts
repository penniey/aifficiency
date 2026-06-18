import { loadModels, loadConfig, loadMeta } from "@/lib/data";
import { scoreModels } from "@/lib/efficiency";

export async function GET() {
  const [models, config, meta] = await Promise.all([
    loadModels(),
    loadConfig(),
    loadMeta(),
  ]);
  const scored = scoreModels(models, config);
  return Response.json({ models: scored, config, meta });
}

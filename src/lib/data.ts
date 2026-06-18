import { readFile } from "fs/promises";
import { join } from "path";
import type { Model, AppConfig, Meta } from "./types";

const DATA_DIR = join(process.cwd(), "data");

export async function loadModels(): Promise<Model[]> {
  const raw = await readFile(join(DATA_DIR, "models.json"), "utf-8");
  const json = JSON.parse(raw) as { models: Model[] };
  return json.models;
}

export async function loadConfig(): Promise<AppConfig> {
  const raw = await readFile(join(DATA_DIR, "config.json"), "utf-8");
  return JSON.parse(raw) as AppConfig;
}

export async function loadMeta(): Promise<Meta> {
  try {
    const raw = await readFile(join(DATA_DIR, "meta.json"), "utf-8");
    return JSON.parse(raw) as Meta;
  } catch {
    return { fetchedAt: "", sources: {}, counts: { openRouterModels: 0, ranked: 0, unmatched: [] } };
  }
}

export function getModelBySlug(models: Model[], slug: string): Model | undefined {
  return models.find((m) => m.slug === slug);
}

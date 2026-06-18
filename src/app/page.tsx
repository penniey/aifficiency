import { loadModels, loadConfig, loadMeta } from "@/lib/data";
import { scoreModels } from "@/lib/efficiency";
import { ExploreView } from "@/components/ExploreView";
import { formatFreshness } from "@/components/format";

export default async function HomePage() {
  const [models, config, meta] = await Promise.all([
    loadModels(),
    loadConfig(),
    loadMeta(),
  ]);
  const scored = scoreModels(models, config);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Intelligence vs cost, for coding models
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Plot every model on capability vs price, see the Pareto frontier, and
          find the most intelligence for your budget. Pick a lens, tune the
          workload mix, and explore.
        </p>
        {meta.fetchedAt && (
          <p className="mt-1 text-xs text-neutral-400">
            Data as of {formatFreshness(meta.fetchedAt)} ·{" "}
            {meta.counts.ranked} models from {meta.counts.openRouterModels} on
            OpenRouter
          </p>
        )}
      </div>
      <ExploreView models={scored} config={config} />
    </div>
  );
}

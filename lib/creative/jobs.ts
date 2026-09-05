/** Await each asset's generation and persistence before spending on the next. */
export async function runCreativeJobs<T>(
  jobs: readonly T[],
  signal: AbortSignal,
  run: (job: T, index: number) => Promise<void>,
) {
  for (const [index, job] of jobs.entries()) {
    if (signal.aborted) return;
    await run(job, index);
  }
}

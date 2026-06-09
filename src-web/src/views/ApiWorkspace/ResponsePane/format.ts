/** Byte counts in B / kB / MB. Decimal kB/MB intentionally — easier to read
 *  at-a-glance than KiB/MiB and matches the chrome devtools convention. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Sub-second responses read as "847 ms"; ≥1 s switches to "14.13 s" so long
 *  waits don't read as a wall of digits. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

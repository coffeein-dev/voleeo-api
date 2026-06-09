const resolving = new Set<string>()

export function markResolving(key: string): boolean {
  if (resolving.has(key)) return false
  resolving.add(key)
  return true
}

export function unmarkResolving(key: string): void {
  resolving.delete(key)
}

export function pathFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url)
    return pathname && pathname !== "/" ? pathname : null
  } catch {
    const path = url.split("?")[0].split("#")[0]
    return path.startsWith("/") && path.length > 1 ? path : null
  }
}

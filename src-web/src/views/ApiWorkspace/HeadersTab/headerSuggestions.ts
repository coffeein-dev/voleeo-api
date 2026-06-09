/**
 * Common HTTP request headers and their predefined values.
 *
 * To extend: add entries to COMMON_HEADERS or values to an existing entry.
 * Badges denote the value category shown in the autocomplete dropdown:
 *   mt   = media type        enc  = content encoding
 *   la   = language          cc   = cache control
 *   auth = auth scheme       h    = generic header value
 */

import type { ConstantSuggestion } from "@/components/TemplateInput/autocompleteItems"

export type HeaderValueBadge = "mt" | "enc" | "la" | "cc" | "auth" | "h"

export interface HeaderValueSuggestion {
  value: string
  badge: HeaderValueBadge
  description?: string
}

export interface HeaderSuggestion {
  name: string
  description: string
  values?: HeaderValueSuggestion[]
}

const MEDIA_TYPES: HeaderValueSuggestion[] = [
  { value: "application/json", badge: "mt" },
  { value: "application/xml", badge: "mt" },
  { value: "application/x-www-form-urlencoded", badge: "mt" },
  { value: "multipart/form-data", badge: "mt" },
  { value: "multipart/byteranges", badge: "mt" },
  { value: "application/octet-stream", badge: "mt" },
  { value: "text/plain", badge: "mt" },
  { value: "text/html", badge: "mt" },
  { value: "text/css", badge: "mt" },
  { value: "text/event-stream", badge: "mt" },
  { value: "application/javascript", badge: "mt" },
  { value: "application/pdf", badge: "mt" },
  { value: "application/graphql", badge: "mt" },
  { value: "application/ld+json", badge: "mt" },
  { value: "application/x-ndjson", badge: "mt" },
  { value: "application/vnd.api+json", badge: "mt" },
  { value: "image/png", badge: "mt" },
  { value: "image/jpeg", badge: "mt" },
  { value: "image/gif", badge: "mt" },
  { value: "image/webp", badge: "mt" },
  { value: "image/svg+xml", badge: "mt" },
  { value: "*/*", badge: "mt" },
]

const ENCODINGS: HeaderValueSuggestion[] = [
  { value: "gzip", badge: "enc" },
  { value: "deflate", badge: "enc" },
  { value: "br", badge: "enc" },
  { value: "identity", badge: "enc" },
]

export const COMMON_HEADERS: HeaderSuggestion[] = [
  {
    name: "Accept",
    description: "Media types the client can handle",
    values: MEDIA_TYPES,
  },
  {
    name: "Accept-Encoding",
    description: "Compression encodings the client accepts",
    values: [
      { value: "gzip, deflate, br", badge: "enc" },
      ...ENCODINGS,
      { value: "*", badge: "enc" },
    ],
  },
  {
    name: "Accept-Language",
    description: "Natural languages the client prefers",
    values: [
      { value: "en-US,en;q=0.9", badge: "la" },
      { value: "en-US", badge: "la" },
      { value: "en", badge: "la" },
      { value: "*", badge: "la" },
    ],
  },
  {
    name: "Authorization",
    description: "Credentials to authenticate the request",
    values: [
      { value: "Bearer ", badge: "auth", description: "JWT / OAuth 2.0 token" },
      {
        value: "Basic ",
        badge: "auth",
        description: "Base64-encoded user:pass",
      },
      { value: "Digest ", badge: "auth" },
      { value: "ApiKey ", badge: "auth" },
    ],
  },
  {
    name: "Cache-Control",
    description: "Caching directives for the request/response chain",
    values: [
      { value: "no-cache", badge: "cc" },
      { value: "no-store", badge: "cc" },
      { value: "max-age=0", badge: "cc" },
      { value: "max-age=3600", badge: "cc" },
      { value: "must-revalidate", badge: "cc" },
      { value: "public", badge: "cc" },
      { value: "private", badge: "cc" },
    ],
  },
  {
    name: "Connection",
    description: "Connection management options",
    values: [
      { value: "keep-alive", badge: "h" },
      { value: "close", badge: "h" },
    ],
  },
  {
    name: "Content-Encoding",
    description: "Encoding applied to the request body",
    values: ENCODINGS,
  },
  {
    name: "Content-Type",
    description: "Media type of the request body",
    values: MEDIA_TYPES,
  },
  {
    name: "Cookie",
    description: "Cookies previously set by the server",
  },
  {
    name: "Host",
    description: "Target host and optional port",
  },
  {
    name: "If-Modified-Since",
    description:
      "Conditional request: only respond if modified after this date",
  },
  {
    name: "If-None-Match",
    description: "Conditional request: only respond if ETag differs",
  },
  {
    name: "Origin",
    description: "Origin of the cross-site request",
  },
  {
    name: "Pragma",
    description: "Legacy HTTP/1.0 cache control",
    values: [{ value: "no-cache", badge: "cc" }],
  },
  {
    name: "Referer",
    description: "URL of the page that initiated this request",
  },
  {
    name: "Upgrade-Insecure-Requests",
    description: "Signal to upgrade HTTP to HTTPS",
    values: [{ value: "1", badge: "h" }],
  },
  {
    name: "User-Agent",
    description: "Client software identifier string",
  },
  {
    name: "X-API-Key",
    description: "API key passed as a request header",
  },
  {
    name: "X-Correlation-ID",
    description: "Cross-service request correlation identifier",
  },
  {
    name: "X-CSRF-Token",
    description: "CSRF protection token",
  },
  {
    name: "X-Forwarded-For",
    description: "Client IP address when behind a proxy",
  },
  {
    name: "X-Forwarded-Proto",
    description: "Protocol used by the client when behind a proxy",
    values: [
      { value: "https", badge: "h" },
      { value: "http", badge: "h" },
    ],
  },
  {
    name: "X-Request-ID",
    description: "Unique identifier for this request (tracing)",
  },
]

/** Common header NAMES as key-field autocomplete suggestions. */
export const HEADER_NAME_SUGGESTIONS: ConstantSuggestion[] = COMMON_HEADERS.map(
  (h) => ({ value: h.name, badge: "hd", description: h.description }),
)

/** Return predefined values for a known header name (case-insensitive). */
export function getHeaderValues(name: string): HeaderValueSuggestion[] {
  const found = COMMON_HEADERS.find(
    (h) => h.name.toLowerCase() === name.trim().toLowerCase(),
  )
  return found?.values ?? []
}

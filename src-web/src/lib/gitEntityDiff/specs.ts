// Declarative field specs per entity type. The engine turns these into the
// review detail, the conflict chooser, and the merged result.

import type {
  ApiFolder,
  AuthConfig,
  CookieJar,
  DnsOverride,
  Environment,
  EnvironmentVariable,
  HttpRequest,
  RequestBody,
  RequestParameter,
  StoredCookie,
  Workspace,
  WsConnection,
} from "../../../../packages/types/bindings"
import { blob, type Field, listField, scalar } from "./engine"
import {
  authCompare,
  authEntries,
  authSummary,
  paramEqual,
  paramId,
  paramValue,
} from "./helpers"
import type { EntityType } from "./types"

const BODY_KIND_LABEL: Record<RequestBody["kind"], string> = {
  none: "No body",
  json: "JSON",
  xml: "XML",
  html: "HTML",
  text: "Text",
  form_url_encoded: "Form URL Encoded",
  multipart: "Multipart Form",
  binary: "Binary",
}

function serializeBody(b?: RequestBody | null): string {
  if (!b || b.kind === "none") return ""
  switch (b.kind) {
    case "form_url_encoded":
    case "multipart":
      return (b.fields ?? [])
        .map(
          (f) =>
            `${f.enabled ? "" : "#"}${f.name}=${f.isFile ? `@${f.value}` : f.value}`,
        )
        .join("\n")
    case "binary":
      return `${b.filePath ?? ""} ${b.contentType ?? ""}`.trim()
    default:
      return b.text ?? ""
  }
}
const bodyText = (b?: RequestBody | null) =>
  b && b.kind !== "none" ? `${b.kind}\n${serializeBody(b)}` : ""
// Lead with the body type so the diff doesn't read as anonymous text.
const bodyShow = (b?: RequestBody | null) => {
  if (!b || b.kind === "none") return "(empty)"
  const body = serializeBody(b)
  const label = BODY_KIND_LABEL[b.kind]
  return body ? `${label}\n${body}` : label
}

const NONE_AUTH: AuthConfig = { kind: "none" }

function authBlob<E extends { auth?: AuthConfig }>(): Field<E> {
  return blob<E>(
    "auth",
    "Authentication",
    (e) => authCompare(e.auth ?? NONE_AUTH),
    (e) => authSummary(e.auth ?? NONE_AUTH),
    (from, to) => {
      to.auth = from.auth
    },
    {
      // Review shows each auth part on its own row; conflicts stay atomic.
      entries: (e) =>
        authEntries(e.auth ?? NONE_AUTH).map((x) => ({
          label: x.label,
          value: x.value,
          secret: x.secret,
        })),
    },
  )
}

function varList<E extends { variables?: EnvironmentVariable[] }>(): Field<E> {
  return listField<E, EnvironmentVariable>({
    id: "var",
    group: "Variables",
    get: (e) => e.variables ?? [],
    set: (e, items) => {
      e.variables = items
    },
    idOf: (v) => v.key,
    equal: (a, b) =>
      a.value === b.value &&
      a.encrypted === b.encrypted &&
      a.enabled === b.enabled,
    labelOf: (v) => v.key,
    valueOf: (v) => (v.enabled === false ? `${v.value} (disabled)` : v.value),
    secretOf: (v) => v.encrypted,
  })
}

function headerList<E extends { headers?: RequestParameter[] }>(): Field<E> {
  return listField<E, RequestParameter>({
    id: "header",
    group: "Headers",
    get: (e) => e.headers ?? [],
    set: (e, items) => {
      e.headers = items
    },
    idOf: paramId,
    equal: paramEqual,
    labelOf: (p) => p.name,
    valueOf: paramValue,
  })
}

export const requestSpecs: Field<HttpRequest>[] = [
  scalar(
    "name",
    "General",
    (e) => e.name,
    (e, v) => {
      e.name = v
    },
    { label: "Name" },
  ),
  scalar(
    "method",
    "General",
    (e) => e.method,
    (e, v) => {
      e.method = v
    },
    { label: "Method" },
  ),
  scalar(
    "url",
    "URL",
    (e) => e.url,
    (e, v) => {
      e.url = v
    },
  ),
  listField<HttpRequest, RequestParameter>({
    id: "param",
    group: "Query Parameters",
    canBoth: true,
    get: (e) => e.parameters ?? [],
    set: (e, items) => {
      e.parameters = items
    },
    idOf: paramId,
    equal: paramEqual,
    labelOf: (p) => p.name,
    valueOf: paramValue,
  }),
  headerList<HttpRequest>(),
  blob<HttpRequest>(
    "body",
    "Body",
    (e) => bodyText(e.body),
    (e) => bodyShow(e.body),
    (from, to) => {
      to.body = from.body
    },
  ),
  authBlob<HttpRequest>(),
]

export const connectionSpecs: Field<WsConnection>[] = [
  scalar(
    "name",
    "General",
    (e) => e.name,
    (e, v) => {
      e.name = v
    },
    { label: "Name" },
  ),
  scalar(
    "url",
    "URL",
    (e) => e.url,
    (e, v) => {
      e.url = v
    },
  ),
  listField<WsConnection, RequestParameter>({
    id: "param",
    group: "Query Parameters",
    canBoth: true,
    get: (e) => e.parameters ?? [],
    set: (e, items) => {
      e.parameters = items
    },
    idOf: paramId,
    equal: paramEqual,
    labelOf: (p) => p.name,
    valueOf: paramValue,
  }),
  headerList<WsConnection>(),
  authBlob<WsConnection>(),
]

export const folderSpecs: Field<ApiFolder>[] = [
  scalar(
    "name",
    "General",
    (e) => e.name,
    (e, v) => {
      e.name = v
    },
    { label: "Name" },
  ),
  scalar(
    "color",
    "General",
    (e) => e.color ?? "",
    (e, v) => {
      e.color = v || null
    },
    { label: "Color" },
  ),
  headerList<ApiFolder>(),
  varList<ApiFolder>(),
  authBlob<ApiFolder>(),
]

export const environmentSpecs: Field<Environment>[] = [
  scalar(
    "name",
    "General",
    (e) => e.name,
    (e, v) => {
      e.name = v
    },
    { label: "Name" },
  ),
  scalar(
    "color",
    "General",
    (e) => e.color ?? "",
    (e, v) => {
      e.color = v
    },
    { label: "Color" },
  ),
  varList<Environment>(),
]

export const workspaceSpecs: Field<Workspace>[] = [
  scalar(
    "name",
    "General",
    (e) => e.name,
    (e, v) => {
      e.name = v
    },
    { label: "Name" },
  ),
  // `model` / `encrypted` / `syncDir` / `keyCheck` are immutable or local-only
  // and don't represent user-visible workspace edits — intentionally not diffed.
  headerList<Workspace>(),
  authBlob<Workspace>(),
  listField<Workspace, DnsOverride>({
    id: "dns",
    group: "DNS Overrides",
    canBoth: true,
    get: (e) => e.dnsOverrides ?? [],
    set: (e, items) => {
      e.dnsOverrides = items
    },
    idOf: (o) => o.id,
    equal: (a, b) =>
      a.hostname === b.hostname &&
      a.address === b.address &&
      a.enabled === b.enabled,
    labelOf: (o) => o.hostname || "(unnamed)",
    valueOf: (o) => `${o.enabled ? "" : "# "}${o.address}`,
  }),
]

const cookieId = (c: StoredCookie) => `${c.domain}\t${c.path}\t${c.name}`
const cookieEqual = (a: StoredCookie, b: StoredCookie) =>
  a.value === b.value &&
  a.expires === b.expires &&
  a.secure === b.secure &&
  a.httpOnly === b.httpOnly &&
  a.sameSite === b.sameSite &&
  a.hostOnly === b.hostOnly

export const jarSpecs: Field<CookieJar>[] = [
  scalar(
    "name",
    "General",
    (e) => e.name,
    (e, v) => {
      e.name = v
    },
    { label: "Name" },
  ),
  listField<CookieJar, StoredCookie>({
    id: "cookie",
    group: "Value",
    get: (e) => e.cookies ?? [],
    set: (e, items) => {
      e.cookies = items
    },
    idOf: cookieId,
    equal: cookieEqual,
    labelOf: (c) => c.name,
    valueOf: (c) =>
      c.expires ? `${c.value}  ·  expires ${c.expires}` : c.value,
    secretOf: (c) => c.valueEncrypted ?? false,
  }),
]

// biome-ignore lint/suspicious/noExplicitAny: specs are keyed by entity type; the engine re-narrows per call.
export const SPECS_BY_TYPE: Record<EntityType, Field<any>[]> = {
  request: requestSpecs,
  websocket: connectionSpecs,
  folder: folderSpecs,
  environment: environmentSpecs,
  cookie: jarSpecs,
  workspace: workspaceSpecs,
}

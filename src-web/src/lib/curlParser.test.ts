// @ts-expect-error — bun:test lacks TS types in this workspace
import { describe, expect, test } from "bun:test"
import { parseCurlCommand } from "./curlParser"
import { shellTokenize } from "./shellTokenize"

function nonNull<T>(v: T | null): T {
  if (v === null) throw new Error("expected non-null parse result")
  return v
}

describe("shellTokenize", () => {
  test("splits on whitespace", () => {
    expect(shellTokenize("curl foo bar")).toEqual(["curl", "foo", "bar"])
  })

  test("handles single-quoted strings literally", () => {
    expect(shellTokenize("curl 'hello world'")).toEqual(["curl", "hello world"])
  })

  test("preserves special chars inside single quotes", () => {
    expect(shellTokenize("curl '$VAR \"x\" \\n'")).toEqual([
      "curl",
      '$VAR "x" \\n',
    ])
  })

  test("decodes '\\'' as a single quote inside single-quoted", () => {
    expect(shellTokenize("curl 'it'\\''s fine'")).toEqual(["curl", "it's fine"])
  })

  test("handles double-quoted strings with escapes", () => {
    expect(shellTokenize('curl "hello \\"world\\""')).toEqual([
      "curl",
      `hello "world"`,
    ])
  })

  test("handles ANSI-C $'...' strings", () => {
    expect(shellTokenize("curl $'line1\\nline2'")).toEqual([
      "curl",
      "line1\nline2",
    ])
  })

  test("collapses backslash-newline continuations", () => {
    expect(shellTokenize("curl -X POST \\\n  'https://x.com'")).toEqual([
      "curl",
      "-X",
      "POST",
      "https://x.com",
    ])
  })

  test("returns null on unterminated double quote", () => {
    expect(shellTokenize('curl "hello')).toBeNull()
  })
})

describe("parseCurlCommand — basics", () => {
  test("returns null when not a curl command", () => {
    expect(parseCurlCommand("http GET https://x.com")).toBeNull()
    expect(parseCurlCommand("wget https://x.com")).toBeNull()
  })

  test("returns null without a URL", () => {
    expect(parseCurlCommand("curl -X POST")).toBeNull()
  })

  test("minimal GET", () => {
    const r = nonNull(parseCurlCommand("curl https://api.example.com/users"))
    expect(r.method).toBe("GET")
    expect(r.url).toBe("https://api.example.com/users")
    expect(r.headers).toEqual([])
    expect(r.parameters).toEqual([])
    expect(r.body).toBeNull()
    expect(r.auth).toEqual({ kind: "none" })
  })

  test("explicit -X method", () => {
    const r = nonNull(parseCurlCommand("curl -X POST 'https://x.com'"))
    expect(r.method).toBe("POST")
  })

  test("uppercases method", () => {
    const r = nonNull(parseCurlCommand("curl -X delete 'https://x.com'"))
    expect(r.method).toBe("DELETE")
  })

  test("default method is POST when body present", () => {
    const r = nonNull(parseCurlCommand("curl 'https://x.com' --data-raw '{}'"))
    expect(r.method).toBe("POST")
  })

  test("multi-line with backslash continuations", () => {
    const r = nonNull(
      parseCurlCommand(
        `curl -X POST 'https://api.example.com/u' \\\n  -H 'X-A: 1' \\\n  --data-raw '{"a":1}'`,
      ),
    )
    expect(r.method).toBe("POST")
    expect(r.url).toBe("https://api.example.com/u")
    expect(r.headers).toHaveLength(1)
  })

  test("accepts --url alternative", () => {
    const r = nonNull(parseCurlCommand("curl --url 'https://x.com'"))
    expect(r.url).toBe("https://x.com")
  })
})

describe("parseCurlCommand — query params", () => {
  test("splits URL query string into parameters", () => {
    const r = nonNull(
      parseCurlCommand("curl 'https://x.com/u?a=1&b=hello%20world'"),
    )
    expect(r.url).toBe("https://x.com/u")
    expect(r.parameters).toEqual([
      expect.objectContaining({ name: "a", value: "1", enabled: true }),
      expect.objectContaining({
        name: "b",
        value: "hello world",
        enabled: true,
      }),
    ])
  })

  test("handles bare keys with no value", () => {
    const r = nonNull(parseCurlCommand("curl 'https://x.com?flag&other=1'"))
    expect(r.parameters[0]).toMatchObject({ name: "flag", value: "" })
    expect(r.parameters[1]).toMatchObject({ name: "other", value: "1" })
  })
})

describe("parseCurlCommand — headers", () => {
  test("parses -H lines", () => {
    const r = nonNull(
      parseCurlCommand(
        "curl 'https://x.com' -H 'X-Trace: abc' -H 'Accept: application/json'",
      ),
    )
    expect(r.headers).toEqual([
      expect.objectContaining({
        name: "X-Trace",
        value: "abc",
        enabled: true,
      }),
      expect.objectContaining({
        name: "Accept",
        value: "application/json",
      }),
    ])
  })

  test("handles --header long form", () => {
    const r = nonNull(
      parseCurlCommand("curl 'https://x.com' --header 'X-A: 1'"),
    )
    expect(r.headers[0]).toMatchObject({ name: "X-A", value: "1" })
  })

  test("malformed header (no colon) is dropped", () => {
    const r = nonNull(parseCurlCommand("curl 'https://x.com' -H 'malformed'"))
    expect(r.headers).toEqual([])
  })
})

describe("parseCurlCommand — body", () => {
  test("--data-raw body becomes request body (json kind by sniff)", () => {
    const r = nonNull(
      parseCurlCommand("curl 'https://x.com' --data-raw '{\"a\":1}'"),
    )
    expect(r.body).toEqual({ kind: "json", text: '{"a":1}' })
  })

  test("Content-Type header drives body kind", () => {
    const r = nonNull(
      parseCurlCommand(
        "curl 'https://x.com' -H 'Content-Type: application/xml' --data-raw '<x/>'",
      ),
    )
    expect(r.body?.kind).toBe("xml")
  })

  test("plain text body without JSON markers", () => {
    const r = nonNull(parseCurlCommand("curl 'https://x.com' --data 'hello'"))
    expect(r.body).toEqual({ kind: "text", text: "hello" })
  })

  test("multiple -d args concatenate with &", () => {
    const r = nonNull(
      parseCurlCommand("curl 'https://x.com' -d 'a=1' -d 'b=2'"),
    )
    expect(r.body?.text).toBe("a=1&b=2")
  })

  test("--data-urlencode encodes the value portion", () => {
    const r = nonNull(
      parseCurlCommand(
        "curl 'https://x.com' --data-urlencode 'name=hello world'",
      ),
    )
    expect(r.body?.text).toBe("name=hello%20world")
  })
})

describe("parseCurlCommand — auth", () => {
  test("bearer Authorization header becomes auth + removes header", () => {
    const r = nonNull(
      parseCurlCommand(
        "curl 'https://x.com' -H 'Authorization: Bearer abc123'",
      ),
    )
    expect(r.auth).toEqual({ kind: "bearer", token: "abc123" })
    expect(r.headers).toEqual([])
  })

  test("Basic <base64> Authorization decodes to basic auth", () => {
    // base64("alex:secret") === "YWxleDpzZWNyZXQ="
    const r = nonNull(
      parseCurlCommand(
        "curl 'https://x.com' -H 'Authorization: Basic YWxleDpzZWNyZXQ='",
      ),
    )
    expect(r.auth).toEqual({
      kind: "basic",
      username: "alex",
      password: "secret",
    })
    expect(r.headers).toEqual([])
  })

  test("-u user:pass becomes basic auth", () => {
    const r = nonNull(parseCurlCommand("curl 'https://x.com' -u 'alex:secret'"))
    expect(r.auth).toEqual({
      kind: "basic",
      username: "alex",
      password: "secret",
    })
  })

  test("-u beats Authorization header", () => {
    const r = nonNull(
      parseCurlCommand(
        "curl 'https://x.com' -u 'a:b' -H 'Authorization: Bearer abc'",
      ),
    )
    expect(r.auth.kind).toBe("basic")
    // Bearer header is preserved as a regular header since -u took precedence
    expect(r.headers.some((h) => h.name === "Authorization")).toBe(true)
  })

  test("unknown auth scheme leaves header in place", () => {
    const r = nonNull(
      parseCurlCommand(
        "curl 'https://x.com' -H 'Authorization: Digest realm=x'",
      ),
    )
    expect(r.auth.kind).toBe("none")
    expect(r.headers).toHaveLength(1)
  })
})

describe("parseCurlCommand — ignored flags", () => {
  test("skips value-flags like --user-agent", () => {
    const r = nonNull(
      parseCurlCommand("curl --user-agent 'CustomAgent' 'https://x.com'"),
    )
    expect(r.url).toBe("https://x.com")
  })

  test("skips boolean flags like -L", () => {
    const r = nonNull(parseCurlCommand("curl -L -k 'https://x.com'"))
    expect(r.url).toBe("https://x.com")
  })
})

describe("parseCurlCommand — roundtrip with serializeAsCurl-style input", () => {
  test("parses a realistic multi-line POST with all features", () => {
    const cmd = `curl -X POST 'https://api.example.com/v1/users?team=eng' \\
  -H 'Authorization: Bearer tok_abc' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Request-Id: r-42' \\
  --data-raw '{"name":"alex","age":30}'`
    const r = nonNull(parseCurlCommand(cmd))
    expect(r.method).toBe("POST")
    expect(r.url).toBe("https://api.example.com/v1/users")
    expect(r.parameters).toEqual([
      expect.objectContaining({ name: "team", value: "eng" }),
    ])
    expect(r.auth).toEqual({ kind: "bearer", token: "tok_abc" })
    expect(r.headers.map((h) => h.name)).toEqual([
      "Content-Type",
      "X-Request-Id",
    ])
    expect(r.body).toEqual({
      kind: "json",
      text: '{"name":"alex","age":30}',
    })
  })
})

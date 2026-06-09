// @ts-expect-error — bun:test lacks TS types in this workspace
import { describe, expect, test } from "bun:test"
import { parseHttpieCommand } from "./httpieParser"

function nonNull<T>(v: T | null): T {
  if (v === null) throw new Error("expected non-null parse result")
  return v
}

describe("parseHttpieCommand — basics", () => {
  test("returns null for non-http command", () => {
    expect(parseHttpieCommand("curl https://x.com")).toBeNull()
    expect(parseHttpieCommand("wget https://x.com")).toBeNull()
  })

  test("returns null without a URL", () => {
    expect(parseHttpieCommand("http GET")).toBeNull()
  })

  test("minimal GET (method explicit)", () => {
    const r = nonNull(parseHttpieCommand("http GET https://api.example.com"))
    expect(r.method).toBe("GET")
    expect(r.url).toBe("https://api.example.com")
  })

  test("defaults to GET when no method given", () => {
    const r = nonNull(parseHttpieCommand("http https://x.com"))
    expect(r.method).toBe("GET")
  })

  test("defaults to POST when body fields present", () => {
    const r = nonNull(parseHttpieCommand("http https://x.com 'name=alex'"))
    expect(r.method).toBe("POST")
  })

  test("https command alias", () => {
    const r = nonNull(parseHttpieCommand("https example.com"))
    expect(r.url).toBe("example.com")
  })

  test("uppercases method", () => {
    const r = nonNull(parseHttpieCommand("http delete https://x.com"))
    expect(r.method).toBe("DELETE")
  })
})

describe("parseHttpieCommand — headers", () => {
  test("Name:value token is parsed as header", () => {
    const r = nonNull(
      parseHttpieCommand(
        "http GET https://x.com 'X-Trace:abc' 'Accept:application/json'",
      ),
    )
    expect(r.headers).toEqual([
      expect.objectContaining({ name: "X-Trace", value: "abc" }),
      expect.objectContaining({
        name: "Accept",
        value: "application/json",
      }),
    ])
  })

  test("header values with internal colons", () => {
    const r = nonNull(
      parseHttpieCommand("http GET https://x.com 'X-Time:12:34:56'"),
    )
    expect(r.headers[0]).toMatchObject({ name: "X-Time", value: "12:34:56" })
  })
})

describe("parseHttpieCommand — query params", () => {
  test("name==value tokens become query params", () => {
    const r = nonNull(
      parseHttpieCommand("http GET https://x.com 'active==true' 'sort==asc'"),
    )
    expect(r.parameters).toEqual([
      expect.objectContaining({ name: "active", value: "true" }),
      expect.objectContaining({ name: "sort", value: "asc" }),
    ])
  })
})

describe("parseHttpieCommand — JSON body fields", () => {
  test("field=value tokens build a JSON body with string values", () => {
    const r = nonNull(parseHttpieCommand("http POST https://x.com 'name=alex'"))
    expect(r.body).toEqual({ kind: "json", text: '{"name":"alex"}' })
  })

  test("field:=value tokens build a JSON body with raw values", () => {
    const r = nonNull(
      parseHttpieCommand(
        "http POST https://x.com 'count:=42' 'flag:=true' 'x:=null'",
      ),
    )
    const parsed = JSON.parse(nonNull(r.body).text ?? "")
    expect(parsed).toEqual({ count: 42, flag: true, x: null })
  })

  test("mixed string + raw fields", () => {
    const r = nonNull(
      parseHttpieCommand("http POST https://x.com 'name=alex' 'count:=42'"),
    )
    expect(JSON.parse(nonNull(r.body).text ?? "")).toEqual({
      name: "alex",
      count: 42,
    })
  })

  test("invalid raw JSON falls back to string field", () => {
    const r = nonNull(
      parseHttpieCommand("http POST https://x.com 'x:=not_json'"),
    )
    expect(JSON.parse(nonNull(r.body).text ?? "")).toEqual({ x: "not_json" })
  })

  test("--form switches body kind to text (urlencoded)", () => {
    const r = nonNull(
      parseHttpieCommand("http POST https://x.com --form 'a=1' 'b=2'"),
    )
    expect(r.body).toEqual({ kind: "text", text: "a=1&b=2" })
  })
})

describe("parseHttpieCommand — raw body", () => {
  test("--raw sets the body verbatim", () => {
    const r = nonNull(
      parseHttpieCommand("http POST https://x.com --raw '{\"x\":1}'"),
    )
    expect(r.body).toEqual({ kind: "json", text: '{"x":1}' })
  })

  test("--raw with --json forces json kind even for non-JSON text", () => {
    const r = nonNull(
      parseHttpieCommand("http POST https://x.com --json --raw 'not json'"),
    )
    expect(r.body).toEqual({ kind: "json", text: "not json" })
  })

  test("--raw with xml body sniffs as xml", () => {
    const r = nonNull(
      parseHttpieCommand("http POST https://x.com --raw '<x/>'"),
    )
    expect(r.body?.kind).toBe("xml")
  })
})

describe("parseHttpieCommand — auth", () => {
  test("-a 'user:pass' → basic auth", () => {
    const r = nonNull(
      parseHttpieCommand("http GET https://x.com -a 'alex:secret'"),
    )
    expect(r.auth).toEqual({
      kind: "basic",
      username: "alex",
      password: "secret",
    })
  })

  test("--auth long form works", () => {
    const r = nonNull(parseHttpieCommand("http GET https://x.com --auth 'u:p'"))
    expect(r.auth.kind).toBe("basic")
  })

  test("Authorization:Bearer header becomes bearer auth, removed from headers", () => {
    const r = nonNull(
      parseHttpieCommand(
        "http GET https://x.com 'Authorization:Bearer tok_abc'",
      ),
    )
    expect(r.auth).toEqual({ kind: "bearer", token: "tok_abc" })
    expect(r.headers).toEqual([])
  })

  test("Non-bearer Authorization header stays as a header", () => {
    const r = nonNull(
      parseHttpieCommand(
        "http GET https://x.com 'Authorization:Digest realm=x'",
      ),
    )
    expect(r.auth.kind).toBe("none")
    expect(r.headers).toHaveLength(1)
  })
})

describe("parseHttpieCommand — multi-line", () => {
  test("multi-line command with continuations parses correctly", () => {
    const cmd = `http POST 'https://api.example.com/v1/users' \\
  -a 'u:p' \\
  'active==true' \\
  'X-Trace:abc' \\
  'name=alex' \\
  'count:=42'`
    const r = nonNull(parseHttpieCommand(cmd))
    expect(r.method).toBe("POST")
    expect(r.url).toBe("https://api.example.com/v1/users")
    expect(r.auth.kind).toBe("basic")
    expect(r.parameters).toEqual([
      expect.objectContaining({ name: "active", value: "true" }),
    ])
    expect(r.headers).toEqual([
      expect.objectContaining({ name: "X-Trace", value: "abc" }),
    ])
    expect(JSON.parse(nonNull(r.body).text ?? "")).toEqual({
      name: "alex",
      count: 42,
    })
  })
})

describe("parseHttpieCommand — URL detection", () => {
  test("recognises https:// URLs without explicit method", () => {
    const r = nonNull(parseHttpieCommand("http https://api.example.com/foo"))
    expect(r.url).toBe("https://api.example.com/foo")
  })

  test("treats unknown method-position token as URL fallback", () => {
    // No HTTP-verb match and no http://; the parser falls back to using it
    // as the URL since it has no other URL candidate.
    const r = nonNull(parseHttpieCommand("http example.com"))
    expect(r.url).toBe("example.com")
  })
})

import { v1, v3, v4, v5, v6, v7 } from "uuid"
import type { TemplateFunctionContribution, VoleeoPlugin } from "@voleeo/plugin-api"

// RFC 4122 §4.3 defines four well-known namespace UUIDs.
// v3 and v5 are "name-based": they hash a (namespace, name) pair to produce
// a deterministic UUID, so the same input always yields the same output.
// The namespace scopes the name — "example.com" in the DNS namespace produces
// a different UUID than "example.com" in the URL namespace.
const NAMESPACE_OPTIONS = [
  { label: "DNS",  value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8" }, // for domain names
  { label: "URL",  value: "6ba7b811-9dad-11d1-80b4-00c04fd430c8" }, // for URLs
  { label: "OID",  value: "6ba7b812-9dad-11d1-80b4-00c04fd430c8" }, // for ISO OIDs
  { label: "X500", value: "6ba7b814-9dad-11d1-80b4-00c04fd430c8" }, // for X.500 DNs
]

const DNS_NAMESPACE = NAMESPACE_OPTIONS[0].value

const templateFunctions: TemplateFunctionContribution[] = [
  {
    name: "uuid.v4",
    label: "UUID v4 (random)",
    description: "Generates a random UUID",
    onRender: () => v4(),
  },
  {
    name: "uuid.v7",
    label: "UUID v7 (time-ordered)",
    description: "Generates a time-ordered UUID — ideal for database primary keys",
    onRender: () => v7(),
  },
  {
    name: "uuid.v1",
    label: "UUID v1 (timestamp)",
    description: "Generates a time-based UUID using the current timestamp",
    onRender: () => v1(),
  },
  {
    name: "uuid.v6",
    label: "UUID v6 (reordered timestamp)",
    description: "Like v1 but with timestamp bits reordered for better sort order",
    onRender: () => v6(),
  },
  {
    name: "uuid.v3",
    label: "UUID v3 (name-based, MD5)",
    description: "Deterministic UUID derived from a name + namespace via MD5",
    args: [
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "namespace",
        label: "Namespace",
        type: "select",
        options: NAMESPACE_OPTIONS,
        defaultValue: DNS_NAMESPACE,
      },
    ],
    onRender: (_ctx, args) => v3(args.name ?? "", args.namespace ?? DNS_NAMESPACE),
  },
  {
    name: "uuid.v5",
    label: "UUID v5 (name-based, SHA-1)",
    description: "Deterministic UUID derived from a name + namespace via SHA-1 (preferred over v3)",
    args: [
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "namespace",
        label: "Namespace",
        type: "select",
        options: NAMESPACE_OPTIONS,
        defaultValue: DNS_NAMESPACE,
      },
    ],
    onRender: (_ctx, args) => v5(args.name ?? "", args.namespace ?? DNS_NAMESPACE),
  },
]

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/uuid",
    name: "UUID Generator",
    version: "1.0.0",
    author: "Voleeo",
  },
  templateFunctions,
}

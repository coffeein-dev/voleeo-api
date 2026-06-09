import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import type { TemplateFunctionContribution, VoleeoPlugin } from "@voleeo/plugin-api"

dayjs.extend(utc)

const UNIT_MS: Record<string, number> = {
  seconds: 1_000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
}

const templateFunctions: TemplateFunctionContribution[] = [
  {
    name: "timestamp.iso",
    label: "ISO 8601 (UTC)",
    description: "Current time as ISO 8601 in UTC, e.g. 2026-05-26T14:23:45.123Z",
    onRender: () => new Date().toISOString(),
  },
  {
    name: "timestamp.unix",
    label: "Unix epoch (seconds)",
    description: "Current time as integer seconds since the Unix epoch",
    onRender: () => String(Math.floor(Date.now() / 1000)),
  },
  {
    name: "timestamp.unixMs",
    label: "Unix epoch (milliseconds)",
    description: "Current time as integer milliseconds since the Unix epoch",
    onRender: () => String(Date.now()),
  },
  {
    name: "timestamp.date",
    label: "Date (UTC)",
    description: "Current date in UTC as YYYY-MM-DD",
    onRender: () => dayjs.utc().format("YYYY-MM-DD"),
  },
  {
    name: "timestamp.time",
    label: "Time (UTC)",
    description: "Current time in UTC as HH:mm:ss",
    onRender: () => dayjs.utc().format("HH:mm:ss"),
  },
  {
    name: "timestamp.format",
    label: "Custom format (UTC)",
    description: "Format the current UTC time using Day.js tokens (e.g. YYYY-MM-DD HH:mm:ss).",
    args: [
      {
        name: "layout",
        label: "Layout",
        type: "text",
        required: true,
        placeholder: "YYYY-MM-DD HH:mm:ss",
      },
    ],
    onRender: (_ctx, args) =>
      dayjs.utc().format(args.layout || "YYYY-MM-DDTHH:mm:ss[Z]"),
  },
  {
    name: "timestamp.offset",
    label: "Now ± offset",
    description:
      "Current time shifted by amount/unit. Negative amounts go into the past. Output as ISO, unix seconds, or unix milliseconds.",
    args: [
      {
        name: "amount",
        label: "Amount",
        type: "number",
        required: true,
        defaultValue: "0",
        row: "delta",
      },
      {
        name: "unit",
        label: "Unit",
        type: "select",
        defaultValue: "seconds",
        options: [
          { label: "seconds", value: "seconds" },
          { label: "minutes", value: "minutes" },
          { label: "hours", value: "hours" },
          { label: "days", value: "days" },
        ],
        row: "delta",
      },
      {
        name: "as",
        label: "Output as",
        type: "select",
        defaultValue: "iso",
        options: [
          { label: "ISO 8601", value: "iso" },
          { label: "Unix seconds", value: "unix" },
          { label: "Unix milliseconds", value: "unixMs" },
        ],
      },
    ],
    onRender: (_ctx, args) => {
      const amount = Number(args.amount ?? "0")
      const unitMs = UNIT_MS[args.unit ?? "seconds"] ?? UNIT_MS.seconds
      const t = Date.now() + amount * unitMs
      if (args.as === "unix") return String(Math.floor(t / 1000))
      if (args.as === "unixMs") return String(t)
      return new Date(t).toISOString()
    },
  },
]

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/timestamp",
    name: "Timestamp",
    version: "1.0.0",
    author: "Voleeo",
  },
  templateFunctions,
}

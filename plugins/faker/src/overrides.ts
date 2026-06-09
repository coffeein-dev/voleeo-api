import type { TemplateFunctionContribution } from "@voleeo/plugin-api"
import {
  lengthArg,
  localeArg,
  phoneStyleArg,
  pickSex,
  sexArg,
  toFloat,
  toInt,
} from "./helpers"
import { getFaker } from "./locales"

// Hand-crafted entries that expose meaningful arguments.
// Auto-registration in index.ts uses the entry from here when the (module, method) name matches.
const list: TemplateFunctionContribution[] = [
  {
    name: "faker.person.firstName",
    label: "First name",
    description: "Random first name",
    args: [sexArg, localeArg],
    onRender: (_, a) => getFaker(a.locale).person.firstName(pickSex(a)),
  },
  {
    name: "faker.person.lastName",
    label: "Last name",
    description: "Random last name",
    args: [sexArg, localeArg],
    onRender: (_, a) => getFaker(a.locale).person.lastName(pickSex(a)),
  },
  {
    name: "faker.person.fullName",
    label: "Full name",
    description: "Random full name",
    args: [sexArg, localeArg],
    onRender: (_, a) => getFaker(a.locale).person.fullName({ sex: pickSex(a) }),
  },
  {
    name: "faker.internet.email",
    label: "Email",
    description: "Random email address",
    args: [
      { name: "firstName", label: "First name", type: "text" },
      { name: "lastName", label: "Last name", type: "text" },
      { name: "provider", label: "Provider", type: "text" },
      localeArg,
    ],
    onRender: (_, a) =>
      getFaker(a.locale).internet.email({
        firstName: a.firstName || undefined,
        lastName: a.lastName || undefined,
        provider: a.provider || undefined,
      }),
  },
  {
    name: "faker.internet.password",
    label: "Password",
    description: "Random password",
    args: [lengthArg("16")],
    onRender: (_, a) =>
      getFaker(undefined).internet.password({ length: toInt(a.length, 16) }),
  },
  {
    name: "faker.phone.number",
    label: "Phone number",
    description: "Random phone number",
    args: [phoneStyleArg, localeArg],
    onRender: (_, a) => {
      const style =
        a.style === "human" || a.style === "national" || a.style === "international"
          ? a.style
          : undefined
      return getFaker(a.locale).phone.number(style ? { style } : undefined)
    },
  },
  {
    name: "faker.commerce.price",
    label: "Price",
    description: "Random price (string)",
    args: [
      { name: "min", label: "Min", type: "text", defaultValue: "1" },
      { name: "max", label: "Max", type: "text", defaultValue: "1000" },
      { name: "dec", label: "Decimals", type: "text", defaultValue: "2" },
    ],
    onRender: (_, a) =>
      getFaker(undefined).commerce.price({
        min: toInt(a.min, 1),
        max: toInt(a.max, 1000),
        dec: toInt(a.dec, 2),
      }),
  },
  {
    name: "faker.finance.accountNumber",
    label: "Account number",
    description: "Random bank account number",
    args: [lengthArg("12")],
    onRender: (_, a) =>
      getFaker(undefined).finance.accountNumber(toInt(a.length, 12)),
  },
  {
    name: "faker.finance.amount",
    label: "Amount",
    description: "Random monetary amount (string)",
    args: [
      { name: "min", label: "Min", type: "text", defaultValue: "0" },
      { name: "max", label: "Max", type: "text", defaultValue: "1000" },
      { name: "dec", label: "Decimals", type: "text", defaultValue: "2" },
    ],
    onRender: (_, a) =>
      getFaker(undefined).finance.amount({
        min: toFloat(a.min, 0),
        max: toFloat(a.max, 1000),
        dec: toInt(a.dec, 2),
      }),
  },
  {
    name: "faker.lorem.sentence",
    label: "Lorem sentence",
    description: "Random sentence",
    args: [
      { name: "wordCount", label: "Word count", type: "text", defaultValue: "8" },
    ],
    onRender: (_, a) =>
      getFaker(undefined).lorem.sentence(toInt(a.wordCount, 8)),
  },
  {
    name: "faker.lorem.paragraph",
    label: "Lorem paragraph",
    description: "Random paragraph",
    args: [
      {
        name: "sentenceCount",
        label: "Sentence count",
        type: "text",
        defaultValue: "3",
      },
    ],
    onRender: (_, a) =>
      getFaker(undefined).lorem.paragraph(toInt(a.sentenceCount, 3)),
  },
  {
    name: "faker.number.int",
    label: "Integer",
    description: "Random integer between min and max (inclusive)",
    args: [
      { name: "min", label: "Min", type: "text", defaultValue: "0" },
      { name: "max", label: "Max", type: "text", defaultValue: "1000" },
    ],
    onRender: (_, a) =>
      String(
        getFaker(undefined).number.int({
          min: toInt(a.min, 0),
          max: toInt(a.max, 1000),
        }),
      ),
  },
  {
    name: "faker.number.float",
    label: "Float",
    description: "Random float between min and max",
    args: [
      { name: "min", label: "Min", type: "text", defaultValue: "0" },
      { name: "max", label: "Max", type: "text", defaultValue: "1" },
      {
        name: "fractionDigits",
        label: "Fraction digits",
        type: "text",
        defaultValue: "4",
      },
    ],
    onRender: (_, a) =>
      String(
        getFaker(undefined).number.float({
          min: toFloat(a.min, 0),
          max: toFloat(a.max, 1),
          fractionDigits: toInt(a.fractionDigits, 4),
        }),
      ),
  },
  {
    name: "faker.string.alphanumeric",
    label: "Alphanumeric string",
    description: "Random alphanumeric string",
    args: [lengthArg("10")],
    onRender: (_, a) =>
      getFaker(undefined).string.alphanumeric(toInt(a.length, 10)),
  },
  {
    name: "faker.string.hexadecimal",
    label: "Hex string",
    description: "Random hexadecimal string",
    args: [lengthArg("16")],
    onRender: (_, a) =>
      getFaker(undefined).string.hexadecimal({
        length: toInt(a.length, 16),
        prefix: "",
      }),
  },
  {
    name: "faker.string.numeric",
    label: "Numeric string",
    description: "Random numeric string",
    args: [lengthArg("6")],
    onRender: (_, a) =>
      getFaker(undefined).string.numeric(toInt(a.length, 6)),
  },
  {
    name: "faker.date.past",
    label: "Past date (ISO)",
    description: "Random date in the past — ISO 8601",
    args: [
      { name: "years", label: "Years back", type: "text", defaultValue: "1" },
    ],
    onRender: (_, a) =>
      getFaker(undefined).date.past({ years: toInt(a.years, 1) }).toISOString(),
  },
  {
    name: "faker.date.future",
    label: "Future date (ISO)",
    description: "Random date in the future — ISO 8601",
    args: [
      { name: "years", label: "Years ahead", type: "text", defaultValue: "1" },
    ],
    onRender: (_, a) =>
      getFaker(undefined)
        .date.future({ years: toInt(a.years, 1) })
        .toISOString(),
  },
  {
    name: "faker.date.recent",
    label: "Recent date (ISO)",
    description: "Random date within the last N days",
    args: [
      { name: "days", label: "Days back", type: "text", defaultValue: "1" },
    ],
    onRender: (_, a) =>
      getFaker(undefined).date.recent({ days: toInt(a.days, 1) }).toISOString(),
  },
  {
    name: "faker.date.soon",
    label: "Soon date (ISO)",
    description: "Random date within the next N days",
    args: [
      { name: "days", label: "Days ahead", type: "text", defaultValue: "1" },
    ],
    onRender: (_, a) =>
      getFaker(undefined).date.soon({ days: toInt(a.days, 1) }).toISOString(),
  },
]

export const OVERRIDES: Map<string, TemplateFunctionContribution> = new Map(
  list.map((entry) => [entry.name, entry]),
)

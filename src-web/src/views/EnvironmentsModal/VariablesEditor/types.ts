import type { EnvironmentVariable } from "@/store/environment"

let _rowIdCounter = 0
export function nextRowId() {
  return ++_rowIdCounter
}

export type Row = EnvironmentVariable & { _rowId: number }

export function emptyRow(): Row {
  return {
    key: "",
    value: "",
    encrypted: false,
    enabled: true,
    _rowId: nextRowId(),
  }
}

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useGitStore } from "@/store/git"
import { closeIfNothingLeft, publish } from "@/store/gitReview"
import { RV } from "../reviewClasses"

export function PublishBox({
  count,
  selectedPaths,
}: {
  count: number
  selectedPaths: string[]
}) {
  const hasAuthor = useGitStore((s) => s.repo?.hasAuthor ?? true)
  const op = useGitStore((s) => s.op)
  const [msg, setMsg] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  if (count === 0) return null
  const busy = op === "publish"
  const n = selectedPaths.length
  const identityReady = hasAuthor || (name.trim() !== "" && email.trim() !== "")
  const ready = msg.trim() !== "" && n > 0 && identityReady

  async function onPublish() {
    if (!ready || busy) return
    await publish(
      msg.trim(),
      selectedPaths,
      hasAuthor ? undefined : { name: name.trim(), email: email.trim() },
    )
    setMsg("")
    await closeIfNothingLeft()
  }

  return (
    <div className={RV.commit}>
      <div className={RV.commitH}>
        {count} unsaved change{count === 1 ? "" : "s"}
      </div>
      <textarea
        className={RV.msg}
        placeholder="Describe what you changed…"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {!hasAuthor && (
        <div className={RV.author}>
          <input
            className={RV.in}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={RV.in}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      )}
      <Button
        variant="outline"
        className="w-full cursor-pointer border-border text-fg bg-transparent hover:bg-subtle hover:text-fg"
        disabled={!ready || busy}
        onClick={onPublish}
      >
        {busy ? "Committing…" : "Commit changes"}
      </Button>
    </div>
  )
}

export function PanelHeading({
  title,
  description,
}: {
  title: string
  description: React.ReactNode
}) {
  return (
    <div>
      <span className="font-sans text-[1rem] font-semibold text-fg">
        {title}
      </span>
      <p
        className="font-sans text-[0.857rem] mt-[3px]"
        style={{ color: "var(--base04)" }}
      >
        {description}
      </p>
    </div>
  )
}

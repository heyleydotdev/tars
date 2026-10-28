export function FormHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

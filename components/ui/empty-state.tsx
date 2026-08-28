export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-md border border-dashed border-border p-8">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}

// Shown while a page is waiting for data.
export default function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="card flex items-center justify-center gap-3 py-12 text-sm text-nu-muted" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-nu-line border-t-nu-royal" />
      {label}
    </div>
  );
}

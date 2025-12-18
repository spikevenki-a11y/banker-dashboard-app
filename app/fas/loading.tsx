export default function FASLoading() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        <div className="h-5 w-64 bg-muted animate-pulse rounded mt-2" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  )
}

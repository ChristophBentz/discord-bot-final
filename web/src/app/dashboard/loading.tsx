export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="animate-pulse">
        <div className="h-3 w-24 rounded bg-bg-elevated" />
        <div className="mt-3 h-8 w-64 rounded-lg bg-bg-elevated" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-bg-elevated" />
      </header>

      {[0, 1].map((i) => (
        <section key={i} className="card animate-pulse p-6">
          <div className="h-5 w-40 rounded bg-bg-elevated" />
          <div className="mt-2 h-4 w-72 max-w-full rounded bg-bg-elevated" />
          <div className="mt-6 space-y-3">
            <div className="h-10 rounded-xl bg-bg-elevated" />
            <div className="h-10 w-2/3 rounded-xl bg-bg-elevated" />
          </div>
        </section>
      ))}
    </div>
  );
}

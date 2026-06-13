// Wird gezeigt, während die Appeal-Seite den Bann-Status beim Bot abfragt
// (callBot kann bis zu 5s dauern) — verhindert einen weißen Screen für
// externe, gebannte User.
export default function AppealLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md animate-pulse space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-bg-elevated" />
        <div className="mx-auto h-6 w-2/3 rounded bg-bg-elevated" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-bg-elevated" />
          <div className="h-3 w-5/6 rounded bg-bg-elevated" />
        </div>
        <div className="h-28 w-full rounded-xl bg-bg-elevated" />
      </div>
    </div>
  );
}

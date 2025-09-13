export default function Home() {
  return (
    <div className="min-h-screen grid place-items-center bg-ctp-base p-8">
      <div className="max-w-xl text-center space-y-4">
  <h1 className="text-3xl font-semibold text-ctp-text">GoalForge</h1>
  <p className="text-ctp-subtext0">Forge your goals into achievements—track journeys and milestones with a soothing Catppuccin Latte look.</p>
        <div className="flex items-center justify-center gap-3">
          <a href="/dashboard" className="px-5 py-2 rounded bg-ctp-blue-600 text-ctp-base">Go to Dashboard</a>
          <a href="/login" className="px-5 py-2 rounded border border-ctp-overlay1/50 bg-ctp-surface1 text-ctp-text">Login</a>
        </div>
      </div>
    </div>
  );
}

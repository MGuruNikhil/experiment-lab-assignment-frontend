import Sidebar from "@/components/Sidebar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh grid grid-cols-[240px_1fr]">
      <aside className="border-r border-ctp-surface0 bg-ctp-mantle/30">
        <Sidebar />
      </aside>
      <main className="p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}

import SidebarNavigation from "@/components/sidebar-navigation";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#e0e5ec] text-[#2d3440] lg:flex-row">
      {/* Sidebar Admin Component */}
      <SidebarNavigation />

      {/* Main Content Wrapper: Otomatis melebar mengisi ruang kosong saat Sidebar disembunyikan */}
      <main className="flex-1 w-full min-w-0 transition-all duration-300 overflow-y-auto bg-[#e0e5ec] p-3 sm:p-4 lg:p-5">
        {children}
      </main>
    </div>
  );
}

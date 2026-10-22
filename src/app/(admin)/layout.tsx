import SidebarNavigation from "@/components/sidebar-navigation";
import { SidebarProvider } from "@/context/sidebar-context";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-[#F9FAFB] text-[#2d3440] lg:flex-row">
        <SidebarNavigation />

        <main className="flex-1 w-full min-w-0 transition-all duration-300 overflow-y-auto bg-[#F9FAFB] p-3 sm:p-4 lg:p-5">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

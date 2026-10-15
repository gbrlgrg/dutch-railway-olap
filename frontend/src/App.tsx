import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import type { PageId } from "@/components/layout/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OlapExplorerPage } from "@/pages/OlapExplorerPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { TimeTrendPage } from "@/pages/TimeTrendPage";

function getPageFromHash(): PageId {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash === "time-trend") return "time-trend";
  if (hash === "olap-explorer") return "olap-explorer";
  return "overview";
}

function App() {
  const [activePage, setActivePage] = useState<PageId>(getPageFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setActivePage(getPageFromHash());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
    window.location.hash = page === "overview" ? "" : page;
  };

  return (
    <TooltipProvider delay={150}>
      <div className="flex min-h-screen bg-background">
        <AppSidebar activePage={activePage} onNavigate={handleNavigate} />
        {activePage === "time-trend" && <TimeTrendPage onNavigate={handleNavigate} />}
        {activePage === "olap-explorer" && <OlapExplorerPage onNavigate={handleNavigate} />}
        {activePage === "overview" && <OverviewPage onNavigate={handleNavigate} />}
      </div>
    </TooltipProvider>
  );
}

export default App;

import { AppSidebar } from "@/components/layout/AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OverviewPage } from "@/pages/OverviewPage";

function App() {
  return (
    <TooltipProvider delay={150}>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <OverviewPage />
      </div>
    </TooltipProvider>
  );
}

export default App;

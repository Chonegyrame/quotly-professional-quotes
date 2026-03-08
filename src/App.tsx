import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import QuoteBuilder from "./pages/QuoteBuilder";
import QuoteDetail from "./pages/QuoteDetail";
import CustomerView from "./pages/CustomerView";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isCustomerView = location.pathname.startsWith('/q/');

  if (isCustomerView) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/quotes/new" element={<QuoteBuilder />} />
            <Route path="/quotes/:id" element={<QuoteDetail />} />
            <Route path="/q/:id" element={<CustomerView />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

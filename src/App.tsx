import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { Navbar } from "./components/Navbar";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useCompany } from "./hooks/useCompany";
import Dashboard from "./pages/Dashboard";
import QuoteBuilder from "./pages/QuoteBuilder";
import QuoteDetail from "./pages/QuoteDetail";
import CustomerView from "./pages/CustomerView";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import MaterialAnalytics from "./pages/MaterialAnalytics";
import Templates from "./pages/Templates";
import TemplateBuilder from "./pages/TemplateBuilder";
import Materials from "./pages/Materials";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CompanySetup from "./pages/CompanySetup";
import AcceptInvite from "./pages/AcceptInvite";
import LandingPage from "./pages/LandingPage";
import TradePage from "./pages/TradePage";
import OvrigtPage from "./pages/OvrigtPage";
import ByggPage from "./pages/ByggPage";
import PricingPage from "./pages/PricingPage";
import AnvandarvillkorPage from "./pages/AnvandarvillkorPage";
import FragorOchSvarPage from "./pages/FragorOchSvarPage";
import KontaktPage from "./pages/KontaktPage";
import FortnoxCallback from "./pages/FortnoxCallback";
import VvsPage from "./pages/VvsPage";
import ElPage from "./pages/ElPage";
import IncomingRequestForm from "./pages/IncomingRequestForm";
import Inbox from "./pages/Inbox";
import IncomingRequestDetail from "./pages/IncomingRequestDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { company, isLoading: companyLoading } = useCompany();
  const location = useLocation();

  if (loading || companyLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!user) return <Navigate to="/auth" replace />;

  // If no company and not on setup page, redirect to setup
  if (!company && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!user) return <LandingPage />;

  return <ProtectedRoute><Dashboard /></ProtectedRoute>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const tradeRoutes = ['/bygg', '/vvs', '/el', '/ovrigt'];
  const isPublicRoute = (location.pathname === '/' && !user) || location.pathname.startsWith('/q/') || location.pathname.startsWith('/auth') || location.pathname.startsWith('/invite/') || location.pathname.startsWith('/offert/') || location.pathname === '/pris' || location.pathname === '/anvandarvillkor' || location.pathname === '/fragor-och-svar' || location.pathname === '/kontakt' || tradeRoutes.includes(location.pathname);

  if (isPublicRoute) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AppLayout>
      <LayoutGroup>
      <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/fortnox/callback" element={<ProtectedRoute><FortnoxCallback /></ProtectedRoute>} />
        <Route path="/q/:id" element={<CustomerView />} />
        <Route path="/offert/:firmSlug" element={<IncomingRequestForm />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/setup" element={<ProtectedRoute><CompanySetup /></ProtectedRoute>} />
        <Route path="/" element={<HomeRoute />} />
        <Route path="/bygg" element={<ByggPage />} />
        <Route path="/vvs" element={<VvsPage />} />
        <Route path="/el" element={<ElPage />} />
        <Route path="/ovrigt" element={<OvrigtPage />} />
        <Route path="/pris" element={<PricingPage />} />
        <Route path="/anvandarvillkor" element={<AnvandarvillkorPage />} />
        <Route path="/fragor-och-svar" element={<FragorOchSvarPage />} />
        <Route path="/kontakt" element={<KontaktPage />} />
        <Route path="/quotes/new" element={<ProtectedRoute><QuoteBuilder /></ProtectedRoute>} />
        <Route path="/quotes/:id" element={<ProtectedRoute><QuoteDetail /></ProtectedRoute>} />
        <Route path="/quotes/:id/edit" element={<ProtectedRoute><QuoteBuilder /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/analytics/material" element={<ProtectedRoute><MaterialAnalytics /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
        <Route path="/templates/new" element={<ProtectedRoute><TemplateBuilder /></ProtectedRoute>} />
        <Route path="/templates/from-quote/:quoteId" element={<ProtectedRoute><TemplateBuilder /></ProtectedRoute>} />
        <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        <Route path="/inbox/:id" element={<ProtectedRoute><IncomingRequestDetail /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </AnimatePresence>
      </LayoutGroup>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;



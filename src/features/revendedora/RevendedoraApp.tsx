import { Routes, Route, Navigate } from "react-router-dom";
import { CompanyProvider } from "@/features/revendedora/contexts/CompanyContext";

import Login from "@/features/revendedora/pages/Login";
import NotFound from "@/features/revendedora/pages/NotFound";
import Demo from "@/features/revendedora/pages/Demo";

import { ResellerLayout } from "@/features/revendedora/layouts/ResellerLayout";

import Checkout from "@/features/revendedora/pages/public/Checkout";
import Storefront from "@/features/revendedora/pages/public/Storefront";
import OrderSuccess from "@/features/revendedora/pages/public/OrderSuccess";
import TrackOrder from "@/features/revendedora/pages/public/TrackOrder";
import ProductView from "@/features/revendedora/pages/public/ProductView";

import ResellerDashboard from "@/features/revendedora/pages/reseller/Dashboard";
import ResellerTeam from "@/features/revendedora/pages/reseller/Team";
import ResellerSales from "@/features/revendedora/pages/reseller/Sales";
import ResellerFinancial from "@/features/revendedora/pages/reseller/Financial";
import ResellerStore from "@/features/revendedora/pages/reseller/Store";
import ResellerPaymentPix from "@/features/revendedora/pages/reseller/PaymentPix";
import ResellerPaymentCard from "@/features/revendedora/pages/reseller/PaymentCard";
import ResellerGamification from "@/features/revendedora/pages/reseller/Gamification";

const RevendedoraApp = () => (
  <CompanyProvider>
    <Routes>
      <Route path="" element={<Navigate to="/revendedora/reseller/dashboard" replace />} />
      <Route path="login" element={<Login />} />
      <Route path="demo" element={<Demo />} />
      <Route path="checkout/:linkToken" element={<Checkout />} />
      <Route path="store/:storeSlug" element={<Storefront />} />
      <Route path="order-success/:orderId" element={<OrderSuccess />} />
      <Route path="track-order/:orderId" element={<TrackOrder />} />
      <Route path="produto/:productId" element={<ProductView />} />
      
      <Route path="reseller/dashboard" element={<ResellerLayout><ResellerDashboard /></ResellerLayout>} />
      <Route path="reseller/team" element={<ResellerLayout><ResellerTeam /></ResellerLayout>} />
      <Route path="reseller/sales" element={<ResellerLayout><ResellerSales /></ResellerLayout>} />
      <Route path="reseller/financial" element={<ResellerLayout><ResellerFinancial /></ResellerLayout>} />
      <Route path="reseller/store" element={<ResellerLayout><ResellerStore /></ResellerLayout>} />
      <Route path="reseller/payment/pix/:saleId" element={<ResellerLayout><ResellerPaymentPix /></ResellerLayout>} />
      <Route path="reseller/payment/card/:saleId" element={<ResellerLayout><ResellerPaymentCard /></ResellerLayout>} />
      <Route path="reseller/gamification" element={<ResellerLayout><ResellerGamification /></ResellerLayout>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  </CompanyProvider>
);

export default RevendedoraApp;

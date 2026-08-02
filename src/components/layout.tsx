import { Outlet } from "react-router-dom";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import Header from "./header";
import Footer from "./footer";
import { PageSkeleton } from "./skeleton";
import { ScrollRestoration } from "./scroll-restoration";
import FloatingCartPreview from "./floating-cart-preview";
import PaymentResultListener from "./payment-result-listener";

export default function Layout() {
  return (
    <div className="w-screen h-screen flex flex-col bg-section text-foreground">
      <PaymentResultListener />
      <Header />
      <div className="flex-1 overflow-y-auto bg-background">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>
      <Footer />
      <Toaster
        containerClassName="toast-container"
        containerStyle={{ top: "calc(50% - 24px)" }}
      />
      <FloatingCartPreview />
      <ScrollRestoration />
    </div>
  );
}

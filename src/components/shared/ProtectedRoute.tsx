import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearStoredClientIdentity, getStoredClientIdentity } from "@/lib/client-tracking";

export const ProtectedRoute = () => {
  const location = useLocation();
  const identity = getStoredClientIdentity();

  if (!identity) {
    clearStoredClientIdentity();

    return (
      <Navigate
        to="/"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
  }

  return <Outlet />;
};

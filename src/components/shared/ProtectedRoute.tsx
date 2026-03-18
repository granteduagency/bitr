import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
  const name = localStorage.getItem("client_name");
  const phone = localStorage.getItem("client_phone");

  if (!name || !phone) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

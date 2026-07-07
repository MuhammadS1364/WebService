import { Navigate } from 'react-router-dom';
// METHOD FIX: Added 'type' keyword to comply with verbatimModuleSyntax
import type { ReactNode } from 'react';

// Define the type for the props
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Safely check for authentication token and cast it to a boolean
  const isAuthenticated = Boolean(localStorage.getItem("userToken")); 

  if (!isAuthenticated) {
    // Redirect them to the login page, and replace the current history state
    return <Navigate to="/login" replace />;
  }

  // If they are logged in, render the requested component
  return <>{children}</>;
};

export default ProtectedRoute;
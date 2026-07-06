import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

// Define the type for the props
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Replace this with your actual authentication logic. 
  const isAuthenticated = localStorage.getItem("userToken"); 

  if (!isAuthenticated) {
    // Redirect them to the login page, and replace the current history state
    return <Navigate to="/login" replace />;
  }

  // If they are logged in, render the requested component
  return <>{children}</>;
};

export default ProtectedRoute;
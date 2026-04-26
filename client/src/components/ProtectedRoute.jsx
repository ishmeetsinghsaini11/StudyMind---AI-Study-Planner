import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const userId = localStorage.getItem('userId');
  
  if (!userId) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

export default ProtectedRoute;

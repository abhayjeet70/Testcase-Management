import React, { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { can } from '../utils/permissions';

interface ProtectedRouteProps {
  requiredPermission?: string;
  requiredRole?: string;
}

export function ProtectedRoute({ requiredPermission, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />; // Or to an unauthorized page
  }

  if (requiredPermission && !can(currentUser, requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

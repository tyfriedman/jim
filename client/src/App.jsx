import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";

function PrivateRoute({ children }) {
  const { token, authReady } = useAuth();
  if (!authReady) {
    return (
      <div className="retro-loading" aria-busy="true">
        <p>Loading…</p>
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const { token, authReady } = useAuth();
  if (!authReady) {
    return (
      <div className="retro-loading" aria-busy="true">
        <p>Loading…</p>
      </div>
    );
  }
  if (token) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RootRedirect() {
  const { token, authReady } = useAuth();
  if (!authReady) {
    return (
      <div className="retro-loading" aria-busy="true">
        <p>Loading…</p>
      </div>
    );
  }
  return <Navigate to={token ? "/home" : "/login"} replace />;
}

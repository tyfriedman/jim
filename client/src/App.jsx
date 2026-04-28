import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import SectionPage from "./pages/SectionPage.jsx";
import WorkoutsPage from "./pages/WorkoutsPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";

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
      <Route
        path="/workouts"
        element={
          <PrivateRoute>
            <WorkoutsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/shop"
        element={
          <PrivateRoute>
            <SectionPage title="Shop" />
          </PrivateRoute>
        }
      />
      <Route
        path="/friends"
        element={
          <PrivateRoute>
            <FriendsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <SectionPage title="Profile" />
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

import { Route, Routes } from 'react-router-dom';
import { NavBar } from './components/layout/NavBar.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';

export function App() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          {/* Scene editor, render view, and gallery routes are added here
              in later phases as each page is built. */}
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

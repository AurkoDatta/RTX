import { Route, Routes } from 'react-router-dom';
import { NavBar } from './components/layout/NavBar.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { GalleryPage } from './pages/GalleryPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { RenderViewPage } from './pages/RenderViewPage.jsx';
import { SceneEditorPage } from './pages/SceneEditorPage.jsx';

export function App() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor" element={<SceneEditorPage />} />
          <Route path="/render/:jobId" element={<RenderViewPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { AboutPage } from './pages/AboutPage';
import { AuthPage } from './pages/AuthPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { HomePage } from './pages/HomePage';
import { LearnSignPage } from './pages/LearnSignPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProgressPage } from './pages/ProgressPage';
import { QuickMessagesPage } from './pages/QuickMessagesPage';
import { TextToSignPage } from './pages/TextToSignPage';
import { TranslatorPage } from './pages/TranslatorPage';
import { TwoWayCommunicationPage } from './pages/TwoWayCommunicationPage';

export default function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="/quick-messages" element={<QuickMessagesPage />} />
              <Route path="/communicate" element={<TwoWayCommunicationPage />} />
              <Route path="/translator" element={<TranslatorPage />} />
              <Route path="/text-to-sign" element={<TextToSignPage />} />
              <Route path="/learn" element={<LearnSignPage />} />
              <Route path="/emergency" element={<EmergencyPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <ProgressPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

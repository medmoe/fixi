import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createTestStore } from '@/test-utils.tsx';
import { ProtectedRoute } from './ProtectedRoute';

const renderWithAuth = (accessToken: string | null, role: 'customer' | 'worker' | null) => {
  const store = createTestStore({
    auth: {
      accessToken,
      user: role
        ? {
            id: 1,
            name: 'Alex',
            username: 'alex01',
            email: 'alex@example.com',
            profile_image_url: 'https://example.com/avatar.png',
            role_type: role,
            tier_id: null
          }
        : null
    }
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/app']} future={{ v7_startTransition: true }}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/app"
            element={
              <ProtectedRoute requiredRole="customer">
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('ProtectedRoute', () => {
  it('redirects to login when not authenticated', () => {
    renderWithAuth(null, null);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders content when authenticated and role matches', () => {
    renderWithAuth('token-123', 'customer');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

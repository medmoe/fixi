import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createTestStore } from '../../../test-utils';
import { JobDetailPage } from './JobDetailPage';

const renderWithStore = () => {
  const store = createTestStore({
    auth: {
      accessToken: 'token-123',
      user: {
        id: 1,
        name: 'Alex',
        username: 'alex01',
        email: 'alex@example.com',
        profile_image_url: 'https://example.com/avatar.png',
        role_type: 'customer',
        tier_id: null
      }
    }
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/jobs/101']}>
        <Routes>
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('JobDetailPage', () => {
  it('renders job details', async () => {
    renderWithStore();
    expect(await screen.findByText('Job details')).toBeInTheDocument();
  });
});

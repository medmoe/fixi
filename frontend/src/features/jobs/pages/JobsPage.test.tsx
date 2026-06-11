import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createTestStore } from '../../../test-utils';
import { JobsPage } from './JobsPage';

const renderWithStore = (role: 'customer' | 'handyman') => {
  const store = createTestStore({
    auth: {
      accessToken: 'token-123',
      user: {
        id: 1,
        name: 'Alex',
        username: 'alex01',
        email: 'alex@example.com',
        profile_image_url: 'https://example.com/avatar.png',
        role_type: role,
        tier_id: null
      }
    }
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>
    </Provider>
  );
};

describe('JobsPage', () => {
  it('shows a create job form for customers', async () => {
    renderWithStore('customer');
    expect(await screen.findByText('Create a job')).toBeInTheDocument();
  });

  it('shows a review panel for completed jobs', async () => {
    renderWithStore('customer');
    expect(await screen.findByText('Leave a review')).toBeInTheDocument();
  });

  it('shows accept actions for handymen', async () => {
    renderWithStore('handyman');
    expect(await screen.findByText('My jobs')).toBeInTheDocument();
  });

  it('shows nearby jobs for handymen', async () => {
    renderWithStore('handyman');
    expect(await screen.findByText('Nearby open jobs')).toBeInTheDocument();
  });
});

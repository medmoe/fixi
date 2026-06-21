import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createTestStore } from '../../../test-utils';
import { WorkersPage } from './WorkersPage';

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
        <WorkersPage />
      </MemoryRouter>
    </Provider>
  );
};

describe('WorkersPage', () => {
  it('renders worker discovery for customers', async () => {
    renderWithStore('customer');
    expect(await screen.findByText('Find trusted workers')).toBeInTheDocument();
  });

  it('shows nearby discovery for customers', async () => {
    renderWithStore('customer');
    expect(await screen.findByText('Nearby discovery')).toBeInTheDocument();
  });

  it('blocks handymen from the workers page', async () => {
    renderWithStore('handyman');
    expect(await screen.findByText('Access limited')).toBeInTheDocument();
  });
});

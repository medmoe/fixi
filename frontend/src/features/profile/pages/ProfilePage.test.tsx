import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createTestStore } from '../../../test-utils';
import { ProfilePage } from './ProfilePage';

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
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </Provider>
  );
};

describe('ProfilePage', () => {
  it('renders the user profile form with fetched data', async () => {
    renderWithStore();

    expect(await screen.findByDisplayValue('Alex')).toBeInTheDocument();
    expect(screen.getByDisplayValue('alex01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('alex@example.com')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createTestStore } from '../../../test-utils';
import { LoginPage } from './LoginPage';

const renderWithStore = () => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </Provider>
  );
};

describe('LoginPage', () => {
  it('renders sign in form', () => {
    renderWithStore();
    expect(screen.getByText('Sign in to Fixi')).toBeInTheDocument();
  });
});

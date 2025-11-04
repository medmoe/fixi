import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

describe('App smoke test', () => {
  it('renders without crashing', async () => {
    const { findByText } = render(<App />);
    // Login screen headline
    await findByText(/Welcome to Fixi/i);
  });
});

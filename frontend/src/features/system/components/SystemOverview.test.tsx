import { render, screen, waitFor } from '@testing-library/react';
import { TestProvider } from '../../../test-utils';
import { SystemOverview } from './SystemOverview';

describe('SystemOverview', () => {
  it('renders systems from the API', async () => {
    render(
      <TestProvider>
        <SystemOverview />
      </TestProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Primary Cluster')).toBeInTheDocument();
    });
  });
});

import {screen} from '@testing-library/react';
import {describe, expect, it} from "vitest";
import {LandingPage} from '@/features/landing';
import {renderWithProviders} from '@/test/renderWithProviders';

describe('LandingPage Integration', () => {
    it('renders the layout landmarks correctly', () => {
        renderWithProviders(<LandingPage/>);

        expect(screen.getAllByRole('navigation')).toHaveLength(2);
        expect(screen.getByRole('navigation', {name: /main navigation/i})).toBeInTheDocument();
        expect(screen.getByRole('navigation', {name: /footer navigation/i})).toBeInTheDocument();
    });
})
import {render, screen} from '@testing-library/react';
import {describe, expect, it} from "vitest";
import {LandingPage} from '@/features/landing';
import {MemoryRouter} from 'react-router-dom';

describe('LandingPage Integration', () => {
    it('renders the layout landmarks correctly', () => {
        render(
            <MemoryRouter future={{v7_startTransition: true}}>
                <LandingPage/>
            </MemoryRouter>
        );

        expect(screen.getAllByRole('navigation')).toHaveLength(2);
        expect(screen.getByRole('navigation', {name: /main navigation/i})).toBeInTheDocument();
        expect(screen.getByRole('navigation', {name: /footer navigation/i})).toBeInTheDocument();
    });
})
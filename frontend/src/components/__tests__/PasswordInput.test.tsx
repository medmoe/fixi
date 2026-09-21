import {describe, expect, it, vi} from 'vitest';
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {FormEvent} from 'react';
import {PasswordInput} from '@/components/ui/password-input';

describe('PasswordInput', () => {
    it('masks the value by default', () => {
        render(<PasswordInput aria-label="Password" value="secret123" onChange={() => {
        }}/>);
        expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    });

    it('reveals the value as plain text when the eye icon is clicked', async () => {
        render(<PasswordInput aria-label="Password" value="secret123" onChange={() => {
        }}/>);

        await act(async () => await userEvent.click(screen.getByRole('button', {name: /show password/i})));

        expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    });

    it('masks the value again when the eye icon is clicked a second time', async () => {
        render(<PasswordInput aria-label="Password" value="secret123" onChange={() => {
        }}/>);

        const toggle = screen.getByRole('button', {name: /show password/i});
        await act(async () => await userEvent.click(toggle));
        await act(async () => await userEvent.click(screen.getByRole('button', {name: /hide password/i})));

        expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    });

    it('does not submit the enclosing form when the toggle is clicked', async () => {
        const handleSubmit = vi.fn((e: FormEvent) => e.preventDefault());
        render(
            <form onSubmit={handleSubmit}>
                <PasswordInput aria-label="Password" value="secret123" onChange={() => {
                }}/>
            </form>
        );

        await act(async () => await userEvent.click(screen.getByRole('button', {name: /show password/i})));

        expect(handleSubmit).not.toHaveBeenCalled();
    });
});

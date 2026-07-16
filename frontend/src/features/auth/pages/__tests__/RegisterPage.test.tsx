// src/features/auth/__tests__/RegisterPage.test.tsx
import {act} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {screen} from '@testing-library/react'
import {RegisterPage} from '@/features/auth/pages/RegisterPage'
import {useRegister} from '@/features/auth/hooks/useRegister'
import {renderWithProviders} from '@/test/renderWithProviders'

vi.mock('@/features/auth/hooks/useRegister')
vi.mock('@/components/ui/select', () => {
    return {
        Select: ({children}: any) => <div>{children}</div>,
        SelectTrigger: ({children, 'aria-label': ariaLabel}: any) => (
            <button role="combobox" aria-label={ariaLabel}>{children}</button>
        ),
        SelectValue: ({placeholder}: any) => <span>{placeholder}</span>,
        SelectContent: ({children}: any) => <div>{children}</div>,
        SelectItem: ({children}: any) => <div role="option">{children}</div>,
    }
})

describe('RegisterPage', () => {
    beforeEach(() => {
        vi.mocked(useRegister).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
        } as any)
    })

    it('renders page heading', async () => {
        await act(async () => {
            renderWithProviders(<RegisterPage/>)
        })
        expect(screen.getByRole('heading', {name: /create your account/i})).toBeInTheDocument()
    })

    it('renders subheading', async () => {
        await act(async () => {
            renderWithProviders(<RegisterPage/>)
        })
        expect(screen.getByText(/join fixi as a customer or service worker/i)).toBeInTheDocument()
    })

    it('renders registration form', async () => {
        await act(async () => {
            renderWithProviders(<RegisterPage/>)
        })
        expect(screen.getByRole('form', {name: /registration form/i})).toBeInTheDocument()
    })

    it('renders all form fields', async () => {
        await act(async () => {
            renderWithProviders(<RegisterPage/>)
        })
        expect(screen.getByLabelText('Full name')).toBeInTheDocument()
        expect(screen.getByLabelText('Username')).toBeInTheDocument()
        expect(screen.getByLabelText('Email address')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('renders create account button', async () => {
        await act(async () => {
            renderWithProviders(<RegisterPage/>)
        })
        expect(screen.getByRole('button', {name: /create account/i})).toBeInTheDocument()
    })

    it('renders sign in link', async () => {
        await act(async () => {
            renderWithProviders(<RegisterPage/>)
        })
        expect(screen.getByRole('link', {name: /sign in/i})).toBeInTheDocument()
    })
})
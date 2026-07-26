import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {AvatarUploadField, useUploadAvatar} from '@/features/worker'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/worker/hooks/useUploadAvatar')

// mock URL.createObjectURL — not available in jsdom
const mockObjectUrl = 'blob:http://localhost/mock-preview-url'
global.URL.createObjectURL = vi.fn(() => mockObjectUrl)
global.URL.revokeObjectURL = vi.fn()

vi.mock('@/components/ui/avatar', () => ({
    Avatar: ({children, className}: any) => (
        <div className={className}>{children}</div>
    ),
    AvatarImage: ({src, alt}: any) => (
        <img src={src} alt={alt}/>  // ✅ always renders — no load event needed
    ),
    AvatarFallback: ({children}: any) => (
        <span>{children}</span>
    ),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENT_AVATAR_URL = 'https://cdn.example.com/avatar.jpg'

const mockMutate = vi.fn()

const renderComponent = (props: Partial<{ workerId: number; currentAvatarUrl: string }> = {}) => {
    return render(
        <AvatarUploadField
            currentAvatarUrl={props.currentAvatarUrl ?? CURRENT_AVATAR_URL}
        />
    )
}

const createMockFile = (name = 'avatar.png', type = 'image/png', size = 1024) => {
    return new File(['a'.repeat(size)], name, {type})
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AvatarUploadField', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // default mock — idle state
        vi.mocked(useUploadAvatar).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
        } as any)
    })

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders the choose image button', () => {
            renderComponent()
            expect(screen.getByRole('button', {name: /upload avatar image file/i})).toBeInTheDocument()
        })

        it('renders the profile picture heading', () => {
            renderComponent()
            expect(screen.getByText('Profile Picture')).toBeInTheDocument()
        })

        it('renders the file size hint text', () => {
            renderComponent()
            expect(screen.getByText(/supports jpg, png under 5mb/i)).toBeInTheDocument()
        })

        it('renders the avatar image with currentAvatarUrl', () => {
            renderComponent({currentAvatarUrl: CURRENT_AVATAR_URL})
            const img = screen.getByAltText(/avatar profile graphic/i)
            expect(img).toHaveAttribute('src', CURRENT_AVATAR_URL)
        })

        it('renders avatar fallback text WP', () => {
            renderComponent()
            expect(screen.getByText('WP')).toBeInTheDocument()
        })

        it('renders hidden file input', () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]')
            expect(input).toBeInTheDocument()
            expect(input).toHaveClass('hidden')
        })

        it('file input accepts only images', () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]')
            expect(input).toHaveAttribute('accept', 'image/*')
        })

        it('does not show loading spinner when idle', () => {
            renderComponent()
            expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
        })
    })

    // ─── Accessibility ────────────────────────────────────────────────────────

    describe('accessibility', () => {
        it('button has aria-label', () => {
            renderComponent()
            const button = screen.getByRole('button', {name: /upload avatar image file/i})
            expect(button).toBeInTheDocument()
        })

        it('avatar image has alt text', () => {
            renderComponent()
            expect(screen.getByAltText('Avatar profile graphic')).toBeInTheDocument()
        })
    })

    // ─── File input trigger ───────────────────────────────────────────────────

    describe('file input trigger', () => {
        it('clicking the button triggers the hidden file input', async () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            const clickSpy = vi.spyOn(input, 'click')

            const button = screen.getByRole('button', {name: /upload avatar image file/i})
            await act(async () => await userEvent.click(button))

            expect(clickSpy).toHaveBeenCalledTimes(1)
        })
    })

    // ─── File selection ───────────────────────────────────────────────────────

    describe('file selection', () => {
        it('creates object URL for local preview on file select', async () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            const file = createMockFile()

            await act(() => fireEvent.change(input, {target: {files: [file]}}))

            expect(URL.createObjectURL).toHaveBeenCalledWith(file)
        })

        it('shows local preview instead of currentAvatarUrl after file select', async () => {
            renderComponent({currentAvatarUrl: CURRENT_AVATAR_URL})
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            const file = createMockFile()

            await act(() => fireEvent.change(input, {target: {files: [file]}}))

            await waitFor(() => {
                const img = screen.getByAltText('Avatar profile graphic')
                expect(img).toHaveAttribute('src', mockObjectUrl)  // ✅ local preview
            })
        })

        it('calls uploadAvatar mutation with the selected file', async () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            const file = createMockFile()

            await act(() => fireEvent.change(input, {target: {files: [file]}}))

            expect(mockMutate).toHaveBeenCalledWith(file, expect.objectContaining({
                onError: expect.any(Function),
            }))
        })

        it('does nothing when no file is selected', async () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement

            await act(() => fireEvent.change(input, {target: {files: []}}))

            expect(mockMutate).not.toHaveBeenCalled()
            expect(URL.createObjectURL).not.toHaveBeenCalled()
        })
    })

    // ─── Upload error ─────────────────────────────────────────────────────────

    describe('on upload error', () => {
        it('resets local preview on upload error', async () => {
            // capture the onError callback passed to mutate
            let capturedOnError: (() => void) | undefined

            vi.mocked(useUploadAvatar).mockReturnValue({
                mutate: vi.fn((_file, callbacks) => {
                    capturedOnError = callbacks?.onError
                }),
                isPending: false,
            } as any)

            renderComponent({currentAvatarUrl: CURRENT_AVATAR_URL})
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            const file = createMockFile()

            // select a file — sets local preview
            await act(() => fireEvent.change(input, {target: {files: [file]}}))

            await waitFor(() => {
                const img = screen.getByAltText('Avatar profile graphic')
                expect(img).toHaveAttribute('src', mockObjectUrl)  // preview set
            })

            // simulate upload error
            act(() => capturedOnError?.())

            await waitFor(() => {
                const img = screen.getByAltText('Avatar profile graphic')
                // reverts to currentAvatarUrl after error
                expect(img).toHaveAttribute('src', CURRENT_AVATAR_URL)
            })
        })
    })

    // ─── Pending state ────────────────────────────────────────────────────────

    describe('pending / loading state', () => {
        beforeEach(() => {
            vi.mocked(useUploadAvatar).mockReturnValue({
                mutate: mockMutate,
                isPending: true,  // ✅ upload in progress
            } as any)
        })

        it('shows loading spinner when upload is pending', () => {
            renderComponent()
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
        })

        it('disables the choose image button during upload', () => {
            renderComponent()
            const button = screen.getByRole('button', {name: /upload avatar image file/i})
            expect(button).toBeDisabled()
        })

        it('disables the file input during upload', () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            expect(input).toBeDisabled()
        })

        it('does not trigger file input click when button is disabled', async () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            const clickSpy = vi.spyOn(input, 'click')

            const button = screen.getByRole('button', {name: /upload avatar image file/i})
            await act(async () => await userEvent.click(button))

            expect(clickSpy).not.toHaveBeenCalled()
        })
    })
})
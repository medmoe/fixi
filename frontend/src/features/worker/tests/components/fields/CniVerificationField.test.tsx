import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, fireEvent, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {CniVerificationField, useUploadCniDocument} from '@/features/worker'

vi.mock('@/features/worker/hooks/useUploadCniDocument')

const mockMutate = vi.fn()

const renderComponent = (props: Partial<{ isVerified: boolean; hasCniDocument: boolean }> = {}) => {
    return render(
        <CniVerificationField
            isVerified={props.isVerified ?? false}
            hasCniDocument={props.hasCniDocument ?? false}
        />
    )
}

const createMockFile = (name = 'cni.pdf', type = 'application/pdf') => new File(['a'], name, {type})

describe('CniVerificationField', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useUploadCniDocument).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
        } as any)
    })

    describe('status: unverified, no document', () => {
        it('shows the unverified badge', () => {
            renderComponent({isVerified: false, hasCniDocument: false})
            expect(screen.getByText('Not verified')).toBeInTheDocument()
        })

        it('shows the upload button', () => {
            renderComponent({isVerified: false, hasCniDocument: false})
            expect(screen.getByRole('button', {name: 'Upload document'})).toBeInTheDocument()
        })
    })

    describe('status: pending review', () => {
        it('shows the pending badge', () => {
            renderComponent({isVerified: false, hasCniDocument: true})
            expect(screen.getByText('Pending review')).toBeInTheDocument()
        })

        it('shows a re-upload button', () => {
            renderComponent({isVerified: false, hasCniDocument: true})
            expect(screen.getByRole('button', {name: /re-upload/i})).toBeInTheDocument()
        })
    })

    describe('status: verified', () => {
        it('shows the verified badge', () => {
            renderComponent({isVerified: true, hasCniDocument: true})
            expect(screen.getByText('Verified')).toBeInTheDocument()
        })

        it('does not show an upload button', () => {
            renderComponent({isVerified: true, hasCniDocument: true})
            expect(screen.queryByRole('button')).not.toBeInTheDocument()
        })
    })

    describe('file selection', () => {
        it('calls the upload mutation with the selected file', async () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            const file = createMockFile()

            await act(() => fireEvent.change(input, {target: {files: [file]}}))

            expect(mockMutate).toHaveBeenCalledWith(file)
        })

        it('does nothing when no file is selected', async () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement

            await act(() => fireEvent.change(input, {target: {files: []}}))

            expect(mockMutate).not.toHaveBeenCalled()
        })

        it('the file input only accepts jpeg, png, and pdf', () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,application/pdf')
        })

        it('clicking the button triggers the hidden file input', async () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            const clickSpy = vi.spyOn(input, 'click')

            await act(async () => await userEvent.click(screen.getByRole('button', {name: 'Upload document'})))

            expect(clickSpy).toHaveBeenCalledTimes(1)
        })
    })

    describe('pending upload state', () => {
        beforeEach(() => {
            vi.mocked(useUploadCniDocument).mockReturnValue({
                mutate: mockMutate,
                isPending: true,
            } as any)
        })

        it('disables the upload button', () => {
            renderComponent()
            expect(screen.getByRole('button', {name: 'Upload document'})).toBeDisabled()
        })

        it('disables the file input', () => {
            renderComponent()
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            expect(input).toBeDisabled()
        })
    })
})

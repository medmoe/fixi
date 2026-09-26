import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {PortfolioManager} from '../../components/PortfolioManager'
import {useDeletePortfolioImage, usePortfolioImages, useUploadPortfolioImage} from '../../hooks'

vi.mock('../../hooks', () => ({
    usePortfolioImages: vi.fn(),
    useUploadPortfolioImage: vi.fn(),
    useDeletePortfolioImage: vi.fn(),
}))

const images = (n: number) => Array.from({length: n}, (_, i) => ({
    id: i + 1, worker_profile_id: 3, image_url: `https://cdn/${i + 1}.jpg`, created_at: '2026-09-01T00:00:00Z', updated_at: null,
}))

describe('PortfolioManager', () => {
    const upload = vi.fn()
    const remove = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(usePortfolioImages).mockReturnValue({data: [], isLoading: false} as any)
        vi.mocked(useUploadPortfolioImage).mockReturnValue({mutate: upload, isPending: false} as any)
        vi.mocked(useDeletePortfolioImage).mockReturnValue({mutate: remove, isPending: false, variables: undefined} as any)
    })

    it('shows the empty state and a 0/10 counter', () => {
        render(<PortfolioManager workerProfileId={3}/>)
        expect(screen.getByText(/No photos yet/)).toBeInTheDocument()
        expect(screen.getByTestId('portfolio-counter')).toHaveTextContent('0/10 photos')
    })

    it('uploads the chosen file', async () => {
        render(<PortfolioManager workerProfileId={3}/>)
        const file = new File(['x'], 'kitchen.jpg', {type: 'image/jpeg'})

        await userEvent.upload(screen.getByTestId('portfolio-file-input'), file)

        expect(upload).toHaveBeenCalledWith(file)
    })

    it('shows each photo with a delete button', () => {
        vi.mocked(usePortfolioImages).mockReturnValue({data: images(3), isLoading: false} as any)
        render(<PortfolioManager workerProfileId={3}/>)

        expect(screen.getByTestId('portfolio-counter')).toHaveTextContent('3/10 photos')
        expect(screen.getAllByRole('button', {name: /Delete photo/})).toHaveLength(3)
    })

    it('asks for confirmation before deleting', async () => {
        vi.mocked(usePortfolioImages).mockReturnValue({data: images(2), isLoading: false} as any)
        render(<PortfolioManager workerProfileId={3}/>)

        await userEvent.click(screen.getByRole('button', {name: 'Delete photo 2'}))
        expect(remove).not.toHaveBeenCalled()
        expect(screen.getByText('Delete this photo?')).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', {name: 'Delete'}))
        expect(remove).toHaveBeenCalledWith(2)
    })

    it('disables adding at the 10-photo limit and says why', () => {
        vi.mocked(usePortfolioImages).mockReturnValue({data: images(10), isLoading: false} as any)
        render(<PortfolioManager workerProfileId={3}/>)

        expect(screen.getByRole('button', {name: 'Add photo'})).toBeDisabled()
        expect(screen.getByText(/You've reached the limit of 10 photos/)).toBeInTheDocument()
    })

    it('disables adding while an upload is in flight', () => {
        vi.mocked(useUploadPortfolioImage).mockReturnValue({mutate: upload, isPending: true} as any)
        render(<PortfolioManager workerProfileId={3}/>)
        expect(screen.getByRole('button', {name: 'Uploading...'})).toBeDisabled()
    })
})

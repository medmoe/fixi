import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {PortfolioGallery} from '../../components/PortfolioGallery'
import {usePortfolioImages} from '../../hooks'

vi.mock('../../hooks', () => ({usePortfolioImages: vi.fn()}))

const images = [1, 2, 3].map((id) => ({id, worker_profile_id: 3, image_url: `https://cdn/${id}.jpg`, created_at: '2026-09-01T00:00:00Z', updated_at: null}))

describe('PortfolioGallery', () => {
    beforeEach(() => vi.clearAllMocks())

    it('renders nothing when the worker has no photos', () => {
        vi.mocked(usePortfolioImages).mockReturnValue({data: [], isLoading: false} as any)
        const {container} = render(<PortfolioGallery workerProfileId={3}/>)
        expect(container).toBeEmptyDOMElement()
    })

    it('shows a thumbnail per photo', () => {
        vi.mocked(usePortfolioImages).mockReturnValue({data: images, isLoading: false} as any)
        render(<PortfolioGallery workerProfileId={3}/>)

        expect(screen.getByRole('heading', {name: 'Previous work'})).toBeInTheDocument()
        expect(screen.getAllByRole('button', {name: /View photo/})).toHaveLength(3)
    })

    it('opens the lightbox on a photo and steps through with next/previous', async () => {
        vi.mocked(usePortfolioImages).mockReturnValue({data: images, isLoading: false} as any)
        render(<PortfolioGallery workerProfileId={3}/>)

        await userEvent.click(screen.getByRole('button', {name: 'View photo 3'}))
        expect(screen.getByRole('img', {name: 'Portfolio photo 3'})).toHaveAttribute('src', 'https://cdn/3.jpg')

        await userEvent.click(screen.getByRole('button', {name: 'Next photo'}))
        expect(screen.getByRole('img', {name: 'Portfolio photo 1'})).toBeInTheDocument()  // wraps around

        await userEvent.click(screen.getByRole('button', {name: 'Previous photo'}))
        expect(screen.getByRole('img', {name: 'Portfolio photo 3'})).toBeInTheDocument()
    })

    it('supports arrow keys in the lightbox', async () => {
        vi.mocked(usePortfolioImages).mockReturnValue({data: images, isLoading: false} as any)
        render(<PortfolioGallery workerProfileId={3}/>)

        await userEvent.click(screen.getByRole('button', {name: 'View photo 1'}))
        await userEvent.keyboard('{ArrowRight}')

        expect(screen.getByRole('img', {name: 'Portfolio photo 2'})).toBeInTheDocument()
    })
})

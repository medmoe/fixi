import {beforeEach, describe, expect, it, vi} from "vitest";
import apiClient from "@/lib/api/apiClient";
import {jobApi} from '@/lib'
import {mockCreateJobPayload, mockJob} from "@/mocks";
// — Mocks ——————————————————————————————————————————————————————————————————————————————————

vi.mock('@/lib/api/apiClient', () => ({
    default: {
        post: vi.fn(),
    }
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockPost = vi.mocked(apiClient.post);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('jobApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    })

    // ─── Create Job ──────────────────────────────────────────────────────────────────
    it('calls POST /jobs with payload', async () => {
        mockPost.mockResolvedValueOnce({data: mockJob})
        await jobApi.createJob(mockCreateJobPayload)
        expect(mockPost).toHaveBeenCalledWith('/jobs', mockCreateJobPayload)
    })

    it('returns created job data', async () => {
        mockPost.mockResolvedValueOnce({data: mockJob})
        const createdJob = await jobApi.createJob(mockCreateJobPayload)
        expect(createdJob).toEqual(mockJob)
    })

    it('propagates errors from apiClient', async () => {
        mockPost.mockRejectedValueOnce(new Error('API error'))
        await expect(jobApi.createJob(mockCreateJobPayload)).rejects.toThrow('API error')
    })
    it('calls apiClient.post exactly once', async () => {
        mockPost.mockResolvedValueOnce({data: mockJob})
        await jobApi.createJob(mockCreateJobPayload)
        expect(mockPost).toHaveBeenCalledTimes(1)
    })

})
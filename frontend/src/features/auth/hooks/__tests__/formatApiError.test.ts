// src/features/auth/__tests__/formatApiError.test.ts

import {describe, expect, it} from 'vitest'

// Inline the function for testing (or import from useAuth)
const formatApiError = (error: any): string => {
    const detail = error?.response?.data?.detail

    if (Array.isArray(detail)) {
        if (detail.length === 0) {
            return 'Something went wrong. Please try again.'
        }
        return detail
            .map((err: any) => err.msg)
            .filter(Boolean)
            .join('. ')
    }

    if (typeof detail === 'string' && detail.length > 0) {
        return detail
    }

    return 'Something went wrong. Please try again.'
}

describe('formatApiError', () => {
    it('formats array of validation errors', () => {
        const error = {
            response: {
                data: {
                    detail: [
                        {loc: ['body', 'email'], msg: 'Invalid email', type: 'value_error'},
                        {loc: ['body', 'password'], msg: 'Password too short', type: 'value_error'},
                    ],
                },
            },
        }

        expect(formatApiError(error)).toBe('Invalid email. Password too short')
    })

    it('returns string detail as-is', () => {
        const error = {
            response: {
                data: {
                    detail: 'Invalid credentials',
                },
            },
        }

        expect(formatApiError(error)).toBe('Invalid credentials')
    })

    it('returns fallback for network error (no response)', () => {
        const error = new Error('Network error')

        expect(formatApiError(error)).toBe('Something went wrong. Please try again.')
    })

    it('returns fallback for error with no detail', () => {
        const error = {
            response: {
                data: {},
            },
        }

        expect(formatApiError(error)).toBe('Something went wrong. Please try again.')
    })

    it('returns fallback for null/undefined error', () => {
        expect(formatApiError(null)).toBe('Something went wrong. Please try again.')
        expect(formatApiError(undefined)).toBe('Something went wrong. Please try again.')
    })

    it('handles single-item array', () => {
        const error = {
            response: {
                data: {
                    detail: [{msg: 'Field required'}],
                },
            },
        }

        expect(formatApiError(error)).toBe('Field required')
    })

    it('handles empty array', () => {
        const error = {
            response: {
                data: {
                    detail: [],
                },
            },
        }

        expect(formatApiError(error)).toBe('Something went wrong. Please try again.')
    })

    it('handles array with empty msg fields', () => {
        const error = {
            response: {
                data: {
                    detail: [
                        {msg: 'Valid error'},
                        {msg: ''},
                        {msg: undefined},
                        {msg: 'Another error'},
                    ],
                },
            },
        }

        expect(formatApiError(error)).toBe('Valid error. Another error')
    })

    it('handles empty string detail', () => {
        const error = {
            response: {
                data: {
                    detail: '',
                },
            },
        }

        expect(formatApiError(error)).toBe('Something went wrong. Please try again.')
    })
})
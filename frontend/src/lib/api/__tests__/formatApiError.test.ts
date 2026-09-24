import {describe, expect, it} from 'vitest'
import type {TFunction} from 'i18next'
import {formatApiError} from '../formatApiError'

// Assertions here only check shape/fallback-key routing, not translated
// text -- a stub `t` that echoes the key back is enough (same pattern as
// authSchema.test.ts), the actual translated strings are covered by each
// feature's own locale files and callers.
const stubT = ((key: string) => key) as TFunction

describe('formatApiError', () => {
    it('translates a known string detail via the provided map', () => {
        const error = {response: {data: {detail: 'You have already applied to this job'}}}
        const result = formatApiError(error, stubT, {'You have already applied to this job': 'toasts.alreadyApplied'})
        expect(result).toBe('toasts.alreadyApplied')
    })

    it('returns an unrecognized string detail as-is', () => {
        const error = {response: {data: {detail: 'Job with id 42 not found'}}}
        expect(formatApiError(error, stubT, {'You have already applied to this job': 'toasts.alreadyApplied'})).toBe(
            'Job with id 42 not found'
        )
    })

    it('falls back to the fallback key when knownErrors is omitted', () => {
        const error = {response: {data: {detail: 'Some message'}}}
        expect(formatApiError(error, stubT)).toBe('Some message')
    })

    it('joins a Pydantic validation array', () => {
        const error = {response: {data: {detail: [{msg: 'Invalid email'}, {msg: 'Too short'}]}}}
        expect(formatApiError(error, stubT)).toBe('Invalid email. Too short')
    })

    it('uses a custom fallback key for a network error', () => {
        expect(formatApiError(new Error('Network error'), stubT, {}, 'toasts.customFallback')).toBe(
            'toasts.customFallback'
        )
    })

    it('uses the default fallback key when none is given', () => {
        expect(formatApiError(null, stubT)).toBe('toasts.genericError')
    })

    it('falls back for an empty detail array', () => {
        const error = {response: {data: {detail: []}}}
        expect(formatApiError(error, stubT, {}, 'toasts.customFallback')).toBe('toasts.customFallback')
    })
})

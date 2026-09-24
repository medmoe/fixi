// src/features/auth/hooks/__tests__/formatApiError.test.ts

import {describe, expect, it} from 'vitest'
import {formatApiError, translateApiErrorDetail} from '../formatApiError'
import i18n from '@/lib/i18n'

// Namespaced to 'auth', matching how useTranslation('auth') resolves keys
// like 'toasts.genericError' in the real hooks.
const t = i18n.getFixedT('en', 'auth')

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

        expect(formatApiError(error, t)).toBe('Invalid email. Password too short')
    })

    it('returns an unrecognized string detail as-is', () => {
        const error = {
            response: {
                data: {
                    detail: 'Invalid credentials',
                },
            },
        }

        expect(formatApiError(error, t)).toBe('Invalid credentials')
    })

    it('translates a known string detail', () => {
        const error = {
            response: {
                data: {
                    detail: 'Wrong username, email or password.',
                },
            },
        }

        expect(formatApiError(error, t)).toBe('Wrong username, email or password.')
    })

    it('returns fallback for network error (no response)', () => {
        const error = new Error('Network error')

        expect(formatApiError(error, t)).toBe('Something went wrong. Please try again.')
    })

    it('returns fallback for error with no detail', () => {
        const error = {
            response: {
                data: {},
            },
        }

        expect(formatApiError(error, t)).toBe('Something went wrong. Please try again.')
    })

    it('returns fallback for null/undefined error', () => {
        expect(formatApiError(null, t)).toBe('Something went wrong. Please try again.')
        expect(formatApiError(undefined, t)).toBe('Something went wrong. Please try again.')
    })

    it('handles single-item array', () => {
        const error = {
            response: {
                data: {
                    detail: [{msg: 'Field required'}],
                },
            },
        }

        expect(formatApiError(error, t)).toBe('Field required')
    })

    it('handles empty array', () => {
        const error = {
            response: {
                data: {
                    detail: [],
                },
            },
        }

        expect(formatApiError(error, t)).toBe('Something went wrong. Please try again.')
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

        expect(formatApiError(error, t)).toBe('Valid error. Another error')
    })

    it('handles empty string detail', () => {
        const error = {
            response: {
                data: {
                    detail: '',
                },
            },
        }

        expect(formatApiError(error, t)).toBe('Something went wrong. Please try again.')
    })
})

describe('translateApiErrorDetail', () => {
    it('translates the login-failure message', () => {
        expect(translateApiErrorDetail('Wrong username, email or password.', t)).toBe(
            'Wrong username, email or password.'
        )
    })

    it('translates the duplicate-email message', () => {
        expect(translateApiErrorDetail('Email already registered', t)).toBe('Email already registered')
    })

    it('translates the duplicate-username message', () => {
        expect(translateApiErrorDetail('Username already registered', t)).toBe('Username already registered')
    })

    it('returns an unrecognized message unchanged', () => {
        expect(translateApiErrorDetail('Some future backend message', t)).toBe('Some future backend message')
    })

    it('translates known messages into French', () => {
        const frT = i18n.getFixedT('fr', 'auth')
        expect(translateApiErrorDetail('Wrong username, email or password.', frT)).toBe(
            "Nom d'utilisateur, e-mail ou mot de passe incorrect."
        )
    })

    it('translates known messages into Arabic', () => {
        const arT = i18n.getFixedT('ar', 'auth')
        expect(translateApiErrorDetail('Email already registered', arT)).toBe(
            'هذا البريد الإلكتروني مسجل بالفعل.'
        )
    })
})

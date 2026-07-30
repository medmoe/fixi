import {describe, expect, it} from 'vitest';
import {userPasswordSchema, userUpdateSchema} from './userSchema';

// ——————— Helpers —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const validUserPayload = {
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    location: 'New York, NY',
    profile_image_url: 'https://example.com/image.jpg',
}

const validPasswordPayload = {
    current_password: 'oldPass123!',
    new_password: 'NewPass1!',
    confirm_password: 'NewPass1!',
}

const parseUser = (data: unknown) => userUpdateSchema.safeParse(data)
const parsePassword = (data: unknown) => userPasswordSchema.safeParse(data)

// ——————— Name —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

describe('name', () => {
    it('accepts a valid name', () => {
        const result = parseUser({...validUserPayload, name: 'John Doe'})
        expect(result.success).toBe(true)
    })
    it('accepts name at minimum length of 2', () => {
        const result = parseUser({...validUserPayload, name: 'Jo'})
        expect(result.success).toBe(true)
    })
    it('accepts name at maximum length of 100', () => {
        const result = parseUser({...validUserPayload, name: 'a'.repeat(100)})
        expect(result.success).toBe(true)
    })
    it('rejects name shorter than 2 characters', () => {
        const result = parseUser({...validUserPayload, name: 'J'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Name must be at least 2 characters')
        }
    })
    it('rejects name longer than 100 characters', () => {
        const result = parseUser({...validUserPayload, name: 'a'.repeat(101)})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Name must be at most 100 characters')
        }
    })
    it('rejects empty string', () => {
        const result = parseUser({...validUserPayload, name: ''})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Name must be at least 2 characters')
        }
    })
})

// ——————— Username —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

describe('username', () => {
    it('accepts a valid username', () => {
        const result = parseUser({...validUserPayload, username: 'john_doe'})
        expect(result.success).toBe(true)
    })
    it('accepts username at minimum length of 3', () => {
        const result = parseUser({...validUserPayload, username: 'abc'})
        expect(result.success).toBe(true)
    })
    it('accepts username at maximum length of 20', () => {
        const result = parseUser({...validUserPayload, username: 'a'.repeat(20)})
        expect(result.success).toBe(true)
    })
    it('accepts username with numbers and underscores', () => {
        const result = parseUser({...validUserPayload, username: 'john_doe_123'})
        expect(result.success).toBe(true)
    })
    it('rejects username shorter than 3 characters', () => {
        const result = parseUser({...validUserPayload, username: 'ab'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Username must be at least 3 characters')
        }
    })
    it('rejects username longer than 20 characters', () => {
        const result = parseUser({...validUserPayload, username: 'a'.repeat(21)})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Username must be at most 20 characters')
        }
    })
    it('rejects username starting with a number', () => {
        const result = parseUser({...validUserPayload, username: '123john'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Username must start with a letter and contain only lowercase letters, numbers, or underscores')
        }
    })
    it('rejects username with uppercase letters', () => {
        const result = parseUser({...validUserPayload, username: 'JohnDoe'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Username must start with a letter and contain only lowercase letters, numbers, or underscores')
        }
    })
    it('rejects username with special characters', () => {
        const result = parseUser({...validUserPayload, username: 'john@doe'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Username must start with a letter and contain only lowercase letters, numbers, or underscores')
        }
    })
    it('rejects username with hyphens', () => {
        const result = parseUser({...validUserPayload, username: 'john-doe'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Username must start with a letter and contain only lowercase letters, numbers, or underscores')
        }
    })
    it('rejects empty string', () => {
        const result = parseUser({...validUserPayload, username: ''})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Username must be at least 3 characters')
        }
    })
})

// ——————— Email —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

describe('email', () => {
    it('accepts a valid email', () => {
        const result = parseUser({...validUserPayload, email: 'john@example.com'})
        expect(result.success).toBe(true)
    })
    it('accepts email with subdomain', () => {
        const result = parseUser({...validUserPayload, email: 'john@mail.example.com'})
        expect(result.success).toBe(true)
    })
    it('accepts email with plus sign', () => {
        const result = parseUser({...validUserPayload, email: 'john+doe@example.com'})
        expect(result.success).toBe(true)
    })
    it('rejects invalid email format', () => {
        const result = parseUser({...validUserPayload, email: 'not-an-email'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Invalid email address')
        }
    })
    it('rejects email without @ symbol', () => {
        const result = parseUser({...validUserPayload, email: 'johnexample.com'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Invalid email address')
        }
    })
    it('rejects email without domain', () => {
        const result = parseUser({...validUserPayload, email: 'john@'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Invalid email address')
        }
    })
    it('rejects empty string', () => {
        const result = parseUser({...validUserPayload, email: ''})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Invalid email address')
        }
    })
})

// ——————— Location —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

describe('location', () => {
    it('accepts a valid location', () => {
        const result = parseUser({...validUserPayload, location: 'New York, NY'})
        expect(result.success).toBe(true)
    })
    it('accepts location at maximum length of 200', () => {
        const result = parseUser({...validUserPayload, location: 'a'.repeat(200)})
        expect(result.success).toBe(true)
    })
    it('accepts empty string', () => {
        const result = parseUser({...validUserPayload, location: ''})
        expect(result.success).toBe(true)
    })
    it('accepts undefined', () => {
        const result = parseUser({...validUserPayload, location: undefined})
        expect(result.success).toBe(true)
    })
    it('accepts null', () => {
        const result = parseUser({...validUserPayload, location: null})
        expect(result.success).toBe(true)
    })
    it('rejects location longer than 200 characters', () => {
        const result = parseUser({...validUserPayload, location: 'a'.repeat(201)})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Location must be at most 200 characters')
        }
    })
})

// ——————— Profile Image URL —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

describe('profile_image_url', () => {
    it('accepts a valid URL', () => {
        const result = parseUser({...validUserPayload, profile_image_url: 'https://example.com/image.jpg'})
        expect(result.success).toBe(true)
    })
    it('accepts URL at maximum length of 500', () => {
        const url = 'http://example.com/'
        const result = parseUser({...validUserPayload, profile_image_url: url + 'a'.repeat(500 - url.length)})
        expect(result.success).toBe(true)
    })
    it('accepts empty string', () => {
        const result = parseUser({...validUserPayload, profile_image_url: ''})
        expect(result.success).toBe(true)
    })
    it('accepts undefined', () => {
        const result = parseUser({...validUserPayload, profile_image_url: undefined})
        expect(result.success).toBe(true)
    })
    it('accepts null', () => {
        const result = parseUser({...validUserPayload, profile_image_url: null})
        expect(result.success).toBe(true)
    })
    it('rejects invalid URL format', () => {
        const result = parseUser({...validUserPayload, profile_image_url: 'not-a-url'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Invalid URL')
        }
    })
    it('rejects URL longer than 500 characters', () => {
        const result = parseUser({...validUserPayload, profile_image_url: 'https://example.com/' + 'a'.repeat(484)})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('URL must be at most 500 characters')
        }
    })
})

// ─── Full User Update Schema ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('full user update schema', () => {
    it('accepts a fully valid payload', () => {
        const result = parseUser(validUserPayload)
        expect(result.success).toBe(true)
    })
    it('accepts payload with only required fields', () => {
        const result = parseUser({
            name: 'John Doe',
            username: 'john_doe',
            email: 'john@example.com',
        })
        expect(result.success).toBe(true)
    })
    it('parsed data shape matches expected output', () => {
        const result = parseUser(validUserPayload)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toMatchObject({
                name: 'John Doe',
                username: 'john_doe',
                email: 'john@example.com',
                location: 'New York, NY',
                profile_image_url: 'https://example.com/image.jpg',
            })
        }
    })
    it('rejects missing name', () => {
        const result = parseUser({
            username: 'john_doe',
            email: 'john@example.com',
        })
        expect(result.success).toBe(false)
    })
    it('rejects missing username', () => {
        const result = parseUser({
            name: 'John Doe',
            email: 'john@example.com',
        })
        expect(result.success).toBe(false)
    })
    it('rejects missing email', () => {
        const result = parseUser({
            name: 'John Doe',
            username: 'john_doe',
        })
        expect(result.success).toBe(false)
    })
})

// ─── Password Schema — Current Password ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('current_password', () => {
    it('accepts a valid current password', () => {
        const result = parsePassword({...validPasswordPayload, current_password: 'oldPass123!'})
        expect(result.success).toBe(true)
    })
    it('rejects empty string', () => {
        const result = parsePassword({...validPasswordPayload, current_password: ''})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Current password is required')
        }
    })
    it('rejects missing current_password', () => {
        const result = parsePassword({
            new_password: validPasswordPayload.new_password,
            confirm_password: validPasswordPayload.confirm_password,
        })
        expect(result.success).toBe(false)
    })
})

// ─── Password Schema — New Password ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('new_password', () => {
    it('accepts a valid new password', () => {
        const result = parsePassword({...validPasswordPayload, new_password: 'NewPass1!'})
        expect(result.success).toBe(true)
    })
    it('accepts password at minimum length of 8', () => {
        const result = parsePassword({
            ...validPasswordPayload, new_password: 'A1!aaaaa', confirm_password: 'A1!aaaaa'
        })
        expect(result.success).toBe(true)
    })
    it('accepts password at maximum length of 120', () => {
        const result = parsePassword({
            ...validPasswordPayload,
            new_password: 'A1!' + 'a'.repeat(117),
            confirm_password: 'A1!' + 'a'.repeat(117)
        })
        expect(result.success).toBe(true)
    })
    it('rejects password shorter than 8 characters', () => {
        const result = parsePassword({...validPasswordPayload, new_password: 'A1!aaaa'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Password must be at least 8 characters')
        }
    })
    it('rejects password longer than 120 characters', () => {
        const result = parsePassword({...validPasswordPayload, new_password: 'A1!' + 'a'.repeat(118)})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Password must be at most 120 characters')
        }
    })
    it('rejects password without a digit', () => {
        const result = parsePassword({...validPasswordPayload, new_password: 'NewPass!!'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Password must contain at least one digit')
        }
    })
    it('rejects password without a capital letter', () => {
        const result = parsePassword({...validPasswordPayload, new_password: 'newpass1!'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Password must contain at least one capital letter')
        }
    })
    it('rejects password without a special character', () => {
        const result = parsePassword({...validPasswordPayload, new_password: 'NewPass11'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Password must contain at least one special character')
        }
    })
    it('rejects empty string', () => {
        const result = parsePassword({...validPasswordPayload, new_password: ''})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Password must be at least 8 characters')
        }
    })
})

// ─── Password Schema — Confirm Password ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('confirm_password', () => {
    it('accepts matching confirm password', () => {
        const result = parsePassword({...validPasswordPayload, confirm_password: 'NewPass1!'})
        expect(result.success).toBe(true)
    })
    it('rejects empty string', () => {
        const result = parsePassword({...validPasswordPayload, confirm_password: ''})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Please confirm your new password')
        }
    })
    it('rejects non-matching confirm password', () => {
        const result = parsePassword({...validPasswordPayload, confirm_password: 'DifferentPass1!'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Passwords do not match')
        }
    })
})

// ─── Full Password Schema ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('full password schema', () => {
    it('accepts a fully valid payload', () => {
        const result = parsePassword(validPasswordPayload)
        expect(result.success).toBe(true)
    })
    it('parsed data shape matches expected output', () => {
        const result = parsePassword(validPasswordPayload)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toMatchObject({
                current_password: 'oldPass123!',
                new_password: 'NewPass1!',
                confirm_password: 'NewPass1!',
            })
        }
    })
    it('rejects when new_password does not match confirm_password', () => {
        const result = parsePassword({
            current_password: 'oldPass123!',
            new_password: 'NewPass1!',
            confirm_password: 'WrongPass1!',
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Passwords do not match')
        }
    })
})
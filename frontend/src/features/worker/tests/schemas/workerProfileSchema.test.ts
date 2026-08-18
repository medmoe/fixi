import {describe, it, expect} from 'vitest';
import {workerProfileSchema} from '../../schemas/workerProfileSchema.ts';

// ——————— Helpers —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const validPayload = {
    bio: 'Experienced plumber with 10 years of experience.',
    hourly_rate: 75.00,
    service_radius_km: 20,
    trades: [
        {trade_id: 1, skill_level: 'junior' as const}
    ]
}

const parse = (data: unknown) => workerProfileSchema.safeParse(data)

// ——————— bio —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

describe('bio', () => {
    it('accepts a valid bio string', () => {
        const result = parse({...validPayload, bio: 'Great plumber'})
        expect(result.success).toBe(true)
    })
    it('accepts empty string', () => {
        const result = parse({...validPayload, bio: ''})
        expect(result.success).toBe(true)
    })
    it('accepts undefined', () => {
        const result = parse({...validPayload, bio: undefined})
        expect(result.success).toBe(true)
    })
    it('accepts bio at exactly 500 characters', () => {
        const result = parse({...validPayload, bio: 'a'.repeat(500)})
        expect(result.success).toBe(true)
    })
    it('rejects bio longer than 500 characters', () => {
        const result = parse({...validPayload, bio: 'a'.repeat(501)})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Bio cannot exceed 500 characters')
        }
    })
})

// ——————— Hourly Rate —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

describe('hourly_rate', () => {
    it('accepts a valid positive number', () => {
        const result = parse({...validPayload, hourly_rate: 75.00})
        expect(result.success).toBe(true)
    })
    it('accepts a decimal rate', () => {
        const result = parse({...validPayload, hourly_rate: 75.01})
        expect(result.success).toBe(true)
    })
    it('accepts undefined', () => {
        const result = parse({...validPayload, hourly_rate: undefined})
        expect(result.success).toBe(true)
    })
    it('accepts empty string and treats it as undefined', () => {
        const result = parse({...validPayload, hourly_rate: ''})
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.hourly_rate).toBeUndefined()
        }
    })
    it('accepts numeric string and coerces it to a number', () => {
        const result = parse({...validPayload, hourly_rate: '75.00'})
        expect(result.success).toBe(true)
    })
    it('rejects zero', () => {
        const result = parse({...validPayload, hourly_rate: 0})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Hourly rate must be greater than 0')
        }
    })
    it('rejects negative numbers', () => {
        const result = parse({...validPayload, hourly_rate: -1})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Hourly rate must be greater than 0')
        }
    })
    it('rejects non-numeric strings', () => {
        const result = parse({...validPayload, hourly_rate: 'abc'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Invalid input: expected number, received NaN')
        }
    })
})

// ——————— Service Radius —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

describe('service_radius_km', () => {
    it('accepts a valid integer within range', () => {
        const result = parse({...validPayload, service_radius_km: 20})
        expect(result.success).toBe(true)
    })

    it('accepts minimum value of 1', () => {
        const result = parse({...validPayload, service_radius_km: 1})
        expect(result.success).toBe(true)
    })

    it('accepts maximum value of 500', () => {
        const result = parse({...validPayload, service_radius_km: 500})
        expect(result.success).toBe(true)
    })

    it('accepts undefined', () => {
        const result = parse({...validPayload, service_radius_km: undefined})
        expect(result.success).toBe(true)
    })

    it('accepts empty string and treats it as undefined', () => {
        const result = parse({...validPayload, service_radius_km: ''})
        expect(result.success).toBe(true)
    })

    it('accepts numeric string and coerces it to number', () => {
        const result = parse({...validPayload, service_radius_km: '20'})
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.service_radius_km).toBe(20)
        }
    })

    it('rejects 0', () => {
        const result = parse({...validPayload, service_radius_km: 0})
        expect(result.success).toBe(false)
    })

    it('rejects value below minimum', () => {
        const result = parse({...validPayload, service_radius_km: -1})
        expect(result.success).toBe(false)
    })

    it('rejects value above maximum', () => {
        const result = parse({...validPayload, service_radius_km: 501})
        expect(result.success).toBe(false)
    })

    it('rejects float value', () => {
        const result = parse({...validPayload, service_radius_km: 20.5})
        expect(result.success).toBe(false)
    })

    it('rejects non-numeric string', () => {
        const result = parse({...validPayload, service_radius_km: 'abc'})
        expect(result.success).toBe(false)
    })
})


// ─── Trades ───────────────────────────────────────────────────────────────────

describe('trades', () => {
    it('accepts an empty trades array', () => {
        const result = parse({...validPayload, trades: []})
        expect(result.success).toBe(true)
    })

    it('accepts exactly 5 trades', () => {
        const trades = Array.from({length: 5}, (_, i) => ({
            trade_id: i + 1,
            skill_level: 'junior' as const,
        }))
        const result = parse({...validPayload, trades})
        expect(result.success).toBe(true)
    })

    it('rejects more than 5 trades', () => {
        const trades = Array.from({length: 6}, (_, i) => ({
            trade_id: i + 1,
            skill_level: 'junior' as const,
        }))
        const result = parse({...validPayload, trades})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('You can select up to 5 trades maximum')
        }
    })

    it('accepts all valid skill levels', () => {
        const skillLevels = ['junior', 'mid', 'senior'] as const
        skillLevels.forEach((skill_level) => {
            const result = parse({
                ...validPayload,
                trades: [{trade_id: 1, skill_level}],
            })
            expect(result.success).toBe(true)
        })
    })

    it('rejects invalid skill level', () => {
        const result = parse({
            ...validPayload,
            trades: [{trade_id: 1, skill_level: 'expert'}],
        })
        expect(result.success).toBe(false)
    })

    it('rejects trade missing trade_id', () => {
        const result = parse({
            ...validPayload,
            trades: [{skill_level: 'junior'}],
        })
        expect(result.success).toBe(false)
    })

    it('rejects trade missing skill_level', () => {
        const result = parse({
            ...validPayload,
            trades: [{trade_id: 1}],
        })
        expect(result.success).toBe(false)
    })

    it('rejects non-integer trade_id', () => {
        const result = parse({
            ...validPayload,
            trades: [{trade_id: 1.5, skill_level: 'junior'}],
        })
        expect(result.success).toBe(false)
    })
})

// ─── Full Schema ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('full schema', () => {
    it('accepts a fully valid payload', () => {
        const result = parse(validPayload)
        expect(result.success).toBe(true)
    })

    it('accepts all optional fields omitted', () => {
        const result = parse({trades: []})
        expect(result.success).toBe(true)
    })

    it('accepts completely empty object', () => {
        const result = parse({})
        expect(result.success).toBe(true)
    })

    it('parsed data shape matches expected output', () => {
        const result = parse(validPayload)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toMatchObject({
                bio: 'Experienced plumber with 10 years of experience.',
                hourly_rate: 75.00,
                service_radius_km: 20,
                trades: [{trade_id: 1, skill_level: 'junior'}],
            })
        }
    })

    it('coerces string numbers in full payload', () => {
        const result = parse({
            ...validPayload,
            hourly_rate: '75.00',
            service_radius_km: '20',
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(typeof result.data.hourly_rate).toBe('number')
            expect(typeof result.data.service_radius_km).toBe('number')
        }
    })
})

import {describe, expect, it} from 'vitest';
import {loginSchema, registerSchema} from '../authSchema';

// ——————— Helpers —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
const validRegisterPayload = {
    name: "John Doe",
    username: "johndoe",
    email: "johndoe@example.com",
    password: "Secure123**",
    role_type: "worker",
}
const validLoginPayload = {
    username_or_email: "johndoe",
    password: "Secure123**",
}
const registerParse = (data: unknown) => registerSchema.safeParse(data)
const loginParse = (data: unknown) => loginSchema.safeParse(data)

describe("Auth schema", () => {
    // ——————— Register schema —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
    describe("Register schema", () => {
        // ——————— name —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
        it("accepts a valid name string", () => {
            const result = registerParse({...validRegisterPayload, name: "John Doe"})
            expect(result.success).toBe(true)
        })
        it("rejects a string with less than 2 characters", () => {
            const result = registerParse({...validRegisterPayload, name: "J"})
            expect(result.success).toBe(false)
        })

        // ——————— username —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
        it("accepts a valid username string", () => {
            const result = registerParse({...validRegisterPayload, username: "john_doe"})
            expect(result.success).toBe(true)
        })
        it("rejects a string with less than 3 characters", () => {
            const result = registerParse({...validRegisterPayload, username: "jo"})
            expect(result.success).toBe(false)
        })
        it("rejects a string with more than 20 characters", () => {
            const result = registerParse({...validRegisterPayload, username: "john_doe_john_doe_john_doe_john_doe"})
            expect(result.success).toBe(false)
        })
        it("rejects a string that does not start with a letter", () => {
            const result = registerParse({...validRegisterPayload, username: "123john"})
            expect(result.success).toBe(false)
        })
        it("rejects a string that contains upper case letters", () => {
            const result = registerParse({...validRegisterPayload, username: "John"})
            expect(result.success).toBe(false)
        })
        it("rejects a string that contains special characters", () => {
            const result = registerParse({...validRegisterPayload, username: "john_doe!"})
            expect(result.success).toBe(false)
        })

        // ——————— email —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
        it("accepts a valid email string", () => {
            const result = registerParse({...validRegisterPayload, email: "john.doe@example.com"})
            expect(result.success).toBe(true)
        })
        it("rejects an invalid email string", () => {
            const result = registerParse({...validRegisterPayload, email: "john.doe"})
            expect(result.success).toBe(false)
        })

        // ——————— password —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
        it("accepts a valid password string", () => {
            const result = registerParse({...validRegisterPayload, password: "P@ssword123!"})
            expect(result.success).toBe(true)
        })
        it("rejects a string that is less than 8 characters", () => {
            const result = registerParse({...validRegisterPayload, password: "pass123"})
            expect(result.success).toBe(false)
        })
        it("rejects a string that is greater than 120 characters", () => {
            const result = registerParse({...validRegisterPayload, password: "P@ssword123!".repeat(11)})
            expect(result.success).toBe(false)
        })
        it("rejects a string that does not contain digits", () => {
            const result = registerParse({...validRegisterPayload, password: "P@sswordddd"})
            expect(result.success).toBe(false)
        })
        it("rejects a string that does not contain capital letters", () => {
            const result = registerParse({...validRegisterPayload, password: "p@ssword123"})
            expect(result.success).toBe(false)
        })
        it("rejects a string that does not contain special characters", () => {
            const result = registerParse({...validRegisterPayload, password: "Password1234"})
            expect(result.success).toBe(false)
        })

        // ——————— role type —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
        it("accepts a worker role type", () => {
            const result = registerParse({...validRegisterPayload, role_type: "worker"})
            expect(result.success).toBe(true)
        })
        it("accepts a customer role type", () => {
            const result = registerParse({...validRegisterPayload, role_type: "customer"})
            expect(result.success).toBe(true)
        })
        it("rejects an invalid role type", () => {
            const result = registerParse({...validRegisterPayload, role_type: "invalid"})
            expect(result.success).toBe(false)
        })
    })

    // ——————— Login schema —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
    describe("Login schema", () => {

        // ——————— username or email —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
        it("accepts a valid username or email", () => {
            const result = loginParse({...validLoginPayload})
            expect(result.success).toBe(true)
        })
        it("rejects empty string", () => {
            const result = loginParse({...validLoginPayload, username_or_email: ""})
            expect(result.success).toBe(false)
        })

        // ——————— password —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
        it("accepts a valid password", () => {
            const result = loginParse({...validLoginPayload})
            expect(result.success).toBe(true)
        })
        it("rejects empty string", () => {
            const result = loginParse({...validLoginPayload, password: ""})
            expect(result.success).toBe(false)
        })
    })
})


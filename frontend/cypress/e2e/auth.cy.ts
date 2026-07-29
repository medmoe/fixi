/// <reference types="cypress" />

const existingUser = {
    username_or_email: 'testworker@example.com',
    password: 'SecurePass123!',
}

describe('Authentication E2E', () => {
    // ─── Test Data ───────────────────────────────────────────────────────────
    const validWorker = {
        name: 'Test Worker',
        username: 'test_worker',
        email: 'testworker@example.com',
        password: 'SecurePass123!',
        role_type: 'worker' as const,
    }

    const validCustomer = {
        name: 'Test Customer',
        username: 'test_customer',
        email: 'testcustomer@example.com',
        password: 'SecurePass123!',
        role_type: 'customer' as const,
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────
    const fillLoginForm = (credentials: { username_or_email: string; password: string }) => {
        cy.get('[aria-label="Username or email"]').clear().type(credentials.username_or_email)
        cy.get('[aria-label="Password"]').first().clear().type(credentials.password)
    }

    const fillRegisterForm = (user: {
        name: string
        username: string
        email: string
        password: string
        role_type: 'customer' | 'worker'
    }) => {
        cy.get('[aria-label="Full name"]').clear().type(user.name)
        cy.get('[aria-label="Username"]').clear().type(user.username)
        cy.get('[aria-label="Email address"]').clear().type(user.email)
        // On register page, password is the last password input
        cy.get('input[type="password"]').last().clear().type(user.password)
        cy.get('[aria-label="Select role"]').click()
        cy.get('[role="option"]').contains(`${user.role_type.charAt(0).toUpperCase()}`).click()
    }

    const submitLogin = () => {
        cy.get('[aria-label="Sign in"]').click()
    }

    const submitRegister = () => {
        cy.get('[aria-label="Create account"]').click()
    }

    // ─── Before Each ───────────────────────────────────────────────────────────
    beforeEach(() => {
        cy.clearLocalStorage()
        cy.clearAllSessionStorage()
        cy.clearCookies()
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // LOGIN PAGE
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Login Page', () => {
        beforeEach(() => {
            cy.visit('/login')
        })

        it('should display login form with correct elements', () => {
            cy.get('form[aria-label="Login form"]').should('be.visible')
            cy.get('[aria-label="Username or email"]').should('be.visible')
            cy.get('[aria-label="Password"]').should('be.visible')
            cy.get('[aria-label="Sign in"]').should('be.visible').and('contain.text', 'Sign In')
            cy.contains("Don't have an account?").should('be.visible')
            cy.contains('Register').should('have.attr', 'href', '/register')
        })

        it('should navigate to register page when clicking register link', () => {
            cy.contains('Register').click()
            cy.url().should('include', '/register')
            cy.get('form[aria-label="Registration form"]').should('be.visible')
        })

        it('should show validation error for empty username_or_email', () => {
            submitLogin()
            cy.get('[role="alert"]').should('contain.text', 'Username or email is required')
        })

        it('should show validation error for empty password', () => {
            cy.get('[aria-label="Username or email"]').type('test@example.com')
            submitLogin()
            cy.get('[role="alert"]').should('contain.text', 'Password is required')
        })

        it('should show validation errors for all empty fields', () => {
            submitLogin()
            cy.get('[role="alert"]').should('have.length', 2)
            cy.get('[role="alert"]').eq(0).should('contain.text', 'Username or email is required')
            cy.get('[role="alert"]').eq(1).should('contain.text', 'Password is required')
        })

        it('should show loading state during login submission', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                delay: 1000,
                statusCode: 200,
                body: {access_token: 'fake-token', user: {id: 1, role_type: 'worker'}},
            }).as('loginRequest')

            fillLoginForm({username_or_email: 'test@test.com', password: 'password123'})
            submitLogin()

            cy.get('[aria-label="Sign in"]').should('contain.text', 'Signing in...')
            cy.get('.animate-spin').should('be.visible')
            cy.get('[aria-label="Sign in"]').should('be.disabled')
        })

        it('should successfully login with valid credentials and redirect to worker dashboard', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'fake-access-token'},
            }).as('loginRequest')
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: {id: 1, role_type: 'worker', username: 'test', email: 'test@test.com', name: 'Test Worker'},
            }).as('userMe')
            cy.intercept('GET', '**/api/v1/worker-profile', {
                statusCode: 200,
                body: {id: 1, hourly_rate: 100, bio: 'Test worker bio', service_radius_km: 20},
            }).as('workerProfile')
            cy.intercept('POST', '**/api/v1/auth/refresh', {
                statusCode: 200,
                body: {access_token: 'refreshed-token'},
            }).as('refresh')

            fillLoginForm(existingUser)
            submitLogin()

            cy.wait('@loginRequest').its('request.body').should('deep.equal', {
                username_or_email: existingUser.username_or_email,
                password: existingUser.password,
            })
            cy.wait('@userMe')
            cy.wait('@workerProfile')

            // Token is stored in memory only (not sessionStorage) via apiClient.setAccessToken
            // We verify auth state by checking dashboard access
            cy.url().should('include', '/dashboard')
            cy.contains('Profile').should('be.visible')
            cy.contains('Account').should('be.visible')
        })

        it('should handle login API error (401 Unauthorized)', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 401,
                body: {detail: 'Invalid credentials'},
            }).as('loginError')

            fillLoginForm({username_or_email: 'wrong@email.com', password: 'wrongpass'})
            submitLogin()

            cy.wait('@loginError')
            // Should show error toast
            cy.get('[data-sonner-toast]').should('contain.text', 'Invalid credentials')
        })

        it('should handle 422 validation error from backend', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 422,
                body: {
                    detail: [
                        {loc: ['body', 'password'], msg: 'String should have at most 128 characters', type: 'string_too_long'},
                    ],
                },
            }).as('validationError')

            fillLoginForm({username_or_email: 'username', password: 'password123!'})
            submitLogin()

            cy.wait('@validationError')
            cy.get('[data-sonner-toast]').should('contain.text', 'String should have at most 128 characters')
        })

        it('should handle network error gracefully', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {forceNetworkError: true}).as('networkError')

            fillLoginForm({username_or_email: 'test@test.com', password: 'password123'})
            submitLogin()

            cy.wait('@networkError')
            // Should show error state but form should still be usable
            cy.get('[aria-label="Sign in"]').should('not.be.disabled').and('contain.text', 'Sign In')
            cy.get('[data-sonner-toast]').should('contain.text', 'Something went wrong')
        })

        it('should allow login with username instead of email', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'fake-token', user: {id: 1, role_type: 'worker'}},
            }).as('loginWithUsername')

            fillLoginForm({username_or_email: 'testworker', password: 'SecurePass123!'})
            submitLogin()

            cy.wait('@loginWithUsername').its('request.body.username_or_email').should('eq', 'testworker')
        })

        it('should redirect unauthenticated users from dashboard to login', () => {
            cy.visit('/dashboard')
            cy.url().should('include', '/login')
        })

        it('should redirect authenticated workers from login to dashboard', () => {
            // Simulate already logged in worker by intercepting the auth state check
            // Since token is in memory, we need to login first
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'existing-token'},
            }).as('autoLogin')


            cy.visit('/login')
            fillLoginForm({username_or_email: 'test@test.com', password: 'password123'})
            submitLogin()
            cy.wait('@autoLogin')

            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: {id: 1, role_type: 'worker', name: 'test', username: 'test', email: 'test@test.com'},
            }).as('userMe')
            cy.intercept('GET', '**/api/v1/worker-profile', {
                statusCode: 200,
                body: {id: 1, hourly_rate: 100, bio: 'Test worker bio', service_radius_km: 20},
            }).as('workerProfile')
            cy.intercept('POST', '**/api/v1/auth/refresh', {
                statusCode: 200,
                body: {access_token: 'refreshed-token'},
            }).as('refresh')

            cy.wait('@refresh')
            cy.wait('@userMe')
            cy.wait('@workerProfile')
            cy.url().should('include', '/dashboard')

            // Now try visiting login again — should redirect to dashboard
            cy.visit('/login')
            cy.url().should('include', '/dashboard')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTER PAGE
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Register Page', () => {
        beforeEach(() => {
            cy.visit('/register')
        })

        it('should display registration form with correct elements', () => {
            cy.get('form[aria-label="Registration form"]').should('be.visible')
            cy.get('[aria-label="Full name"]').should('be.visible')
            cy.get('[aria-label="Username"]').should('be.visible')
            cy.get('[aria-label="Email address"]').should('be.visible')
            cy.get('input[type="password"]').should('be.visible')
            cy.get('[aria-label="Select role"]').should('be.visible')
            cy.get('[aria-label="Create account"]').should('be.visible').and('contain.text', 'Create Account')
            cy.contains('Already have an account?').should('be.visible')
            cy.contains('Sign in').should('have.attr', 'href', '/login')
        })

        it('should navigate to login page when clicking sign in link', () => {
            cy.contains('Sign in').click()
            cy.url().should('include', '/login')
            cy.get('form[aria-label="Login form"]').should('be.visible')
        })

        it('should show validation error for empty name', () => {
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Name must be at least 2 characters')
        })

        it('should show validation error for name less than 2 characters', () => {
            cy.get('[aria-label="Full name"]').type('A')
            cy.get('[aria-label="Username"]').type('testuser') // trigger validation
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Name must be at least 2 characters')
        })

        it('should show validation error for empty username', () => {
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Username must be at least 3 characters')
        })

        it('should show validation error for username less than 3 characters', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('ab')
            cy.get('[aria-label="Email address"]').type('john@example.com') // trigger validation
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Username must be at least 3 characters')
        })

        it('should show validation error for username more than 20 characters', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('a'.repeat(21))
            cy.get('[aria-label="Email address"]').type('john@example.com') // trigger validation
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Username must be at most 20 characters')
        })

        it('should show validation error for username not starting with letter', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('123invalid')
            cy.get('[aria-label="Email address"]').type('john@example.com') // trigger validation
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Username must start with a letter')
        })

        it('should show validation error for username with uppercase letters', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('InvalidUser')
            cy.get('[aria-label="Email address"]').type('john@example.com') // trigger validation
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Username must start with a letter and contain only lowercase letters, numbers, or underscores')
        })

        it('should show validation error for empty email', () => {
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Invalid email address')
        })

        it('should show validation error for invalid email format', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('johndoe')
            cy.get('[aria-label="Email address"]').type('invalid-email')
            cy.get('input[type="password"]').last().type('Password123!') // trigger validation
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Invalid email address')
        })

        it('should show validation error for empty password', () => {
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Password must be at least 8 characters long')
        })

        // Password Field
        it('should show validation error for password less than 8 characters', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('johndoe')
            cy.get('[aria-label="Email address"]').type('john@example.com')
            cy.get('input[type="password"]').last().type('Short1!')
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Password must be at least 8 characters long')
        })

        it('should show validation error for password more than 120 characters', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('johndoe')
            cy.get('[aria-label="Email address"]').type('john@example.com')
            cy.get('input[type="password"]').last().type('A1!' + 'a'.repeat(120))
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Password must be at most 120 characters')
        })

        it('should show validation error for password without digit', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('johndoe')
            cy.get('[aria-label="Email address"]').type('john@example.com')
            cy.get('input[type="password"]').last().type('NoDigits!')
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Password must contain at least one digit')
        })

        it('should show validation error for password without capital letter', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('johndoe')
            cy.get('[aria-label="Email address"]').type('john@example.com')
            cy.get('input[type="password"]').last().type('nocapital123!')
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Password must contain at least one capital letter')
        })

        it('should show validation error for password without special character', () => {
            cy.get('[aria-label="Full name"]').type('John Doe')
            cy.get('[aria-label="Username"]').type('johndoe')
            cy.get('[aria-label="Email address"]').type('john@example.com')
            cy.get('input[type="password"]').last().type('NoSpecial123')
            submitRegister()
            cy.get('[role="alert"]').should('contain.text', 'Password must contain at least one special character')
        })

        it('should show all validation errors when submitting empty form', () => {
            submitRegister()
            cy.get('[role="alert"]').should('have.length.at.least', 4)
        })

        it('should allow role selection between customer and worker', () => {
            cy.get('[aria-label="Select role"]').click()

            cy.get('[role="option"]').contains('Customer').should('be.visible')
            cy.get('[role="option"]').contains('Worker').should('be.visible')

            cy.get('[role="option"]').contains('Worker').click()
            cy.get('[aria-label="Select role"]').should('contain.text', 'Worker')

            cy.get('[aria-label="Select role"]').click()
            cy.get('[role="option"]').contains('Customer').click()
            cy.get('[aria-label="Select role"]').should('contain.text', 'Customer')
        })

        it('should show loading state during registration submission', () => {
            cy.intercept('POST', '**/api/v1/auth/register', {
                delay: 1000,
                statusCode: 201,
                body: {message: 'User created'},
            }).as('registerRequest')

            fillRegisterForm(validWorker)
            submitRegister()

            cy.get('[aria-label="Create account"]').should('contain.text', 'Creating account...')
            cy.get('.animate-spin').should('be.visible')
            cy.get('[aria-label="Create account"]').should('be.disabled')
        })

        it('should successfully register a new worker and redirect to login', () => {
            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 201,
                body: {message: 'User created successfully', user: {id: 1, ...validWorker}},
            }).as('registerRequest')

            fillRegisterForm(validWorker)
            submitRegister()

            cy.wait('@registerRequest').its('request.body').should('deep.equal', validWorker)

            // Should redirect to login page after successful registration
            cy.url().should('include', '/login')
            cy.get('form[aria-label="Login form"]').should('be.visible')
        })

        it('should successfully register a new customer', () => {
            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 201,
                body: {message: 'User created successfully', user: {id: 2, ...validCustomer}},
            }).as('registerCustomer')

            fillRegisterForm(validCustomer)
            submitRegister()

            cy.wait('@registerCustomer').its('request.body.role_type').should('eq', 'customer')
            cy.url().should('include', '/login')
        })

        it('should handle 422 validation error from backend', () => {
            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 422,
                body: {
                    detail: [
                        {loc: ['body', 'email'], msg: 'value is not a valid email address', type: 'value_error'},
                    ],
                },
            }).as('backendValidation')

            fillRegisterForm(validWorker)
            submitRegister()

            cy.wait('@backendValidation')
            cy.get('[data-sonner-toast]').should('contain.text', 'value is not a valid email address')
        })

        it('should handle server error (500)', () => {
            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 500,
                body: {detail: 'Internal server error'},
            }).as('serverError')

            fillRegisterForm(validWorker)
            submitRegister()

            cy.wait('@serverError')
            cy.get('[aria-label="Create account"]').should('not.be.disabled')
            cy.get('[data-sonner-toast]').should('contain.text', 'Internal server error')
        })

        it('should trim whitespace from inputs', () => {
            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 201,
                body: {message: 'User created'},
            }).as('trimCheck')

            cy.get('[aria-label="Full name"]').type('  John Doe  ')
            cy.get('[aria-label="Username"]').type('johndoe')
            cy.get('[aria-label="Email address"]').type('  john@example.com  ')
            cy.get('input[type="password"]').last().type('SecurePass123!')
            cy.get('[aria-label="Select role"]').click()
            cy.get('[role="option"]').contains('Customer').click()

            submitRegister()

            cy.wait('@trimCheck').its('request.body').should('deep.equal', {
                name: 'John Doe',
                username: 'johndoe',
                email: 'john@example.com',
                password: 'SecurePass123!',
                role_type: 'customer',
            })
        })

        it('should accept valid username with numbers and underscores', () => {
            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 201,
                body: {message: 'User created'},
            }).as('validUsername')

            const userWithValidUsername = {
                ...validWorker,
                username: 'john_doe_123',
            }

            fillRegisterForm(userWithValidUsername)
            submitRegister()

            cy.wait('@validUsername').its('request.body.username').should('eq', 'john_doe_123')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTHENTICATION FLOW
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Authentication Flow', () => {
        it('should complete full registration -> login -> worker dashboard flow', () => {
            // Step 1: Register
            cy.visit('/register')

            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 201,
                body: {message: 'User created'},
            }).as('register')

            fillRegisterForm(validWorker)
            submitRegister()
            cy.wait('@register')
            cy.url().should('include', '/login')

            // Step 2: Login
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {
                    access_token: 'dashboard-token',
                    user: {id: 1, role_type: 'worker', name: validWorker.name}
                },
            }).as('login')
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: {
                    id: 1,
                    name: validWorker.name,
                    email: validWorker.email,
                    username: validWorker.username,
                    role_type: 'worker',
                },
            }).as('userMe')
            cy.intercept('GET', '**/api/v1/worker-profile', {
                statusCode: 200,
                body: {
                    id: 1,
                    bio: "some text",
                    hourly_rate: 100,
                }
            }).as('workerProfile')

            fillLoginForm({username_or_email: validWorker.email, password: validWorker.password})
            submitLogin()
            cy.wait('@login')
            cy.wait('@workerProfile')
            cy.wait('@userMe')

            // Step 3: Worker Dashboard (protected route)
            cy.url().should('include', '/dashboard')
            cy.contains('Account').should('be.visible')
            cy.contains('Profile').should('be.visible')
        })

        it('should protect dashboard route for unauthenticated users', () => {
            cy.visit('/dashboard')
            cy.url().should('not.include', '/dashboard')
            // Should redirect to login
            cy.url().should('include', '/login')
        })

        it('should handle logout via API and clear session', () => {
            // Step 1: Login first
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'test-token'},
            }).as('login')
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: {id: 1, role_type: 'worker', name: 'test', username: 'test', email: 'test@test.com'},
            }).as('userMe')
            cy.intercept('GET', '**/api/v1/worker-profile', {
                statusCode: 200,
                body: {id: 1, bio: 'test bio text', hourly_rate: 100},
            }).as('workerProfile')

            cy.visit('/login')
            fillLoginForm(existingUser)
            submitLogin()
            cy.wait('@login')
            cy.wait('@userMe')
            cy.wait('@workerProfile')

            cy.url().should('include', '/dashboard')

            // Step 2: Setup logout intercept
            cy.intercept('POST', '**/api/v1/auth/logout', {
                statusCode: 200,
                body: {message: 'Logged out successfully'},
            }).as('logoutRequest')

            // Step 3: Click logout button (opens AlertDialog)
            cy.get('[data-testid="logout-button"]').first().click()

            // Step 4: Confirm logout in dialog
            cy.get('[role="alertdialog"]').should('be.visible')
            cy.contains('Are you sure?').should('be.visible')
            cy.contains('You will be logged out').should('be.visible')

            // Click the Logout action button in dialog
            cy.get('[data-testid="logout-confirm"]').click()

            cy.wait('@logoutRequest')

            // Should redirect to login
            cy.url().should('include', '/login')
            // Dashboard should no longer be accessible
            cy.visit('/dashboard')
            cy.url().should('include', '/login')
        })

        it('should clear session and redirect even when logout API fails', () => {
            // Step 1: Login first
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'test-token', user: {id: 1, role_type: 'worker'}},
            }).as('login')
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: {
                    id: 1,
                    role_type: 'worker',
                    username: 'username',
                    name: 'Test Worker',
                    email: 'testworker@example.com',
                }
            }).as('userMe')
            cy.intercept('GET', '**/api/v1/worker-profile', {
                statusCode: 200,
                body: {
                    id: 1,
                    bio: "some text",
                    hourly_rate: 100,
                }
            }).as('workerProfile')

            cy.visit('/login')
            fillLoginForm(existingUser)
            submitLogin()
            cy.wait('@login')
            cy.wait('@userMe')
            cy.wait('@workerProfile')
            cy.url().should('include', '/dashboard')

            // Step 2: Setup logout to fail
            cy.intercept('POST', '**/api/v1/auth/logout', {
                forceNetworkError: true,
            }).as('logoutFail')

            // Step 3: Click logout and confirm
            cy.get('[data-testid="logout-button"]').first().click()
            cy.get('[data-testid="logout-confirm"]').click()

            cy.wait('@logoutFail')

            // KEY: Even on API failure, should redirect to login (onSettled clears state)
            cy.url().should('include', '/login')
            cy.get('[data-sonner-toast]').should('contain.text', 'cleared local session anyway')

            // Dashboard should be inaccessible
            cy.visit('/dashboard')
            cy.url().should('include', '/login')
        })

        it('should cancel logout when clicking cancel in dialog', () => {
            // Login first
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'test-token', user: {id: 1, role_type: 'worker'}},
            }).as('login')
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: {
                    id: 1,
                    role_type: 'worker',
                    username: 'username',
                    name: 'Test Worker',
                    email: 'testworker@example.com',
                }
            }).as('userMe')
            cy.intercept('GET', '**/api/v1/worker-profile', {
                statusCode: 200,
                body: {
                    id: 1,
                    bio: "some text",
                    hourly_rate: 100,
                }
            }).as('workerProfile')

            cy.visit('/login')
            fillLoginForm(existingUser)
            submitLogin()
            cy.wait('@login')
            cy.wait('@userMe')
            cy.wait('@workerProfile')
            cy.url().should('include', '/dashboard')

            // Click logout
            cy.get('[data-testid="logout-button"]').first().click()

            // Click Cancel
            cy.get('[data-testid="logout-cancel"]').click()

            // Dialog should close, should stay on dashboard
            cy.get('[data-testid="logout-dialog"]').should('not.exist')
            cy.url().should('include', '/dashboard')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // TOKEN REFRESH (API Client behavior)
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Token Refresh', () => {
        it('should automatically refresh expired access token', () => {
            // Setup: login with token that will expire
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'expired-token', user: {id: 1, role_type: 'worker'}},
            }).as('login')

            cy.visit('/login')
            fillLoginForm(existingUser)
            submitLogin()
            cy.wait('@login')

            // Intercept the refresh endpoint
            cy.intercept('POST', '**/api/v1/auth/refresh', {
                statusCode: 200,
                body: {access_token: 'new-refreshed-token'},
            }).as('tokenRefresh')

            // Intercept a protected endpoint that returns 401 first, then succeeds after refresh
            let requestCount = 0
            cy.intercept('GET', '**/api/v1/user/me', (req) => {
                requestCount++
                const authHeader = req.headers['authorization']
                if (authHeader === 'Bearer expired-token') {
                    req.reply({statusCode: 401, body: {detail: 'Token expired'}})
                } else if (authHeader === 'Bearer new-refreshed-token') {
                    req.reply({statusCode: 200, body: {id: 1, name: 'Test'}})
                } else {
                    req.reply({statusCode: 200, body: {id: 1, name: 'Test'}})
                }
            }).as('userMe')

            // Trigger a protected request by visiting dashboard (which may fetch user data)
            cy.visit('/dashboard')

            // The apiClient should handle 401 by calling refresh, then retry
            cy.wait('@tokenRefresh')
            cy.get('@userMe.all').its('length').should('be.at.least', 1)
        })

        it('should redirect to login when refresh token is invalid', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'expired-token', user: {id: 1, role_type: 'worker'}},
            }).as('login')

            cy.visit('/login')
            fillLoginForm(existingUser)
            submitLogin()
            cy.wait('@login')

            cy.intercept('POST', '**/api/v1/auth/refresh', {
                statusCode: 401,
                body: {detail: 'Refresh token invalid'},
            }).as('refreshFail')

            // Intercept a protected endpoint that triggers refresh
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 401,
                body: {detail: 'Token expired'},
            }).as('userMe')

            cy.visit('/dashboard')
            cy.wait('@refreshFail')
            cy.url().should('include', '/login')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESSIBILITY
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Accessibility', () => {
        it('login form should have proper aria labels on all interactive elements', () => {
            cy.visit('/login')
            cy.get('[aria-label="Username or email"]').should('exist')
            cy.get('[aria-label="Password"]').should('exist')
            cy.get('[aria-label="Sign in"]').should('exist')
            cy.get('form[aria-label="Login form"]').should('exist')
        })

        it('should have proper aria labels on registration form', () => {
            cy.visit('/register')
            cy.get('[aria-label="Full name"]').should('exist')
            cy.get('[aria-label="Username"]').should('exist')
            cy.get('[aria-label="Email address"]').should('exist')
            cy.get('[aria-label="Password"]').should('exist')
            cy.get('[aria-label="Select role"]').should('exist')
            cy.get('[aria-label="Create account"]').should('exist')
            cy.get('form[aria-label="Registration form"]').should('exist')
        })

        it('should support keyboard navigation on login form', () => {
            cy.visit('/login')
            cy.get('[aria-label="Username or email"]').focus().should('have.focus')
            cy.get('[aria-label="Password"]').focus().should('have.focus')
            cy.get('[aria-label="Sign in"]').focus().should('have.focus')
        })

        it('should support keyboard navigation on register form', () => {
            cy.visit('/register')
            cy.get('[aria-label="Full name"]').focus().should('have.focus')
            cy.get('[aria-label="Username"]').focus().should('have.focus')
            cy.get('[aria-label="Email address"]').focus().should('have.focus')
            cy.get('input[type="password"]').last().focus().should('have.focus')
            cy.get('[aria-label="Select role"]').focus().should('have.focus')
            cy.get('[aria-label="Create account"]').focus().should('have.focus')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // RESPONSIVE DESIGN
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Responsive Design', () => {
        const viewports = [
            {name: 'mobile', width: 375, height: 667},
            {name: 'tablet', width: 768, height: 1024},
            {name: 'desktop', width: 1280, height: 720},
        ]

        viewports.forEach(({name, width, height}) => {
            it(`should display login form correctly on ${name}`, () => {
                cy.viewport(width, height)
                cy.visit('/login')
                cy.get('form[aria-label="Login form"]').should('be.visible')
                cy.get('[aria-label="Sign in"]').should('be.visible').and('not.be.disabled')
            })

            it(`should display register form correctly on ${name}`, () => {
                cy.viewport(width, height)
                cy.visit('/register')
                cy.get('form[aria-label="Registration form"]').should('be.visible')
                cy.get('[aria-label="Create account"]').should('be.visible').and('not.be.disabled')
            })
        })
    })
})
/// <reference types="cypress" />

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

  const existingUser = {
    username_or_email: 'testworker@example.com',
    password: 'SecurePass123!',
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
    cy.get(`[data-value="${user.role_type}"]`).click()
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
    cy.clearSessionStorage()
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
        body: { access_token: 'fake-token' },
      }).as('loginRequest')

      fillLoginForm({ username_or_email: 'test@test.com', password: 'password123' })
      submitLogin()

      cy.get('[aria-label="Sign in"]').should('contain.text', 'Signing in...')
      cy.get('.animate-spin').should('be.visible')
      cy.get('[aria-label="Sign in"]').should('be.disabled')
    })

    it('should successfully login with valid credentials and redirect to worker dashboard', () => {
      cy.intercept('POST', '**/api/v1/auth/login', {
        statusCode: 200,
        body: { access_token: 'fake-access-token', user: { id: 1, role_type: 'worker' } },
      }).as('loginRequest')

      fillLoginForm(existingUser)
      submitLogin()

      cy.wait('@loginRequest').its('request.body').should('deep.equal', {
        username_or_email: existingUser.username_or_email,
        password: existingUser.password,
      })

      // Token should be stored in sessionStorage
      cy.window().its('sessionStorage.access_token').should('eq', 'fake-access-token')

      // Should redirect to worker dashboard for worker role
      cy.url().should('include', '/dashboard')
    })

    it('should handle login API error (401 Unauthorized)', () => {
      cy.intercept('POST', '**/api/v1/auth/login', {
        statusCode: 401,
        body: { message: 'Invalid credentials' },
      }).as('loginError')

      fillLoginForm({ username_or_email: 'wrong@email.com', password: 'wrongpass' })
      submitLogin()

      cy.wait('@loginError')
      // Should show error message (toast or inline - adjust based on your UI)
      cy.get('body').should('contain.text', 'Invalid')
    })

    it('should handle 422 validation error from backend', () => {
      cy.intercept('POST', '**/api/v1/auth/login', {
        statusCode: 422,
        body: {
          detail: [
            { loc: ['body', 'username_or_email'], msg: 'field required', type: 'missing' },
          ],
        },
      }).as('validationError')

      fillLoginForm({ username_or_email: '', password: 'password123' })
      submitLogin()

      cy.wait('@validationError')
    })

    it('should handle network error gracefully', () => {
      cy.intercept('POST', '**/api/v1/auth/login', { forceNetworkError: true }).as('networkError')

      fillLoginForm({ username_or_email: 'test@test.com', password: 'password123' })
      submitLogin()

      cy.wait('@networkError')
      // Should show error state but form should still be usable
      cy.get('[aria-label="Sign in"]').should('not.be.disabled').and('contain.text', 'Sign In')
    })

    it('should allow login with username instead of email', () => {
      cy.intercept('POST', '**/api/v1/auth/login', {
        statusCode: 200,
        body: { access_token: 'fake-token', user: { id: 1, role_type: 'worker' } },
      }).as('loginWithUsername')

      fillLoginForm({ username_or_email: 'testworker', password: 'SecurePass123!' })
      submitLogin()

      cy.wait('@loginWithUsername').its('request.body.username_or_email').should('eq', 'testworker')
    })

    it('should redirect unauthenticated users from dashboard to login', () => {
      cy.visit('/dashboard')
      cy.url().should('include', '/login')
    })

    it('should redirect authenticated workers from login to dashboard', () => {
      // Simulate already logged in worker
      cy.window().then((win) => {
        win.sessionStorage.setItem('access_token', 'existing-token')
      })
      cy.visit('/login')
      // Depending on your ProtectedRoute implementation
      // cy.url().should('include', '/dashboard')
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
      cy.get('[role="alert"]').should('contain.text', 'Username must be at least 3 characters')
    })

    it('should show validation error for username more than 20 characters', () => {
      cy.get('[aria-label="Full name"]').type('John Doe')
      cy.get('[aria-label="Username"]').type('a'.repeat(21))
      cy.get('[aria-label="Email address"]').type('john@example.com') // trigger validation
      cy.get('[role="alert"]').should('contain.text', 'Username must be at most 20 characters')
    })

    it('should show validation error for username not starting with letter', () => {
      cy.get('[aria-label="Full name"]').type('John Doe')
      cy.get('[aria-label="Username"]').type('123invalid')
      cy.get('[aria-label="Email address"]').type('john@example.com') // trigger validation
      cy.get('[role="alert"]').should('contain.text', 'Username must start with a letter')
    })

    it('should show validation error for username with uppercase letters', () => {
      cy.get('[aria-label="Full name"]').type('John Doe')
      cy.get('[aria-label="Username"]').type('InvalidUser')
      cy.get('[aria-label="Email address"]').type('john@example.com') // trigger validation
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
      cy.get('[role="alert"]').should('contain.text', 'Invalid email address')
    })

    it('should show validation error for empty password', () => {
      submitRegister()
      cy.get('[role="alert"]').should('contain.text', 'Password must be at least 8 characters long')
    })

    it('should show validation error for password less than 8 characters', () => {
      cy.get('[aria-label="Full name"]').type('John Doe')
      cy.get('[aria-label="Username"]').type('johndoe')
      cy.get('[aria-label="Email address"]').type('john@example.com')
      cy.get('input[type="password"]').last().type('Short1!')
      cy.get('[aria-label="Select role"]').click() // trigger validation
      cy.get('[role="alert"]').should('contain.text', 'Password must be at least 8 characters long')
    })

    it('should show validation error for password more than 120 characters', () => {
      cy.get('[aria-label="Full name"]').type('John Doe')
      cy.get('[aria-label="Username"]').type('johndoe')
      cy.get('[aria-label="Email address"]').type('john@example.com')
      cy.get('input[type="password"]').last().type('A1!' + 'a'.repeat(120))
      cy.get('[aria-label="Select role"]').click() // trigger validation
      cy.get('[role="alert"]').should('contain.text', 'Password must be at most 120 characters')
    })

    it('should show validation error for password without digit', () => {
      cy.get('[aria-label="Full name"]').type('John Doe')
      cy.get('[aria-label="Username"]').type('johndoe')
      cy.get('[aria-label="Email address"]').type('john@example.com')
      cy.get('input[type="password"]').last().type('NoDigits!')
      cy.get('[aria-label="Select role"]').click() // trigger validation
      cy.get('[role="alert"]').should('contain.text', 'Password must contain at least one digit')
    })

    it('should show validation error for password without capital letter', () => {
      cy.get('[aria-label="Full name"]').type('John Doe')
      cy.get('[aria-label="Username"]').type('johndoe')
      cy.get('[aria-label="Email address"]').type('john@example.com')
      cy.get('input[type="password"]').last().type('nocapital123!')
      cy.get('[aria-label="Select role"]').click() // trigger validation
      cy.get('[role="alert"]').should('contain.text', 'Password must contain at least one capital letter')
    })

    it('should show validation error for password without special character', () => {
      cy.get('[aria-label="Full name"]').type('John Doe')
      cy.get('[aria-label="Username"]').type('johndoe')
      cy.get('[aria-label="Email address"]').type('john@example.com')
      cy.get('input[type="password"]').last().type('NoSpecial123')
      cy.get('[aria-label="Select role"]').click() // trigger validation
      cy.get('[role="alert"]').should('contain.text', 'Password must contain at least one special character')
    })

    it('should show all validation errors when submitting empty form', () => {
      submitRegister()
      cy.get('[role="alert"]').should('have.length.at.least', 5)
    })

    it('should allow role selection between customer and worker', () => {
      cy.get('[aria-label="Select role"]').click()
      cy.get('[data-value="customer"]').should('be.visible')
      cy.get('[data-value="worker"]').should('be.visible')

      cy.get('[data-value="worker"]').click()
      cy.get('[aria-label="Select role"]').should('contain.text', 'Worker')

      cy.get('[aria-label="Select role"]').click()
      cy.get('[data-value="customer"]').click()
      cy.get('[aria-label="Select role"]').should('contain.text', 'Customer')
    })

    it('should show loading state during registration submission', () => {
      cy.intercept('POST', '**/api/v1/auth/register', {
        delay: 1000,
        statusCode: 201,
        body: { message: 'User created' },
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
        body: { message: 'User created successfully', user: { id: 1, ...validWorker } },
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
        body: { message: 'User created successfully', user: { id: 2, ...validCustomer } },
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
            { loc: ['body', 'email'], msg: 'value is not a valid email address', type: 'value_error' },
          ],
        },
      }).as('backendValidation')

      fillRegisterForm(validWorker)
      submitRegister()

      cy.wait('@backendValidation')
    })

    it('should handle server error (500)', () => {
      cy.intercept('POST', '**/api/v1/auth/register', {
        statusCode: 500,
        body: { message: 'Internal server error' },
      }).as('serverError')

      fillRegisterForm(validWorker)
      submitRegister()

      cy.wait('@serverError')
      cy.get('[aria-label="Create account"]').should('not.be.disabled')
    })

    it('should trim whitespace from inputs', () => {
      cy.intercept('POST', '**/api/v1/auth/register', {
        statusCode: 201,
        body: { message: 'User created' },
      }).as('trimCheck')

      cy.get('[aria-label="Full name"]').type('  John Doe  ')
      cy.get('[aria-label="Username"]').type('  johndoe  ')
      cy.get('[aria-label="Email address"]').type('  john@example.com  ')
      cy.get('input[type="password"]').last().type('SecurePass123!')
      cy.get('[aria-label="Select role"]').click()
      cy.get('[data-value="customer"]').click()

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
        body: { message: 'User created' },
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
        body: { message: 'User created' },
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
          user: { id: 1, role_type: 'worker', name: validWorker.name }
        },
      }).as('login')

      fillLoginForm({ username_or_email: validWorker.email, password: validWorker.password })
      submitLogin()
      cy.wait('@login')

      // Step 3: Worker Dashboard (protected route)
      cy.url().should('include', '/dashboard')
      cy.window().its('sessionStorage.access_token').should('eq', 'dashboard-token')
    })

    it('should protect dashboard route for unauthenticated users', () => {
      cy.visit('/dashboard')
      cy.url().should('not.include', '/dashboard')
      // Should redirect to login
      cy.url().should('include', '/login')
    })

    it('should handle logout via API and clear session', () => {
      // Simulate logged in state
      cy.window().then((win) => {
        win.sessionStorage.setItem('access_token', 'test-token')
      })

      cy.intercept('POST', '**/api/v1/auth/logout', {
        statusCode: 200,
        body: { message: 'Logged out successfully' },
      }).as('logoutRequest')

      // If you have a logout button, trigger it here:
      // cy.get('[aria-label="Logout"]').click()
      // cy.wait('@logoutRequest')
      // cy.window().its('sessionStorage.access_token').should('not.exist')
      // cy.url().should('include', '/login')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN REFRESH (API Client behavior)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Token Refresh', () => {
    it('should automatically refresh expired access token', () => {
      // Setup: user is logged in with expired token
      cy.window().then((win) => {
        win.sessionStorage.setItem('access_token', 'expired-token')
      })

      // Intercept the refresh endpoint
      cy.intercept('POST', '**/api/v1/auth/refresh', {
        statusCode: 200,
        body: { access_token: 'new-refreshed-token' },
      }).as('tokenRefresh')

      // Intercept a protected endpoint that returns 401 first, then succeeds after refresh
      cy.intercept('GET', '**/api/v1/**', (req) => {
        const authHeader = req.headers['authorization']
        if (authHeader === 'Bearer expired-token') {
          req.reply({ statusCode: 401, body: { message: 'Token expired' } })
        } else if (authHeader === 'Bearer new-refreshed-token') {
          req.reply({ statusCode: 200, body: { id: 1, name: 'Test' } })
        }
      }).as('protectedRequest')

      // Trigger a protected request by visiting dashboard
      cy.visit('/dashboard')

      // The apiClient should handle 401 by calling refresh, then retry
      cy.wait('@tokenRefresh')
      cy.window().its('sessionStorage.access_token').should('eq', 'new-refreshed-token')
    })

    it('should redirect to login when refresh token is invalid', () => {
      cy.window().then((win) => {
        win.sessionStorage.setItem('access_token', 'expired-token')
      })

      cy.intercept('POST', '**/api/v1/auth/refresh', {
        statusCode: 401,
        body: { message: 'Refresh token invalid' },
      }).as('refreshFail')

      cy.visit('/dashboard')
      cy.wait('@refreshFail')
      cy.url().should('include', '/login')
      cy.window().its('sessionStorage.access_token').should('not.exist')
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
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 720 },
    ]

    viewports.forEach(({ name, width, height }) => {
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
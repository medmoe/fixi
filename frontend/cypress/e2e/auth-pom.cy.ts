/// <reference types="cypress" />
import {DashboardPage, LoginPage, RegisterPage} from './support/pages/auth.pages'

describe('Authentication E2E - POM Style', () => {
    const loginPage = new LoginPage()
    const registerPage = new RegisterPage()
    const dashboardPage = new DashboardPage()

    const testUser = {
        name: 'POM Test',
        username: 'pom_test',
        email: 'pom@test.com',
        password: 'SecurePass123!',
        role_type: 'worker' as const,
    }

    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearCookies()
    })

    describe('Login', () => {
        it('should login successfully and redirect to dashboard', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'pom-token', user: {id: 1, role_type: 'worker'}},
            }).as('login')

            loginPage
                .visit()
                .login(testUser.email, testUser.password)

            cy.wait('@login')
            dashboardPage.assertAuthenticated()
        })

        it('should show validation errors for empty fields', () => {
            loginPage.visit().submit()
            loginPage.getErrorMessages().should('be.visible')
        })

        it('should navigate to register', () => {
            loginPage.visit().goToRegister()
            registerPage.getForm().should('be.visible')
        })

        it('should handle API error and show toast', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 401,
                body: {detail: 'Invalid credentials'},
            }).as('loginError')

            loginPage
                .visit()
                .login('wrong@email.com', 'wrongpass')

            cy.wait('@loginError')
            loginPage.getToastError().should('contain.text', 'Invalid credentials')
        })
    })

    describe('Register', () => {
        it('should register successfully and redirect to login', () => {
            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 201,
                body: {message: 'Created'},
            }).as('register')

            registerPage
                .visit()
                .register(testUser)

            cy.wait('@register')
            loginPage.getForm().should('be.visible')
            cy.url().should('include', '/login')
        })

        it('should show validation errors for invalid username', () => {
            registerPage.visit()
            registerPage.getUsernameField().type('InvalidUser') // uppercase
            registerPage.getEmailField().type('test@test.com') // trigger validation
            registerPage.submit()
            registerPage.getErrorMessages().should('contain.text', 'lowercase')
        })

        it('should navigate to login', () => {
            registerPage.visit().goToLogin()
            loginPage.getForm().should('be.visible')
        })

        it('should handle server error and show toast', () => {
            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 500,
                body: {detail: 'Internal server error'},
            }).as('registerError')

            registerPage.visit().register(testUser)
            cy.wait('@registerError')
            registerPage.getToastError().should('contain.text', 'Internal server error')
        })
    })

    describe('Route Protection', () => {
        it('should block unauthenticated access to dashboard', () => {
            dashboardPage.visit().assertUnauthenticated()
            cy.url().should('include', '/login')
        })
    })

    describe('Logout Flow', () => {
        beforeEach(() => {
            // Login
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'logout-test-token', user: {id: 1, role_type: 'worker'}},
            }).as('login')
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: {id: 1, name: 'Test User', role_type: 'worker'},
            }).as('userMe')
            cy.intercept('GET', '**/api/v1/worker-profile', {
                statusCode: 200,
                body: {id: 1, bio: 'test bio', hourly_rate: 100},
            }).as('workerProfile')
            cy.intercept('POST', '**/api/v1/auth/refresh', {
                statusCode: 401,
            }).as('refresh')

            loginPage.visit().login(testUser.email, testUser.password)
            cy.wait('@login')
            cy.wait('@userMe')
            cy.wait('@workerProfile')

            dashboardPage.assertAuthenticated()
        })
        it('should logout successfully via confirmation dialog', () => {

            // Setup logout intercept
            cy.intercept('POST', '**/api/v1/auth/logout', {
                statusCode: 200,
                body: {message: 'Logged out successfully'},
            }).as('logout')

            // Execute logout flow with dialog
            dashboardPage.logout()
            cy.wait('@logout')

            // Verify redirect to login
            loginPage.getForm().should('be.visible')
            cy.url().should('include', '/login')
        })

        it('should clear session even when logout API fails', () => {
            // Setup logout to fail
            cy.intercept('POST', '**/api/v1/auth/logout', {
                forceNetworkError: true,
            }).as('logoutFail')

            // Execute logout — should still redirect even on API failure
            dashboardPage.logout()
            cy.wait('@logoutFail')

            loginPage.getForm().should('be.visible')
            cy.url().should('include', '/login')
            loginPage.getToastError().should('contain.text', 'cleared local session anyway')
        })

        it('should cancel logout when dialog cancel is clicked', () => {

            // Open logout dialog but cancel
            dashboardPage.openLogoutDialog()
            dashboardPage.cancelLogout()

            // Should stay on dashboard
            dashboardPage.assertAuthenticated()
        })
    })

    describe('Token Refresh', () => {
        it('should handle token refresh on 401', () => {
            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'expired-token', user: {id: 1, role_type: 'worker'}},
            }).as('login')

            loginPage.visit().login(testUser.email, testUser.password)
            cy.wait('@login')

            cy.intercept('POST', '**/api/v1/auth/refresh', {
                statusCode: 200,
                body: {access_token: 'refreshed-token'},
            }).as('refresh')

            // Visit dashboard which may trigger user fetch
            dashboardPage.visit()

            // If a 401 happens, refresh should be called
            cy.wait('@refresh', {timeout: 5000}).then(() => {
                dashboardPage.assertAuthenticated()
            })
        })
    })
})
/// <reference types="cypress" />
import {DashboardPage, LoginPage, RegisterPage} from '../support/pages/auth.pages'

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
        cy.clearSessionStorage()
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
            registerPage.getErrorMessages().should('contain.text', 'lowercase')
        })

        it('should navigate to login', () => {
            registerPage.visit().goToLogin()
            loginPage.getForm().should('be.visible')
        })
    })

    describe('Route Protection', () => {
        it('should block unauthenticated access to dashboard', () => {
            dashboardPage.visit().assertUnauthenticated()
            cy.url().should('include', '/login')
        })
    })
})
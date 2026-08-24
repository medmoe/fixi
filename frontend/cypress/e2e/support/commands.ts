/// <reference types="cypress" />

// ─── Authentication Commands ────────────────────────────────────────────────

Cypress.Commands.add('login', (email: string, password: string) => {
    cy.session([email, password], () => {
        cy.intercept('POST', '**/api/v1/auth/login', {
            statusCode: 200,
            body: {access_token: 'test-token', user: {id: 1, email, role_type: 'worker'}},
        }).as('loginCommand')

        cy.visit('/login')
        cy.get('[aria-label="Username or email"]').type(email)
        cy.get('[aria-label="Password"]').first().type(password)
        cy.get('[aria-label="Sign in"]').click()
        cy.wait('@loginCommand')

        cy.window().its('sessionStorage.access_token').should('exist')
    })
})

Cypress.Commands.add('register', (user: {
    name: string
    username: string
    email: string
    password: string
    role_type: 'customer' | 'worker'
}) => {
    cy.session([user.email, 'register'], () => {
        cy.intercept('POST', '**/api/v1/auth/register', {
            statusCode: 201,
            body: {message: 'User created', user: {id: 1, ...user}},
        }).as('registerCommand')

        cy.visit('/register')
        cy.get('[aria-label="Full name"]').type(user.name)
        cy.get('[aria-label="Username"]').type(user.username)
        cy.get('[aria-label="Email address"]').type(user.email)
        cy.get('input[type="password"]').last().type(user.password)
        cy.get('[aria-label="Select role"]').click()
        cy.get(`[data-value="${user.role_type}"]`).click()
        cy.get('[aria-label="Create account"]').click()
        cy.wait('@registerCommand')
    })
})

Cypress.Commands.add('logout', () => {
    cy.intercept('POST', '**/api/v1/auth/logout', {
        statusCode: 200,
        body: {message: 'Logged out'},
    }).as('logoutCommand')

    cy.window().then((win) => {
        win.sessionStorage.removeItem('access_token')
    })
    cy.clearCookies()
    cy.clearLocalStorage()
})

// ─── Type Definitions ───────────────────────────────────────────────────────
declare global {
    namespace Cypress {
        interface Chainable {
            login(email: string, password: string): Chainable<void>

            register(user: {
                name: string
                username: string
                email: string
                password: string
                role_type: 'customer' | 'worker'
            }): Chainable<void>

            logout(): Chainable<void>
        }
    }
}

export {}



// ─── Geolocation Command ─────────────────────────────────────────────────
// Stubs navigator.geolocation.getCurrentPosition before the page loads, so
// any "use my location" trigger resolves with the given coordinates instead
// of prompting for real browser permission (which Cypress can't grant).
//
// NOTE: not currently wired into WorkerSearchPage — ready for use once a
// geolocation trigger is added there. See useWorkerSearch's Redux-based
// stored-location fallback for the alternate path currently in use.

Cypress.Commands.add('mockGeolocation', (latitude: number, longitude: number) => {
    cy.window().then((win) => {
        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success) => {
            success({
                coords: {
                    latitude,
                    longitude,
                    accuracy: 10,
                },
            })
        })
    })
})

declare global {
    namespace Cypress {
        interface Chainable {
            mockGeolocation(latitude: number, longitude: number): Chainable<void>
        }
    }
}
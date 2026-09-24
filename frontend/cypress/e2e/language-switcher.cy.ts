/// <reference types="cypress" />

// The language switcher previously only existed inside the authenticated
// dashboard header -- logged-out visitors landing on `/`, `/login`, or
// `/register` had no way to change language before signing in. This spec
// covers the switcher now being reachable from all three.
//
// Language is forced to French via localStorage before each visit rather
// than relying on the browser-locale detector's guess (which, in this
// headless Electron run, resolves to English regardless of the app's
// French fallback) -- this keeps the starting point deterministic.

describe('Language switcher on public pages', () => {
    const visitInFrench = (path: string) => {
        cy.visit(path, {
            onBeforeLoad: (win) => win.localStorage.setItem('i18nextLng', 'fr'),
        })
    }

    const switchToEnglish = () => {
        cy.get('[aria-label="Changer de langue"]').click()
        cy.contains('[role="menuitem"]', 'English').click()
    }

    it('switches the landing page to English from the navbar', () => {
        visitInFrench('/')
        cy.contains('Connexion').should('be.visible')

        switchToEnglish()

        cy.contains('Log In').should('be.visible')
        cy.contains('Sign Up').should('be.visible')
    })

    it('switches the login page to English', () => {
        visitInFrench('/login')
        cy.contains('Bon retour').should('be.visible')

        switchToEnglish()

        cy.contains('Welcome back').should('be.visible')
    })

    it('switches the register page to English', () => {
        visitInFrench('/register')
        cy.contains('Créez votre compte').should('be.visible')

        switchToEnglish()

        cy.contains('Create your account').should('be.visible')
    })
})

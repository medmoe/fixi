/// <reference types="cypress" />

// Regression coverage for a reported bug: the login-failure toast stayed in
// English regardless of the active UI language, because it displays the
// backend's raw `detail` string verbatim. Hits the real /auth/login
// endpoint (no intercept) with credentials that don't exist, so the actual
// backend message goes through formatApiError's known-error mapping.
//
// The login form's own field labels are translated too, so each case's
// selectors have to match that language's aria-labels, not just the toast.

describe('Auth toast messages respect the active language', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearLocalStorage()
        cy.clearCookies()
    })

    const attemptFailedLogin = (language: string, labels: { field: string; password: string; submit: string }) => {
        cy.visit('/login', {
            onBeforeLoad: (win) => win.localStorage.setItem('i18nextLng', language),
        })
        cy.get(`[aria-label="${labels.field}"]`).type('no-such-user@example.com')
        cy.get(`[aria-label="${labels.password}"]`).type('WrongPassword123!')
        cy.get(`[aria-label="${labels.submit}"]`).click()
    }

    it('shows the login-failure toast in English', () => {
        attemptFailedLogin('en', {field: 'Username or email', password: 'Password', submit: 'Sign in'})
        cy.get('[data-sonner-toast]').should('contain.text', 'Wrong username, email or password.')
    })

    it('shows the login-failure toast in French', () => {
        attemptFailedLogin('fr', {field: "Nom d'utilisateur ou e-mail", password: 'Mot de passe', submit: 'Se connecter'})
        cy.get('[data-sonner-toast]').should('contain.text', "Nom d'utilisateur, e-mail ou mot de passe incorrect.")
    })

    it('shows the login-failure toast in Arabic', () => {
        attemptFailedLogin('ar', {field: 'اسم المستخدم أو البريد الإلكتروني', password: 'كلمة المرور', submit: 'تسجيل الدخول'})
        cy.get('[data-sonner-toast]').should('contain.text', 'اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة.')
    })
})

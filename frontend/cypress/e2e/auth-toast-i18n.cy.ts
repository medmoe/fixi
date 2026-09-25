/// <reference types="cypress" />

// Regression coverage for a reported bug: the login-failure toast stayed in
// English regardless of the active UI language, because it displays the
// backend's raw `detail` string verbatim. Intercepts /auth/login with the
// backend's actual 401 response shape (`Wrong username, email or
// password.`, from src/app/api/v1/auth.py) so the real formatApiError /
// translateApiErrorDetail mapping runs end to end -- this CI job never
// starts the backend (see cypress.yml: only `npm run dev`), unlike a local
// dev-stack run, so a real (non-intercepted) login attempt fails as a
// network error instead of exercising the mapping at all.
//
// The login form's own field labels are translated too, so each case's
// selectors have to match that language's aria-labels, not just the toast.

describe('Auth toast messages respect the active language', () => {
    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearLocalStorage()
        cy.clearCookies()

        cy.intercept('POST', '**/api/v1/auth/login', {
            statusCode: 401,
            body: {detail: 'Wrong username, email or password.'},
        }).as('login')
    })

    const attemptFailedLogin = (language: string, labels: { field: string; password: string; submit: string }) => {
        cy.visit('/login', {
            onBeforeLoad: (win) => win.localStorage.setItem('i18nextLng', language),
        })
        cy.get(`[aria-label="${labels.field}"]`).type('no-such-user@example.com')
        cy.get(`[aria-label="${labels.password}"]`).type('WrongPassword123!')
        cy.get(`[aria-label="${labels.submit}"]`).click()
        cy.wait('@login')
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

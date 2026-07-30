/// <reference types="cypress" />
// cypress/support/pages/auth.pages.ts

// ─── Login Page Object ──────────────────────────────────────────────────────

export class LoginPage {
    private readonly selectors = {
        form: 'form[aria-label="Login form"]',
        usernameField: '[aria-label="Username or email"]',
        passwordField: '[aria-label="Password"]',
        submitButton: '[aria-label="Sign in"]',
        registerLink: 'a[href="/register"]',
        errorMessages: '[role="alert"]',
        toastError: '[data-sonner-toast]',
    }

    visit() {
        cy.visit('/login')
        return this
    }

    login(usernameOrEmail: string, password: string) {
        cy.get(this.selectors.usernameField).clear().type(usernameOrEmail)
        cy.get(this.selectors.passwordField).clear().type(password)
        cy.get(this.selectors.submitButton).click()
        return this
    }

    submit() {
        cy.get(this.selectors.submitButton).click()
        return this
    }

    goToRegister() {
        cy.get(this.selectors.registerLink).click()
        return this
    }

    getForm() {
        return cy.get(this.selectors.form)
    }

    getErrorMessages() {
        return cy.get(this.selectors.errorMessages)
    }

    getToastError() {
        return cy.get(this.selectors.toastError)
    }

    getUsernameField() {
        return cy.get(this.selectors.usernameField)
    }

    getPasswordField() {
        return cy.get(this.selectors.passwordField)
    }

    getSubmitButton() {
        return cy.get(this.selectors.submitButton)
    }
}

// ─── Register Page Object ───────────────────────────────────────────────────

export class RegisterPage {
    private readonly selectors = {
        form: 'form[aria-label="Registration form"]',
        nameField: '[aria-label="Full name"]',
        usernameField: '[aria-label="Username"]',
        emailField: '[aria-label="Email address"]',
        passwordField: 'input[type="password"]',
        roleSelect: '[aria-label="Select role"]',
        submitButton: '[aria-label="Create account"]',
        loginLink: 'a[href="/login"]',
        errorMessages: '[role="alert"]',
        toastError: '[data-sonner-toast]',
    }

    visit() {
        cy.visit('/register')
        return this
    }

    register(user: {
        name: string
        username: string
        email: string
        password: string
        role_type: 'customer' | 'worker'
    }) {
        cy.get(this.selectors.nameField).clear().type(user.name)
        cy.get(this.selectors.usernameField).clear().type(user.username)
        cy.get(this.selectors.emailField).clear().type(user.email)
        // Password is the last password input on register page
        cy.get(this.selectors.passwordField).last().clear().type(user.password)
        cy.get(this.selectors.roleSelect).click()
        cy.contains('[role="option"]', user.role_type === 'worker' ? 'Worker' : 'Customer').click()
        cy.get(this.selectors.submitButton).click()
        return this
    }

    submit() {
        cy.get(this.selectors.submitButton).click()
        return this
    }

    goToLogin() {
        cy.get(this.selectors.loginLink).click()
        return this
    }

    getForm() {
        return cy.get(this.selectors.form)
    }

    getErrorMessages() {
        return cy.get(this.selectors.errorMessages)
    }

    getToastError() {
        return cy.get(this.selectors.toastError)
    }

    getNameField() {
        return cy.get(this.selectors.nameField)
    }

    getUsernameField() {
        return cy.get(this.selectors.usernameField)
    }

    getEmailField() {
        return cy.get(this.selectors.emailField)
    }

    getPasswordField() {
        return cy.get(this.selectors.passwordField).last()
    }

    getRoleSelect() {
        return cy.get(this.selectors.roleSelect)
    }

    getSubmitButton() {
        return cy.get(this.selectors.submitButton)
    }
}

// ─── Dashboard Page Object ──────────────────────────────────────────────────

export class DashboardPage {
    private readonly selectors = {
        logoutButton: '[data-testid="logout-button"]',
        alertDialog: '[data-testid="logout-dialog"]',
        confirmLogoutButton: '[data-testid="logout-confirm"]',
        cancelLogoutButton: '[data-testid="logout-cancel"]',
        userMenu: '[data-testid="user-menu"]',
    }

    visit() {
        cy.visit('/dashboard')
        return this
    }

    logout() {
        this.assertAuthenticated()
        cy.get(this.selectors.logoutButton).first().click()
        cy.get(this.selectors.alertDialog).should('be.visible')
        cy.get(this.selectors.confirmLogoutButton).should('be.visible').click()
        return this
    }

    openLogoutDialog() {
        this.assertAuthenticated()
        cy.get(this.selectors.logoutButton).first().click()
        cy.get(this.selectors.alertDialog).should('be.visible')
        return this
    }

    cancelLogout() {
        cy.get(this.selectors.alertDialog)
            .find('button')
            .contains('Cancel')
            .click()
        return this
    }

    assertAuthenticated() {
        cy.url().should('include', '/dashboard')
        return this
    }

    assertUnauthenticated() {
        cy.url().should('include', '/login')
        return this
    }

    getLogoutButton() {
        return cy.get(this.selectors.logoutButton)
    }

    getAlertDialog() {
        return cy.get(this.selectors.alertDialog)
    }

    getUserMenu() {
        return cy.get(this.selectors.userMenu)
    }
}
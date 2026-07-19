/// <reference types="cypress" />

// ─── Login Page Object ─────────────────────────────────────────────────────
export class LoginPage {
  visit() {
    cy.visit('/login')
    return this
  }

  getForm() {
    return cy.get('form[aria-label="Login form"]')
  }

  getUsernameField() {
    return cy.get('[aria-label="Username or email"]')
  }

  getPasswordField() {
    return cy.get('[aria-label="Password"]').first()
  }

  getSubmitButton() {
    return cy.get('[aria-label="Sign in"]')
  }

  getRegisterLink() {
    return cy.contains('Register')
  }

  getErrorMessages() {
    return cy.get('[role="alert"]')
  }

  fillForm(username_or_email: string, password: string) {
    this.getUsernameField().clear().type(username_or_email)
    this.getPasswordField().clear().type(password)
    return this
  }

  submit() {
    this.getSubmitButton().click()
    return this
  }

  login(username_or_email: string, password: string) {
    this.fillForm(username_or_email, password).submit()
    return this
  }

  goToRegister() {
    this.getRegisterLink().click()
    return new RegisterPage()
  }
}

// ─── Register Page Object ────────────────────────────────────────────────────
export class RegisterPage {
  visit() {
    cy.visit('/register')
    return this
  }

  getForm() {
    return cy.get('form[aria-label="Registration form"]')
  }

  getNameField() {
    return cy.get('[aria-label="Full name"]')
  }

  getUsernameField() {
    return cy.get('[aria-label="Username"]')
  }

  getEmailField() {
    return cy.get('[aria-label="Email address"]')
  }

  getPasswordField() {
    return cy.get('input[type="password"]').last()
  }

  getRoleSelect() {
    return cy.get('[aria-label="Select role"]')
  }

  getSubmitButton() {
    return cy.get('[aria-label="Create account"]')
  }

  getLoginLink() {
    return cy.contains('Sign in')
  }

  getErrorMessages() {
    return cy.get('[role="alert"]')
  }

  selectRole(role: 'customer' | 'worker') {
    this.getRoleSelect().click()
    cy.get(`[data-value="${role}"]`).click()
    return this
  }

  fillForm(user: {
    name: string
    username: string
    email: string
    password: string
    role_type: 'customer' | 'worker'
  }) {
    this.getNameField().clear().type(user.name)
    this.getUsernameField().clear().type(user.username)
    this.getEmailField().clear().type(user.email)
    this.getPasswordField().clear().type(user.password)
    this.selectRole(user.role_type)
    return this
  }

  submit() {
    this.getSubmitButton().click()
    return this
  }

  register(user: {
    name: string
    username: string
    email: string
    password: string
    role_type: 'customer' | 'worker'
  }) {
    this.fillForm(user).submit()
    return this
  }

  goToLogin() {
    this.getLoginLink().click()
    return new LoginPage()
  }
}

// ─── Dashboard Page Object ───────────────────────────────────────────────────
export class DashboardPage {
  visit() {
    cy.visit('/dashboard')
    return this
  }

  assertAuthenticated() {
    cy.url().should('include', '/dashboard')
    return this
  }

  assertUnauthenticated() {
    cy.url().should('not.include', '/dashboard')
    return this
  }

  getLogoutButton() {
    return cy.get('[aria-label="Logout"]')
  }

  logout() {
    this.getLogoutButton().click()
    cy.get('[role="alertdialog"]').find('button').contains('Logout').click()
    return this
  }
}
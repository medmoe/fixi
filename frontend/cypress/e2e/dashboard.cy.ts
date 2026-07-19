/// <reference types="cypress" />

describe('Worker Dashboard E2E', () => {
    const mockUser = {
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Worker',
        username: 'test_worker',
        email: 'testworker@example.com',
        id: 42,
        profile_image_url: 'https://example.com/avatar.jpg',
        role_type: 'worker',
        is_deleted: false,
        is_superuser: false,
        tier_id: 1,
        location: 'New York, NY',
        deleted_at: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-06-20T14:30:00Z',
    }

    const mockWorkerProfile = {
        id: 42,
        user_id: 42,
        bio: 'Experienced plumber with 10+ years in residential and commercial work.',
        hourly_rate: 75.00,
        service_radius_km: 25,
        trades: [
            {trade_id: 1, skill_level: 'senior'},
            {trade_id: 2, skill_level: 'mid'},
        ],
        is_available: true,
        avatar_url: 'https://example.com/worker-avatar.jpg',
    }

    beforeEach(() => {
        cy.clearLocalStorage()
        cy.clearAllSessionStorage()
        cy.clearCookies()
        cy.window().then((win) => {
            win.sessionStorage.setItem('access_token', 'fake-token')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // DASHBOARD ACCESS & LAYOUT
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Dashboard Layout', () => {
        it('should redirect unauthenticated users to login', () => {
            cy.clearAllSessionStorage()
            cy.visit('/dashboard')
            cy.url().should('include', '/login')
        })

        it('should display sidebar with user info and navigation', () => {
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: mockUser,
            }).as('getUser')

            cy.visit('/dashboard')
            cy.wait('@getUser')

            cy.contains(mockUser.name).should('be.visible')
            cy.contains(mockUser.role_type).should('be.visible')
            cy.contains('Profile').should('be.visible')
            cy.contains('Account').should('be.visible')
            cy.get('[aria-label="Logout"]').should('be.visible')
        })

        it('should not display internal fields like UUID or ID', () => {
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: mockUser,
            }).as('getUser')

            cy.visit('/dashboard')
            cy.wait('@getUser')

            cy.contains('Account').click()
            cy.contains('UUID').should('not.exist')
            cy.contains('User ID').should('not.exist')
            cy.contains('Tier').should('not.exist')
            cy.contains('Superuser').should('not.exist')
        })

        it('should successfully logout from dashboard', () => {
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: mockUser,
            }).as('getUser')

            cy.intercept('POST', '**/api/v1/auth/logout', {
                statusCode: 200,
                body: {message: 'Logged out'},
            }).as('logout')

            cy.visit('/dashboard')
            cy.wait('@getUser')

            cy.get('[aria-label="Logout"]').click()
            cy.contains('Log out?').parent().find('button').contains('Logout').click()

            cy.wait('@logout')
            cy.url().should('include', '/login')
            cy.window().its('sessionStorage.access_token').should('not.exist')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE TAB
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Profile Tab', () => {
        beforeEach(() => {
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: mockUser,
            }).as('getUser')
        })

        it('should display existing worker profile with ProfileForm', () => {
            cy.intercept('GET', '**/api/v1/worker/profile/*', {
                statusCode: 200,
                body: mockWorkerProfile,
            }).as('getProfile')

            cy.visit('/dashboard')
            cy.wait('@getUser')
            cy.wait('@getProfile')

            cy.contains('Worker Profile').should('be.visible')
            cy.contains('Manage your public-facing profile').should('be.visible')
            cy.contains('Save Profile').should('be.visible')
        })

        it('should show error when profile fails to load', () => {
            cy.intercept('GET', '**/api/v1/worker/profile/*', {
                statusCode: 500,
                body: {detail: 'Internal server error'},
            }).as('getProfileError')

            cy.visit('/dashboard')
            cy.wait('@getUser')
            cy.wait('@getProfileError')

            cy.contains('Failed to Load Profile').should('be.visible')
        })

        it('should update profile using ProfileForm', () => {
            cy.intercept('GET', '**/api/v1/worker/profile/*', {
                statusCode: 200,
                body: mockWorkerProfile,
            }).as('getProfile')

            cy.intercept('PATCH', '**/api/v1/worker/profile/*', {
                statusCode: 200,
                body: {...mockWorkerProfile, bio: 'Updated bio'},
            }).as('updateProfile')

            cy.visit('/dashboard')
            cy.wait('@getUser')
            cy.wait('@getProfile')

            cy.get('textarea').clear().type('Updated bio')
            cy.contains('Save Profile').click()
            cy.wait('@updateProfile')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCOUNT TAB
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Account Tab', () => {
        beforeEach(() => {
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: mockUser,
            }).as('getUser')

            cy.visit('/dashboard')
            cy.wait('@getUser')
            cy.contains('Account').click()
        })

        it('should display account settings with editable fields', () => {
            cy.contains('Account Settings').should('be.visible')
            cy.contains('Profile Information').should('be.visible')

            // Editable fields should be visible
            cy.get('input').should('have.length.at.least', 4)
            cy.contains('Full Name').should('be.visible')
            cy.contains('Username').should('be.visible')
            cy.contains('Email').should('be.visible')
            cy.contains('Location').should('be.visible')
            cy.contains('Profile Image URL').should('be.visible')
        })

        it('should update account profile successfully', () => {
            const updatedUser = {...mockUser, name: 'Updated Name'}

            cy.intercept('PATCH', `**/api/v1/user/${mockUser.username}`, {
                statusCode: 200,
                body: updatedUser,
            }).as('updateUser')

            cy.get('input').first().clear().type('Updated Name')
            cy.contains('Save Changes').click()
            cy.wait('@updateUser')

            cy.contains('Account updated successfully').should('be.visible')
        })

        it('should show validation error for invalid email', () => {
            cy.get('input[type="email"]').clear().type('invalid-email')
            cy.contains('Save Changes').click()
            cy.contains('Invalid email address').should('be.visible')
        })

        it('should show validation error for short name', () => {
            cy.get('input').first().clear().type('A')
            cy.contains('Save Changes').click()
            cy.contains('Name must be at least 2 characters').should('be.visible')
        })

        it('should show validation error for invalid username', () => {
            cy.get('input').eq(1).clear().type('InvalidUser')
            cy.contains('Save Changes').click()
            cy.contains('lowercase').should('be.visible')
        })

        it('should change password successfully', () => {
            cy.intercept('PATCH', `**/api/v1/user/${mockUser.username}/password`, {
                statusCode: 200,
                body: {message: 'Password updated'},
            }).as('changePassword')

            cy.get('input[type="password"]').eq(0).type('OldPass123!')
            cy.get('input[type="password"]').eq(1).type('NewPass456!')
            cy.get('input[type="password"]').eq(2).type('NewPass456!')
            cy.contains('Change Password').click()
            cy.wait('@changePassword')

            cy.contains('Password changed successfully').should('be.visible')
        })

        it('should show error when passwords do not match', () => {
            cy.get('input[type="password"]').eq(0).type('OldPass123!')
            cy.get('input[type="password"]').eq(1).type('NewPass456!')
            cy.get('input[type="password"]').eq(2).type('DifferentPass!')
            cy.contains('Change Password').click()
            cy.contains('do not match').should('be.visible')
        })

        it('should show error when new password is too short', () => {
            cy.get('input[type="password"]').eq(0).type('OldPass123!')
            cy.get('input[type="password"]').eq(1).type('short')
            cy.get('input[type="password"]').eq(2).type('short')
            cy.contains('Change Password').click()
            cy.contains('at least 8 characters').should('be.visible')
        })

        it('should show error when password lacks digit', () => {
            cy.get('input[type="password"]').eq(0).type('OldPass123!')
            cy.get('input[type="password"]').eq(1).type('NoDigits!')
            cy.get('input[type="password"]').eq(2).type('NoDigits!')
            cy.contains('Change Password').click()
            cy.contains('at least one digit').should('be.visible')
        })

        it('should show error when password lacks capital letter', () => {
            cy.get('input[type="password"]').eq(0).type('OldPass123!')
            cy.get('input[type="password"]').eq(1).type('nocapital123!')
            cy.get('input[type="password"]').eq(2).type('nocapital123!')
            cy.contains('Change Password').click()
            cy.contains('capital letter').should('be.visible')
        })

        it('should show error when password lacks special character', () => {
            cy.get('input[type="password"]').eq(0).type('OldPass123!')
            cy.get('input[type="password"]').eq(1).type('NoSpecial123')
            cy.get('input[type="password"]').eq(2).type('NoSpecial123')
            cy.contains('Change Password').click()
            cy.contains('special character').should('be.visible')
        })

        it('should handle password change API error', () => {
            cy.intercept('PATCH', `**/api/v1/user/${mockUser.username}/password`, {
                statusCode: 400,
                body: {detail: 'Current password is incorrect'},
            }).as('passwordError')

            cy.get('input[type="password"]').eq(0).type('WrongPass!')
            cy.get('input[type="password"]').eq(1).type('NewPass456!')
            cy.get('input[type="password"]').eq(2).type('NewPass456!')
            cy.contains('Change Password').click()
            cy.wait('@passwordError')

            cy.contains('Current password is incorrect').should('be.visible')
        })

        it('should deactivate account with confirmation', () => {
            cy.intercept('DELETE', `**/api/v1/user/${mockUser.username}`, {
                statusCode: 200,
                body: {message: 'Account deactivated'},
            }).as('deactivate')

            cy.intercept('POST', '**/api/v1/auth/logout', {
                statusCode: 200,
                body: {message: 'Logged out'},
            }).as('logout')

            cy.contains('Deactivate Account').click()
            cy.contains('Deactivate your account?').should('be.visible')
            cy.contains('Yes, Deactivate').click()

            cy.wait('@deactivate')
            cy.wait('@logout')
            cy.url().should('include', '/login')
        })

        it('should cancel account deactivation', () => {
            cy.contains('Deactivate Account').click()
            cy.contains('Deactivate your account?').should('be.visible')
            cy.contains('Cancel').click()
            cy.contains('Deactivate your account?').should('not.exist')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Tab Navigation', () => {
        beforeEach(() => {
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: mockUser,
            }).as('getUser')

            cy.intercept('GET', '**/api/v1/worker/profile/*', {
                statusCode: 200,
                body: mockWorkerProfile,
            }).as('getProfile')

            cy.visit('/dashboard')
            cy.wait('@getUser')
        })

        it('should default to Profile tab', () => {
            cy.contains('Worker Profile').should('be.visible')
            cy.contains('Account Settings').should('not.exist')
        })

        it('should switch between tabs', () => {
            cy.contains('Account').click()
            cy.contains('Account Settings').should('be.visible')
            cy.contains('Worker Profile').should('not.exist')

            cy.contains('Profile').click()
            cy.contains('Worker Profile').should('be.visible')
            cy.contains('Account Settings').should('not.exist')
        })

        it('should highlight active tab in sidebar', () => {
            cy.contains('Profile')
                .parent()
                .should('have.class', 'bg-primary/10')

            cy.contains('Account').click()
            cy.contains('Account')
                .parent()
                .should('have.class', 'bg-primary/10')
        })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // RESPONSIVE DESIGN
    // ═══════════════════════════════════════════════════════════════════════════
    describe('Responsive Design', () => {
        beforeEach(() => {
            cy.intercept('GET', '**/api/v1/user/me', {
                statusCode: 200,
                body: mockUser,
            }).as('getUser')
        })

        it('should show mobile tab switcher on small screens', () => {
            cy.viewport(375, 667)
            cy.visit('/dashboard')
            cy.wait('@getUser')

            cy.contains('Profile').should('be.visible')
            cy.contains('Account').should('be.visible')
            cy.get('aside').should('not.be.visible')
        })

        it('should show sidebar on desktop', () => {
            cy.viewport(1280, 720)
            cy.visit('/dashboard')
            cy.wait('@getUser')

            cy.get('aside').should('be.visible')
            cy.contains(mockUser.name).should('be.visible')
        })
    })
})
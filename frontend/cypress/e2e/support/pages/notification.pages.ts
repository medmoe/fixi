/// <reference types="cypress" />
// cypress/support/pages/notification.pages.ts

export class NotificationBellPage {
    // Both dashboard layouts (customer DashboardLayout, worker
    // WorkerDashboardPage) render NotificationBell twice -- once for the
    // desktop header, once for the mobile header -- and hide whichever
    // doesn't match the current viewport with CSS rather than unmounting
    // it. `:visible` scopes every selector to the one actually shown at
    // the default (desktop-width) Cypress viewport.
    private readonly selectors = {
        trigger: '[aria-label="Notifications"]:visible',
        // NotificationBell pluralizes via i18next: singular "unread notification"
        // for count === 1, plural "unread notifications" otherwise.
        badge: (count: number) => `[aria-label="${count} unread notification${count === 1 ? '' : 's'}"]:visible`,
        markAllRead: 'button:contains("Mark all read"):visible',
    }

    open() {
        cy.get(this.selectors.trigger).click()
        return this
    }

    getTrigger() {
        return cy.get(this.selectors.trigger)
    }

    getBadge(count: number) {
        return cy.get(this.selectors.badge(count))
    }

    getDropdownItem(titleFr: string) {
        return cy.contains('[role="menuitem"]', titleFr)
    }

    clickMarkAllRead() {
        cy.get(this.selectors.markAllRead).click()
        return this
    }
}

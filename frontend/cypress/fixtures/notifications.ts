export const mockNotification = (overrides: Partial<any> = {}): any => ({
    id: 500,
    user_id: 1,
    type: 'job_application.confirmed',
    title_ar: 'تم تعيين المهمة',
    title_fr: 'Mission assignée',
    title_en: 'Job assigned',
    body_ar: 'قام محترف بتأكيد التعيين.',
    body_fr: 'Un professionnel a confirmé et est maintenant assigné à « Fix leaking kitchen sink ».',
    body_en: 'A professional has confirmed and is now assigned to "Fix leaking kitchen sink".',
    read_at: null,
    related_job_id: 10,
    created_at: '2026-09-18T10:05:00Z',
    ...overrides,
})

export const mockNotificationsResponse = (notifications: any[]) => ({
    data: notifications,
    total_count: notifications.length,
    has_more: false,
    page: 1,
    items_per_page: 20,
})

// NotificationBell fires two separate requests -- one unread_only=true (for
// the badge count) and one without (for the dropdown list). Both need to
// reflect the same notifications for the UI to be consistent, so this
// intercepts the shared endpoint and branches on the query string rather
// than requiring the caller to register two intercepts.
export const interceptNotifications = (notifications: any[]) => {
    cy.intercept('GET', '**/api/v1/notifications*', (req) => {
        const url = new URL(req.url)
        const unreadOnly = url.searchParams.get('unread_only') === 'true'
        const body = unreadOnly ? notifications.filter((n) => !n.read_at) : notifications
        req.reply({statusCode: 200, body: mockNotificationsResponse(body)})
    }).as('notifications')
}

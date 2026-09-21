import './commands';

// NotificationBell is mounted globally in DashboardLayout and fires this on
// every dashboard mount. Left unmocked, a test session with a fake/mocked
// login token gets a real 401 back from the dev backend, which can cascade
// through apiClient's silent-refresh logic into an unwanted redirect back
// to /login mid-test. Stubbed globally so no individual spec has to know
// about it.
beforeEach(() => {
    cy.intercept('GET', '**/api/v1/notifications*', {
        statusCode: 200,
        body: {data: [], total_count: 0, has_more: false, page: 1, items_per_page: 20},
    });
});

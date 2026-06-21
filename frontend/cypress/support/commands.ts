Cypress.Commands.add('stubSystems', () => {
  cy.intercept('GET', '**/systems', {
    statusCode: 200,
    body: {
      data: [
        {
          id: 'sys-1',
          name: 'Primary Cluster',
          status: 'healthy',
          lastHeartbeat: '2026-02-14T10:15:00Z'
        }
      ],
      metadata: {
        total: 1,
        updatedAt: '2026-02-14T10:15:00Z'
      }
    }
  }).as('getSystems');
});

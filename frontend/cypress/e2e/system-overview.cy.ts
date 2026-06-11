describe('System Overview', () => {
  it('shows the systems summary', () => {
    cy.stubSystems();
    cy.visit('/');
    cy.wait('@getSystems');
    cy.contains('Primary Cluster').should('be.visible');
  });
});

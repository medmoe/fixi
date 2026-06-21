declare namespace Cypress {
  interface Chainable {
    stubSystems(): Chainable<void>;
  }
}

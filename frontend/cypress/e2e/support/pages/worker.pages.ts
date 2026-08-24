/// <reference types="cypress" />
// cypress/support/pages/worker.pages.ts

// ─── Worker Search Page Object ──────────────────────────────────────────────

export class WorkerSearchPage {
    private readonly selectors = {
        filterPanel: '[aria-label="Search filters"]',
        tradeCategoryBadge: (name: string) => `[role="checkbox"]:contains("${name}")`,
        hourlyRateSlider: '[aria-label="Hourly rate range"] [role="slider"]',
        serviceRadiusSlider: '[aria-label="Service radius"] [role="slider"]',
        availabilityToggle: '[aria-label="Available now"]',
        verifiedCheckbox: '[aria-label="Verified only"]',
        clearFiltersButton: 'button:contains("Clear filters")',
        resultsCount: 'p:contains("workers found")',
        workerCard: 'article[aria-label^="Worker profile for"]',
        workerCardLink: (workerId: number) => `a[href="/workers/${workerId}"]`,
        emptyState: 'p:contains("No workers found")',
        skeletonGrid: '[role="status"][aria-label="Loading worker profile"]',
        loadMoreButton: 'button:contains("Load more")',
        errorMessage: 'p:contains("Something went wrong")',
    }

    visit(queryString = '') {
        cy.visit(`/workers/search${queryString}`)
        return this
    }

    selectTradeCategory(name: string) {
        cy.get(this.selectors.filterPanel).contains('[role="checkbox"]', name).click()
        return this
    }

    toggleAvailability() {
        cy.get(this.selectors.availabilityToggle).click()
        return this
    }

    toggleVerifiedOnly() {
        cy.get(this.selectors.verifiedCheckbox).click()
        return this
    }

    clearFilters() {
        cy.get(this.selectors.clearFiltersButton).click()
        return this
    }

    /**
     * Adjusts a Radix slider thumb via keyboard, since drag-simulation is
     * unreliable against Radix's internal pointer-event state in Cypress.
     * thumbIndex 0 = min thumb, 1 = max thumb (hourly rate has two thumbs;
     * service radius has one, so always use thumbIndex 0 there).
     */
    adjustSlider(sliderSelector: string, thumbIndex: number, direction: 'up' | 'down', times: number) {
        const key = direction === 'up' ? '{rightarrow}' : '{leftarrow}'
        cy.get(sliderSelector).eq(thumbIndex).focus()
        for (let i = 0; i < times; i++) {
            cy.get(sliderSelector).eq(thumbIndex).type(key)
        }
        return this
    }

    setMinHourlyRate(steps: number) {
        return this.adjustSlider(this.selectors.hourlyRateSlider, 0, 'up', steps)
    }

    setMaxHourlyRate(steps: number) {
        return this.adjustSlider(this.selectors.hourlyRateSlider, 1, 'down', steps)
    }

    setServiceRadius(steps: number) {
        return this.adjustSlider(this.selectors.serviceRadiusSlider, 0, 'up', steps)
    }

    clickWorkerCard(workerId: number) {
        cy.get(this.selectors.workerCardLink(workerId)).click()
        return this
    }

    getFilterPanel() {
        return cy.get(this.selectors.filterPanel)
    }

    getWorkerCards() {
        return cy.get(this.selectors.workerCard)
    }

    getWorkerCard(workerId: number) {
        return cy.get(this.selectors.workerCardLink(workerId))
    }

    getResultsCount() {
        return cy.get(this.selectors.resultsCount)
    }

    getEmptyState() {
        return cy.get(this.selectors.emptyState)
    }

    getSkeletonGrid() {
        return cy.get(this.selectors.skeletonGrid)
    }

    getLoadMoreButton() {
        return cy.get(this.selectors.loadMoreButton)
    }

    getErrorMessage() {
        return cy.get(this.selectors.errorMessage)
    }

    assertResultsInclude(workerId: number) {
        this.getWorkerCard(workerId).should('exist')
        return this
    }

    assertResultsExclude(workerId: number) {
        cy.get(this.selectors.workerCard).then(($cards) => {
            const hrefs = [...$cards].map((el) => el.closest('a')?.getAttribute('href'))
            expect(hrefs).to.not.include(`/workers/${workerId}`)
        })
        return this
    }
}

// ─── Worker Detail Page Object ──────────────────────────────────────────────

export class WorkerDetailPage {
    private readonly selectors = {
        backLink: 'a:contains("Back to search")',
        name: 'h1',
        verifiedBadge: '[title="Verified worker"]',
        tradeBadge: (name: string) => `span:contains("${name}")`,
        bioSection: 'h2:contains("About")',
        bioText: 'p.whitespace-pre-line',
        hourlyRate: 'p:contains("/hr")',
        serviceRadius: 'p:contains("km")',
        experience: 'p:contains("years")',
        availabilityStatus: 'span:contains("Available now"), span:contains("Currently unavailable")',
        notFoundMessage: 'p:contains("Worker not found")',
        skeleton: '[role="status"][aria-label="Loading worker profile"]',
    }

    visit(workerId: number) {
        cy.visit(`/workers/${workerId}`)
        return this
    }

    goBackToSearch() {
        cy.get(this.selectors.backLink).click()
        return this
    }

    getName() {
        return cy.get(this.selectors.name)
    }

    getVerifiedBadge() {
        return cy.get(this.selectors.verifiedBadge)
    }

    getTradeBadge(name: string) {
        return cy.get(this.selectors.tradeBadge(name))
    }

    getBioSection() {
        return cy.get(this.selectors.bioSection)
    }

    getBioText() {
        return cy.get(this.selectors.bioText)
    }

    getHourlyRate() {
        return cy.get(this.selectors.hourlyRate)
    }

    getServiceRadius() {
        return cy.get(this.selectors.serviceRadius)
    }

    getExperience() {
        return cy.get(this.selectors.experience)
    }

    getAvailabilityStatus() {
        return cy.get(this.selectors.availabilityStatus)
    }

    getNotFoundMessage() {
        return cy.get(this.selectors.notFoundMessage)
    }

    getSkeleton() {
        return cy.get(this.selectors.skeleton)
    }
}
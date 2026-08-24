/// <reference types="cypress" />
import {WorkerDetailPage, WorkerSearchPage} from './support/pages/worker.pages'
import {mockSearchResponse, mockTradeCategories, mockWorker} from '../fixtures/workers'

describe('Worker Search & Profile E2E - POM Style', () => {
    const searchPage = new WorkerSearchPage()
    const detailPage = new WorkerDetailPage()

    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearCookies()

        // trade categories are fetched by FilterPanel on every visit
        cy.intercept('GET', '**/api/v1/trade-categories', {
            statusCode: 200,
            body: mockTradeCategories,
        }).as('tradeCategories')
    })

    // ------------------------------------------------------------------ //
    //  Public access                                                       //
    // ------------------------------------------------------------------ //

    describe('Public access', () => {
        it('allows an unauthenticated user to search workers', () => {
            const workers = [mockWorker({id: 1}), mockWorker({id: 2, user: {id: 2, name: 'Erin Ellis'}})]

            cy.intercept('GET', '**/api/v1/worker-profile/search*', {
                statusCode: 200,
                body: mockSearchResponse(workers),
            }).as('searchWorkers')

            searchPage.visit()
            cy.wait('@searchWorkers')

            searchPage.getWorkerCards().should('have.length', 2)
            searchPage.getResultsCount().should('contain.text', '2 workers found')
        })
    })

    // ------------------------------------------------------------------ //
    //  Trade category filter                                              //
    // ------------------------------------------------------------------ //

    describe('Trade category filter', () => {
        it('returns only workers matching the selected trade category', () => {
            cy.intercept('GET', '**/api/v1/worker-profile/search*', (req) => {
                if (req.url.includes('trade_category_id=1')) {
                    req.reply({
                        statusCode: 200,
                        body: mockSearchResponse([mockWorker({id: 1})]),
                    })
                } else {
                    req.reply({
                        statusCode: 200,
                        body: mockSearchResponse([mockWorker({id: 1}), mockWorker({id: 2})]),
                    })
                }
            }).as('searchWorkers')

            searchPage.visit()
            cy.wait('@searchWorkers')
            cy.wait('@tradeCategories')

            searchPage.selectTradeCategory('Plumber')

            // debounce window (300ms) — wait for the filtered request
            cy.wait('@searchWorkers')
            searchPage.getWorkerCards().should('have.length', 1)
            searchPage.assertResultsInclude(1)
        })
    })

    // ------------------------------------------------------------------ //
    //  Hourly rate filter                                                  //
    // ------------------------------------------------------------------ //

    describe('Hourly rate filter', () => {
        it('narrows results when the hourly rate range is adjusted', () => {
            cy.intercept('GET', '**/api/v1/worker-profile/search*', (req) => {
                if (req.url.includes('min_hourly_rate')) {
                    req.reply({
                        statusCode: 200,
                        body: mockSearchResponse([mockWorker({id: 1, hourly_rate: '150.00'})]),
                    })
                } else {
                    req.reply({
                        statusCode: 200,
                        body: mockSearchResponse([
                            mockWorker({id: 1, hourly_rate: '150.00'}),
                            mockWorker({id: 2, hourly_rate: '20.00'}),
                        ]),
                    })
                }
            }).as('searchWorkers')

            searchPage.visit()
            cy.wait('@searchWorkers')

            searchPage.getWorkerCards().should('have.length', 2)

            searchPage.setMinHourlyRate(20) // step=5, 20 presses → min_hourly_rate=100

            cy.wait('@searchWorkers')
            searchPage.getWorkerCards().should('have.length', 1)
            searchPage.assertResultsInclude(1)
        })
    })

    // ------------------------------------------------------------------ //
    //  Availability filter                                                 //
    // ------------------------------------------------------------------ //

    describe('Availability filter', () => {
        it('shows only available workers when the availability toggle is on', () => {
            cy.intercept('GET', '**/api/v1/worker-profile/search*', (req) => {
                if (req.url.includes('is_available=true')) {
                    req.reply({
                        statusCode: 200,
                        body: mockSearchResponse([mockWorker({id: 1, is_available: true})]),
                    })
                } else {
                    req.reply({
                        statusCode: 200,
                        body: mockSearchResponse([
                            mockWorker({id: 1, is_available: true}),
                            mockWorker({id: 2, is_available: false}),
                        ]),
                    })
                }
            }).as('searchWorkers')

            searchPage.visit()
            cy.wait('@searchWorkers')

            searchPage.getWorkerCards().should('have.length', 2)

            searchPage.toggleAvailability()

            cy.wait('@searchWorkers')
            searchPage.getWorkerCards().should('have.length', 1)
            searchPage.assertResultsInclude(1)
            searchPage.assertResultsExclude(2)
        })
    })

    // ------------------------------------------------------------------ //
    //  Navigation to profile                                               //
    // ------------------------------------------------------------------ //

    describe('Navigation to worker profile', () => {
        it('navigates to /workers/{id} when a worker card is clicked', () => {
            const worker = mockWorker({id: 7})

            cy.intercept('GET', '**/api/v1/worker-profile/search*', {
                statusCode: 200,
                body: mockSearchResponse([worker]),
            }).as('searchWorkers')

            cy.intercept('GET', '**/api/v1/worker-profile/7', {
                statusCode: 200,
                body: worker,
            }).as('getWorkerProfile')

            searchPage.visit()
            cy.wait('@searchWorkers')

            searchPage.clickWorkerCard(7)
            cy.wait('@getWorkerProfile')

            cy.url().should('include', '/workers/7')
        })
    })

    // ------------------------------------------------------------------ //
    //  Worker profile page                                                 //
    // ------------------------------------------------------------------ //

    describe('Worker profile page', () => {
        it('shows trades, bio, rate, and radius', () => {
            const worker = mockWorker({
                id: 3,
                bio: 'Reliable and punctual, available for urgent jobs.',
                hourly_rate: '95.50',
                service_radius_km: 30,
                years_of_experience: 8,
            })

            cy.intercept('GET', '**/api/v1/worker-profile/3', {
                statusCode: 200,
                body: worker,
            }).as('getWorkerProfile')

            detailPage.visit(3)
            cy.wait('@getWorkerProfile')

            detailPage.getName().should('contain.text', 'Javier Hensley')
            detailPage.getTradeBadge('Plumber').should('be.visible')
            detailPage.getBioSection().should('be.visible')
            detailPage.getBioText().should('contain.text', 'Reliable and punctual')
            detailPage.getHourlyRate().should('contain.text', '$95.50/hr')
            detailPage.getServiceRadius().should('contain.text', '30 km')
            detailPage.getExperience().should('contain.text', '8 years')
        })

        it('shows a not-found state for a nonexistent worker', () => {
            cy.intercept('GET', '**/api/v1/worker-profile/999999', {
                statusCode: 404,
                body: {detail: 'Worker with id 999999 not found.'},
            }).as('getWorkerProfile')

            detailPage.visit(999999)
            cy.wait('@getWorkerProfile')

            detailPage.getNotFoundMessage().should('be.visible')
        })

        it('navigates back to search from the profile page', () => {
            const worker = mockWorker({id: 3})

            cy.intercept('GET', '**/api/v1/worker-profile/3', {
                statusCode: 200,
                body: worker,
            }).as('getWorkerProfile')

            cy.intercept('GET', '**/api/v1/worker-profile/search*', {
                statusCode: 200,
                body: mockSearchResponse([worker]),
            }).as('searchWorkers')

            detailPage.visit(3)
            cy.wait('@getWorkerProfile')

            detailPage.goBackToSearch()
            cy.wait('@searchWorkers')

            cy.url().should('include', '/workers/search')
        })
    })

    // ------------------------------------------------------------------ //
    //  Geo search                                                          //
    // ------------------------------------------------------------------ //

    describe('Geo search', () => {
        it('returns nearby workers when searched with coordinates via URL', () => {
            // NOTE: WorkerSearchPage currently has no on-page geolocation
            // trigger — geo search is exercised via URL params here, which
            // is the actual code path useWorkerSearch supports today.
            // cy.mockGeolocation() is available and ready once a "search
            // near me" button is added to the page itself.
            const nearbyWorker = mockWorker({id: 1, user: {id: 1, name: 'Nearby Worker'}})

            cy.intercept('GET', '**/api/v1/worker-profile/search*', (req) => {
                if (req.url.includes('latitude=36.7538') && req.url.includes('longitude=3.0588')) {
                    req.reply({
                        statusCode: 200,
                        body: mockSearchResponse([nearbyWorker]),
                    })
                } else {
                    req.reply({
                        statusCode: 200,
                        body: mockSearchResponse([]),
                    })
                }
            }).as('searchWorkers')

            searchPage.visit('?latitude=36.7538&longitude=3.0588')
            cy.wait('@searchWorkers')

            searchPage.getWorkerCards().should('have.length', 1)
            searchPage.assertResultsInclude(1)
        })
    })

    // ------------------------------------------------------------------ //
    //  Empty / loading / error states                                      //
    // ------------------------------------------------------------------ //

    describe('Result states', () => {
        it('shows an empty state when no workers match', () => {
            cy.intercept('GET', '**/api/v1/worker-profile/search*', {
                statusCode: 200,
                body: mockSearchResponse([]),
            }).as('searchWorkers')

            searchPage.visit()
            cy.wait('@searchWorkers')

            searchPage.getEmptyState().should('be.visible')
        })

        it('shows an error message when the search request fails', () => {
            cy.intercept('GET', '**/api/v1/worker-profile/search*', {
                statusCode: 500,
                body: {detail: 'Internal server error'},
            }).as('searchWorkersError')

            searchPage.visit()
            cy.wait('@searchWorkersError')

            searchPage.getErrorMessage().should('be.visible')
        })
    })
})
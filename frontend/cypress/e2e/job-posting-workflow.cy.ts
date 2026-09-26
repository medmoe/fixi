/// <reference types="cypress" />
import {LoginPage} from './support/pages/auth.pages'
import {CustomerJobsListPage, JobPostingPage, PublicJobDetailPage} from './support/pages/job.pages'
import {
    mockApplication,
    mockApplicationsResponse,
    mockCustomer,
    mockJob,
    mockJobsResponse,
    mockWorkerProfile,
    mockWorkerUser,
} from '../fixtures/jobs'
import {mockSearchResponse, mockWorker} from '../fixtures/workers'

// ─── Auth helpers ─────────────────────────────────────────────────────────────
// Intercept the silent token refresh so tests can cy.visit() any URL without
// going through the login form. useInitAuth fires POST /auth/refresh on every
// fresh page load; a mocked 200 sets credentials in Redux and memory.

const asCustomer = () => {
    cy.intercept('POST', '**/api/v1/auth/refresh', {
        statusCode: 200,
        body: {access_token: 'customer-token'},
    }).as('authRefresh')
    cy.intercept('GET', '**/api/v1/user/me', {
        statusCode: 200,
        body: mockCustomer,
    }).as('userMe')
}

const asWorker = () => {
    cy.intercept('POST', '**/api/v1/auth/refresh', {
        statusCode: 200,
        body: {access_token: 'worker-token'},
    }).as('authRefresh')
    cy.intercept('GET', '**/api/v1/user/me', {
        statusCode: 200,
        body: mockWorkerUser,
    }).as('userMe')
    cy.intercept('GET', '**/api/v1/worker-profile', {
        statusCode: 200,
        body: mockWorkerProfile(),
    }).as('workerProfile')
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Job Posting Workflow - POM Style', () => {
    const loginPage = new LoginPage()
    const jobPostingPage = new JobPostingPage()
    const jobsListPage = new CustomerJobsListPage()
    const jobDetailPage = new PublicJobDetailPage()

    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearCookies()
    })

    // ─── 1. Customer posts a job (full login → create journey) ────────────────

    describe('Customer — posts a job', () => {
        it('navigates from login through to a newly created job, landing on its dashboard page with suggested nearby workers (not the public jobs page)', () => {
            const newJob = mockJob({id: 11, title: 'Rewire living room lights', coordinates: {latitude: 51.5074, longitude: -0.1278}})

            cy.intercept('GET', '**/api/v1/jobs/my', {statusCode: 200, body: mockJobsResponse([])}).as('myJobs')
            cy.intercept('GET', '**/api/v1/jobs/11', {statusCode: 200, body: newJob}).as('jobDetail')
            cy.intercept('GET', '**/api/v1/jobs/11/nearby-workers*', {
                statusCode: 200,
                body: mockSearchResponse([mockWorker({id: 5, distance_km: 2.4, user: {id: 7, name: 'Javier Hensley'}})]),
            }).as('nearbyWorkers')

            cy.intercept('POST', '**/api/v1/auth/login', {
                statusCode: 200,
                body: {access_token: 'customer-token', user: {id: 1, role_type: 'customer'}},
            }).as('loginApi')
            cy.intercept('GET', '**/api/v1/user/me', {statusCode: 200, body: mockCustomer}).as('userMe')
            cy.intercept('POST', '**/api/v1/jobs', {statusCode: 201, body: newJob}).as('createJob')
            // Public /jobs page — the form must NOT redirect here after creation.
            cy.intercept('GET', '**/api/v1/jobs*', {statusCode: 200, body: mockJobsResponse([newJob])}).as('publicJobs')
            // Geocoding API for the required location field
            cy.intercept('GET', '**/nominatim.openstreetmap.org/search*', {
                statusCode: 200,
                body: [{
                    place_id: 12345,
                    osm_type: 'node',
                    osm_id: 54321,
                    display_name: 'London, Greater London, England',
                    lat: '51.5074',
                    lon: '-0.1278',
                }],
            }).as('geocoding')

            // Full login flow
            loginPage.visit().login('jane@customer.com', 'password')
            cy.wait('@loginApi')
            cy.wait('@userMe')
            cy.url().should('include', '/dashboard')

            // Navigate to Jobs tab via the mobile tab bar (SPA navigation — token stays in memory)
            cy.contains('button', 'Jobs').click()
            cy.wait('@myJobs')

            // Open the create form
            jobsListPage.clickPostNewJob()
            jobPostingPage.getCreateForm().should('be.visible')

            // Fill title, description, and the required location (lat/lng makes the form valid)
            jobPostingPage
                .fillTitle('Rewire living room lights')
                .fillDescription('Need an electrician to rewire the lights in my living room.')
                .fillLocation('London')

            cy.wait('@geocoding')
            jobPostingPage.selectFirstLocationSuggestion()

            jobPostingPage.submitCreate()

            cy.wait('@createJob')

            // Lands on the new job inside the customer's dashboard, not the public /jobs browse page.
            cy.location('pathname').should('eq', '/dashboard/jobs/11')
            cy.contains('h1', 'Rewire living room lights').should('be.visible')

            // The owner immediately sees nearby workers to reach out to.
            cy.wait('@nearbyWorkers')
            cy.contains('h2', 'Suggested workers near you').should('be.visible')
            cy.contains('Javier Hensley').should('be.visible')
            cy.contains('2.4 km away').should('be.visible')
        })
    })

    // ─── 2. Customer edits a job ───────────────────────────────────────────────

    describe('Customer — edits a job', () => {
        beforeEach(() => {
            const job = mockJob()
            asCustomer()
            cy.intercept('GET', '**/api/v1/jobs/my', {statusCode: 200, body: mockJobsResponse([job])}).as('myJobs')
            cy.intercept('GET', '**/api/v1/jobs/10/applications*', {statusCode: 200, body: mockApplicationsResponse([])}).as('applications')
            // Edit form pre-populates from GET /jobs/:id; also used by JobDetailPage after redirect
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: job}).as('jobDetail')

            cy.visit('/dashboard/jobs')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@myJobs')
        })

        it('customer can update the job title and is redirected to the job detail page', () => {
            const updated = mockJob({title: 'Fix bathroom sink (urgent)'})
            cy.intercept('PATCH', '**/api/v1/jobs/10', {statusCode: 200, body: updated}).as('updateJob')

            jobsListPage.clickEditJob('Fix leaking kitchen sink')
            jobPostingPage.getEditForm().should('be.visible')

            jobPostingPage.fillTitle('Fix bathroom sink (urgent)').submitEdit()

            cy.wait('@updateJob')
            cy.url().should('include', '/jobs/10')
        })
    })

    // ─── 3. Customer deletes a job ─────────────────────────────────────────────

    describe('Customer — deletes a job', () => {
        beforeEach(() => {
            asCustomer()
            cy.intercept('GET', '**/api/v1/jobs/my', {statusCode: 200, body: mockJobsResponse([mockJob()])}).as('myJobs')
            cy.intercept('GET', '**/api/v1/jobs/10/applications*', {statusCode: 200, body: mockApplicationsResponse([])}).as('applications')

            cy.visit('/dashboard/jobs')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@myJobs')
        })

        it('job disappears from the list after the customer confirms deletion', () => {
            cy.intercept('DELETE', '**/api/v1/jobs/10', {statusCode: 204}).as('deleteJob')
            // Invalidation triggers a refetch — return an empty list so the card is removed
            cy.intercept('GET', '**/api/v1/jobs/my', {statusCode: 200, body: mockJobsResponse([])}).as('myJobsEmpty')

            jobsListPage.clickDeleteJob('Fix leaking kitchen sink')
            cy.get('[role="alertdialog"]').should('be.visible')

            jobsListPage.confirmDelete()
            cy.wait('@deleteJob')
            cy.wait('@myJobsEmpty')

            cy.get('[aria-label="Delete job Fix leaking kitchen sink"]').should('not.exist')
        })
    })

    // ─── 4. Worker cannot post a job ──────────────────────────────────────────

    describe('Worker — cannot post a job', () => {
        it('worker visiting /dashboard/jobs/create sees the worker dashboard, not the create form', () => {
            asWorker()

            cy.visit('/dashboard/jobs/create')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@workerProfile')

            // RoleBasedDashboard renders WorkerDashboardPage for workers (no <Outlet>),
            // so the nested jobs/create route is never mounted
            jobPostingPage.getCreateForm().should('not.exist')
        })
    })

    // ─── 5. Worker applies to an open job ─────────────────────────────────────

    describe('Worker — applies to an open job', () => {
        beforeEach(() => {
            asWorker()
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: mockJob()}).as('jobDetail')

            cy.visit('/jobs/10')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@jobDetail')
        })

        it('worker submits an application and sees the confirmation button', () => {
            cy.intercept('POST', '**/api/v1/jobs/10/apply', {
                statusCode: 201,
                body: mockApplication(),
            }).as('applyJob')

            jobDetailPage.clickApply()
            cy.get('[role="dialog"]').should('be.visible')

            jobDetailPage.fillApplicationMessage('I can fix it by end of day.').submitApplication()

            cy.wait('@applyJob')
            jobDetailPage.getApplicationSubmittedButton().should('be.visible')
        })
    })

    // ─── 6. Customer accepts an application → application status change ────────

    describe('Customer — accepts an application', () => {
        const job = mockJob()
        const application = mockApplication()

        beforeEach(() => {
            asCustomer()
            cy.intercept('GET', '**/api/v1/jobs/my', {statusCode: 200, body: mockJobsResponse([job])}).as('myJobs')
            cy.intercept('GET', '**/api/v1/jobs/10/applications*', {
                statusCode: 200,
                body: mockApplicationsResponse([application]),
            }).as('applications')

            cy.visit('/dashboard/jobs')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@myJobs')
            cy.wait('@applications')
        })

        it('application status changes to Accepted immediately after the customer confirms', () => {
            const accepted = mockApplication({status: 'accepted'})
            cy.intercept('PATCH', '**/api/v1/jobs/10/applications/100', {
                statusCode: 200,
                body: accepted,
            }).as('acceptApplication')

            // Expand the applications panel to reveal the cards
            jobsListPage.expandApplicationsPanel()
            cy.contains('Javier Hensley').should('be.visible')

            // Click Accept on the application card
            jobsListPage.clickAcceptApplication()
            cy.get('[role="alertdialog"]').should('be.visible')

            // Confirm in the dialog — the AlertDialogAction closes the dialog and
            // onMutate fires the optimistic cache update synchronously
            jobsListPage.confirmAccept()

            // Dialog closes; the optimistic update has already applied
            cy.get('[role="alertdialog"]').should('not.exist')

            // Wait for the PATCH to complete (server confirms the new status)
            cy.wait('@acceptApplication')

            // Application shows Accepted badge
            cy.contains('Accepted').should('be.visible')
            // Accept / Reject action buttons are gone (canAct = false when status !== "pending")
            cy.contains('button', 'Accept').should('not.exist')
        })
    })

    // ─── 7. Duplicate application is blocked ──────────────────────────────────

    describe('Worker — duplicate application is blocked', () => {
        beforeEach(() => {
            asWorker()
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: mockJob()}).as('jobDetail')

            cy.visit('/jobs/10')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@jobDetail')
        })

        it('shows a toast error and replaces the apply button when the worker already applied', () => {
            cy.intercept('POST', '**/api/v1/jobs/10/apply', {
                statusCode: 400,
                body: {detail: 'Already applied to this job'},
            }).as('applyDuplicate')

            jobDetailPage.clickApply()
            cy.get('[role="dialog"]').should('be.visible')

            jobDetailPage.fillApplicationMessage('Please hire me.').submitApplication()

            cy.wait('@applyDuplicate')

            // Toast displays the API error message
            jobDetailPage.getToast().should('contain.text', 'Already applied to this job')
            // Apply button is replaced by the disabled "Application submitted" state
            jobDetailPage.getApplicationSubmittedButton().should('be.visible')
        })
    })
})

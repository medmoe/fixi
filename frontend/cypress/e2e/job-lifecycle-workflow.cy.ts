/// <reference types="cypress" />
import {CustomerJobsListPage, PublicJobDetailPage} from './support/pages/job.pages'
import {mockApplication, mockApplicationsResponse, mockCustomer, mockJob, mockWorkerProfile, mockWorkerUser} from '../fixtures/jobs'

// ─── Auth helpers ─────────────────────────────────────────────────────────────
// Same approach as job-posting-workflow.cy.ts: mock the silent token refresh
// so tests can cy.visit() any URL without going through the login form.

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

describe('Job Lifecycle Workflow - POM Style', () => {
    const jobDetailPage = new PublicJobDetailPage()
    const jobsListPage = new CustomerJobsListPage()

    beforeEach(() => {
        cy.clearAllSessionStorage()
        cy.clearCookies()
    })

    // ─── 1. Worker confirms an accepted application → job becomes assigned ────

    describe('Worker — confirms an accepted application', () => {
        beforeEach(() => {
            asWorker()
            const acceptedApp = mockApplication({status: 'accepted', accepted_at: '2026-09-18T10:00:00Z'})
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: mockJob()}).as('jobDetail')
            cy.intercept('GET', '**/api/v1/jobs/10/my-application', {statusCode: 200, body: acceptedApp}).as('myApplication')

            cy.visit('/jobs/10')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@jobDetail')
            cy.wait('@myApplication')
        })

        it('moves the job to assigned and shows the start-job card', () => {
            const confirmedApp = mockApplication({
                status: 'accepted',
                accepted_at: '2026-09-18T10:00:00Z',
                worker_confirmed_at: '2026-09-18T10:05:00Z',
            })
            cy.intercept('POST', '**/api/v1/jobs/10/applications/100/confirm', {
                statusCode: 200,
                body: confirmedApp,
            }).as('confirmApplication')
            // Confirming invalidates both caches — the job flips to assigned
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: mockJob({status: 'assigned'})}).as('jobAfterConfirm')
            cy.intercept('GET', '**/api/v1/jobs/10/my-application', {statusCode: 200, body: confirmedApp}).as('myApplicationAfterConfirm')

            cy.contains("You've been accepted for this job!").should('be.visible')
            jobDetailPage.clickConfirmAssignment()

            cy.wait('@confirmApplication')
            cy.wait('@jobAfterConfirm')
            cy.wait('@myApplicationAfterConfirm')

            cy.contains("You're assigned to this job.").should('be.visible')
            cy.contains('button', 'Start job').should('be.visible')
        })
    })

    // ─── 2. Worker withdraws a still-pending application ───────────────────────

    describe('Worker — withdraws a pending application', () => {
        beforeEach(() => {
            asWorker()
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: mockJob()}).as('jobDetail')
            cy.intercept('GET', '**/api/v1/jobs/10/my-application', {statusCode: 200, body: mockApplication({status: 'pending'})}).as('myApplication')

            cy.visit('/jobs/10')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@jobDetail')
            cy.wait('@myApplication')
        })

        it('removes the pending-review card after withdrawing with a reason', () => {
            const withdrawn = mockApplication({status: 'rejected', decline_reason: 'schedule_conflict'})
            cy.intercept('POST', '**/api/v1/jobs/10/applications/100/withdraw', {
                statusCode: 200,
                body: withdrawn,
            }).as('withdrawApplication')
            cy.intercept('GET', '**/api/v1/jobs/10/my-application', {statusCode: 200, body: withdrawn}).as('myApplicationAfterWithdraw')

            cy.contains('Your application is pending review.').should('be.visible')
            jobDetailPage.clickWithdraw()

            cy.get('[role="dialog"]').should('be.visible')
            jobDetailPage.selectWithdrawReason('Schedule conflict')
            jobDetailPage.confirmWithdraw()

            cy.wait('@withdrawApplication')
            cy.wait('@myApplicationAfterWithdraw')
            cy.get('[role="dialog"]').should('not.exist')
            cy.contains('Your application is pending review.').should('not.exist')
        })
    })

    // ─── 3. Confirmed worker starts an assigned job ────────────────────────────

    describe('Worker — starts an assigned job', () => {
        beforeEach(() => {
            asWorker()
            const confirmedApp = mockApplication({
                status: 'accepted',
                accepted_at: '2026-09-18T10:00:00Z',
                worker_confirmed_at: '2026-09-18T10:05:00Z',
            })
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: mockJob({status: 'assigned'})}).as('jobDetail')
            cy.intercept('GET', '**/api/v1/jobs/10/my-application', {statusCode: 200, body: confirmedApp}).as('myApplication')

            cy.visit('/jobs/10')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@jobDetail')
            cy.wait('@myApplication')
        })

        it('moves the job to in progress and shows the mark-complete card', () => {
            cy.intercept('POST', '**/api/v1/jobs/10/start', {
                statusCode: 200,
                body: mockJob({status: 'in_progress'}),
            }).as('startJob')
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: mockJob({status: 'in_progress'})}).as('jobAfterStart')

            cy.contains("You're assigned to this job.").should('be.visible')
            jobDetailPage.clickStartJob()

            cy.wait('@startJob')
            cy.wait('@jobAfterStart')

            cy.contains('Is this job done?').should('be.visible')
            cy.contains('button', 'Mark as complete').should('be.visible')
        })
    })

    // ─── 4. Worker marks their side complete, waits on the customer ────────────

    describe('Worker — marks their side of an in-progress job complete', () => {
        beforeEach(() => {
            asWorker()
            const confirmedApp = mockApplication({
                status: 'accepted',
                accepted_at: '2026-09-18T10:00:00Z',
                worker_confirmed_at: '2026-09-18T10:05:00Z',
            })
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: mockJob({status: 'in_progress'})}).as('jobDetail')
            cy.intercept('GET', '**/api/v1/jobs/10/my-application', {statusCode: 200, body: confirmedApp}).as('myApplication')

            cy.visit('/jobs/10')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@jobDetail')
            cy.wait('@myApplication')
        })

        it('shows a waiting message instead of flipping the job to completed', () => {
            const stillInProgress = mockJob({status: 'in_progress', worker_marked_complete_at: '2026-09-18T12:00:00Z'})
            cy.intercept('POST', '**/api/v1/jobs/10/complete', {statusCode: 200, body: stillInProgress}).as('completeJob')
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: stillInProgress}).as('jobAfterComplete')

            cy.contains('Is this job done?').should('be.visible')
            jobDetailPage.clickMarkComplete()

            cy.wait('@completeJob')
            cy.wait('@jobAfterComplete')

            cy.contains('Marked complete — waiting for the other party to confirm.').should('be.visible')
        })
    })

    // ─── 5. Customer completes the job after the worker already did ───────────

    describe('Customer — marks the second side complete', () => {
        beforeEach(() => {
            asCustomer()
            const job = mockJob({status: 'in_progress', worker_marked_complete_at: '2026-09-18T12:00:00Z'})
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: job}).as('jobDetail')

            cy.visit('/jobs/10')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@jobDetail')
        })

        it('flips the job to completed once both sides have confirmed', () => {
            const completed = mockJob({
                status: 'completed',
                worker_marked_complete_at: '2026-09-18T12:00:00Z',
                customer_marked_complete_at: '2026-09-18T13:00:00Z',
            })
            cy.intercept('POST', '**/api/v1/jobs/10/complete', {statusCode: 200, body: completed}).as('completeJob')
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: completed}).as('jobAfterComplete')
            // Job flips to completed, so ReviewCard mounts and fires this — not under test here.
            cy.intercept('GET', '**/api/v1/jobs/10/review-status', {
                statusCode: 200,
                body: {can_review: false, reason: 'not_a_participant'},
            }).as('reviewStatus')

            cy.contains('Is this job done?').should('be.visible')
            jobDetailPage.clickMarkComplete()

            cy.wait('@completeJob')
            cy.wait('@jobAfterComplete')

            cy.contains('completed').should('be.visible')
        })
    })

    // ─── 6. Customer's job card on the dashboard jobs tab reflects a status ───
    //        change made on the detail page, without a hard refresh.

    describe('Customer — job card status stays in sync with the detail page', () => {
        it('shows the updated status on the dashboard jobs tab after completing a job from the detail page', () => {
            asCustomer()
            const inProgressJob = mockJob({
                id: 10,
                title: 'Fix leaking kitchen sink',
                status: 'in_progress',
                worker_marked_complete_at: '2026-09-18T12:00:00Z',
            })

            // The dashboard jobs list is fetched on the initial visit (in_progress)
            // and again after navigating back from the detail page — the fix
            // under test is that the second fetch reflects the new status.
            let myJobsCallCount = 0
            cy.intercept('GET', '**/api/v1/jobs/my', (req) => {
                myJobsCallCount += 1
                const job = myJobsCallCount === 1
                    ? inProgressJob
                    : mockJob({...inProgressJob, status: 'completed', customer_marked_complete_at: '2026-09-18T13:00:00Z'})
                req.reply({statusCode: 200, body: {data: [job], total_count: 1, has_more: false, page: 1, items_per_page: 50}})
            }).as('myJobs')

            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: inProgressJob}).as('jobDetail')
            // JobApplicationsPanel fetches this unconditionally for every card on mount.
            cy.intercept('GET', '**/api/v1/jobs/10/applications*', {statusCode: 200, body: mockApplicationsResponse([])}).as('applications')

            cy.visit('/dashboard/jobs')
            cy.wait('@authRefresh')
            cy.wait('@userMe')
            cy.wait('@myJobs')

            jobsListPage.getJobCardStatus('Fix leaking kitchen sink').should('contain.text', 'in progress')

            jobsListPage.clickViewJob('Fix leaking kitchen sink')
            cy.wait('@jobDetail')
            cy.url().should('include', '/dashboard/jobs/10')

            const completedJob = mockJob({
                ...inProgressJob,
                status: 'completed',
                customer_marked_complete_at: '2026-09-18T13:00:00Z',
            })
            cy.intercept('POST', '**/api/v1/jobs/10/complete', {statusCode: 200, body: completedJob}).as('completeJob')
            cy.intercept('GET', '**/api/v1/jobs/10', {statusCode: 200, body: completedJob}).as('jobAfterComplete')
            cy.intercept('GET', '**/api/v1/jobs/10/review-status', {
                statusCode: 200,
                body: {can_review: false, reason: 'not_a_participant'},
            }).as('reviewStatus')

            cy.contains('Is this job done?').should('be.visible')
            jobDetailPage.clickMarkComplete()

            cy.wait('@completeJob')
            cy.wait('@jobAfterComplete')
            cy.contains('completed').should('be.visible')

            // Navigate back to the dashboard jobs tab via SPA navigation (no reload).
            cy.contains('button', 'Back').click()
            cy.url().should('include', '/dashboard/jobs')
            cy.url().should('not.include', '/dashboard/jobs/10')

            cy.wait('@myJobs')
            jobsListPage.getJobCardStatus('Fix leaking kitchen sink').should('contain.text', 'completed')
        })
    })
})

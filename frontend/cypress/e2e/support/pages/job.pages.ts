/// <reference types="cypress" />

// ─── Job Posting Page (Create / Edit forms) ──────────────────────────────────

export class JobPostingPage {
    private readonly selectors = {
        createForm: 'form[aria-label="Create job form"]',
        editForm: 'form[aria-label="Edit job form"]',
        titleField: '[aria-label="Job Title"]',
        descriptionField: '[aria-label="Job Description"]',
        submitCreateBtn: '[aria-label="Submit job"]',
        submitEditBtn: '[aria-label="Update job"]',
    }

    visitCreate() {
        cy.visit('/dashboard/jobs/create')
        return this
    }

    visitEdit(jobId: number) {
        cy.visit(`/dashboard/jobs/${jobId}/edit`)
        return this
    }

    fillTitle(title: string) {
        cy.get(this.selectors.titleField).clear().type(title)
        return this
    }

    fillDescription(description: string) {
        cy.get(this.selectors.descriptionField).clear().type(description)
        return this
    }

    submitCreate() {
        cy.get(this.selectors.submitCreateBtn).click()
        return this
    }

    submitEdit() {
        cy.get(this.selectors.submitEditBtn).click()
        return this
    }

    fillLocation(query: string) {
        cy.get('input[role="combobox"]').clear().type(query)
        return this
    }

    selectFirstLocationSuggestion() {
        cy.get('[role="listbox"] button[role="option"]').first().click()
        return this
    }

    getCreateForm() {
        return cy.get(this.selectors.createForm)
    }

    getEditForm() {
        return cy.get(this.selectors.editForm)
    }
}

// ─── Customer Jobs List Page ─────────────────────────────────────────────────

export class CustomerJobsListPage {
    editJobBtn(title: string) {
        return cy.get(`[aria-label="Edit job ${title}"]`)
    }

    deleteJobBtn(title: string) {
        return cy.get(`[aria-label="Delete job ${title}"]`)
    }

    viewJobBtn(title: string) {
        return cy.get(`[aria-label="View job ${title}"]`)
    }

    // Scopes to the job's own Card so the status badge assertion can't match
    // a different job's badge when multiple jobs are listed.
    getJobCardStatus(title: string) {
        return cy.contains(title).parents('[data-slot="card"]').find('[data-slot="badge"]')
    }

    visit() {
        cy.visit('/dashboard/jobs')
        return this
    }

    clickPostNewJob() {
        cy.contains('button', 'Post New Job').click()
        return this
    }

    clickEditJob(title: string) {
        this.editJobBtn(title).click()
        return this
    }

    clickViewJob(title: string) {
        this.viewJobBtn(title).click()
        return this
    }

    clickDeleteJob(title: string) {
        this.deleteJobBtn(title).click()
        return this
    }

    confirmDelete() {
        cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
        return this
    }

    expandApplicationsPanel() {
        cy.contains('button', 'Applications').first().click()
        return this
    }

    clickAcceptApplication() {
        // Scoped to the card area (dialog is not open at this point)
        cy.contains('button', 'Accept').click()
        return this
    }

    confirmAccept() {
        // Scoped to the AlertDialog to avoid matching the card Accept button
        cy.get('[role="alertdialog"]').contains('button', 'Accept').click()
        return this
    }

    getToast() {
        return cy.get('[data-sonner-toast]')
    }
}

// ─── Public Job Detail Page ──────────────────────────────────────────────────

export class PublicJobDetailPage {
    visit(jobId: number) {
        cy.visit(`/jobs/${jobId}`)
        return this
    }

    clickApply() {
        cy.contains('button', 'Apply to this job').click()
        return this
    }

    fillApplicationMessage(message: string) {
        cy.get('[aria-label="Application message"]').clear().type(message)
        return this
    }

    submitApplication() {
        cy.contains('button', 'Submit application').click()
        return this
    }

    getApplicationSubmittedButton() {
        return cy.contains('button', 'Application submitted')
    }

    getApplyButton() {
        return cy.contains('button', 'Apply to this job')
    }

    getToast() {
        return cy.get('[data-sonner-toast]')
    }

    // ─── Job Lifecycle Actions ───────────────────────────────────────────

    clickConfirmAssignment() {
        cy.contains('button', 'Confirm assignment').click()
        return this
    }

    clickWithdraw() {
        // Matches both the accepted-but-unconfirmed "Withdraw" button and the
        // still-pending "Withdraw application" button.
        cy.contains('button', /^Withdraw/).click()
        return this
    }

    selectWithdrawReason(label: string) {
        cy.get('[aria-label="Reason for withdrawing"]').click()
        cy.contains('[role="option"]', label).click()
        return this
    }

    confirmWithdraw() {
        cy.get('[role="dialog"]').contains('button', 'Withdraw').click()
        return this
    }

    clickStartJob() {
        cy.contains('button', 'Start job').click()
        return this
    }

    clickMarkComplete() {
        cy.contains('button', 'Mark as complete').click()
        return this
    }
}

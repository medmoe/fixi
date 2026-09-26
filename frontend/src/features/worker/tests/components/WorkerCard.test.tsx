import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {WorkerCard} from "@/features/worker/components/WorkerCard";
import {WorkerCardSkeleton} from "@/features/worker/components/WorkerCardSkeleton";
import {mockWorker} from "@/features/worker/tests/mocks";

const renderCard = (props: React.ComponentProps<typeof WorkerCard>) =>
    render(<WorkerCard {...props} />, {wrapper: MemoryRouter});

describe("WorkerCard", () => {

    // ------------------------------------------------------------------ //
    //  Snapshot                                                            //
    // ------------------------------------------------------------------ //

    describe("snapshot", () => {
        it("matches snapshot with full profile data", () => {
            const {container} = renderCard({profile: mockWorker(1, {is_available: true, is_verified: true})});
            expect(container).toMatchSnapshot();
        });

        it("matches snapshot for skeleton loading state", () => {
            const {container} = render(<WorkerCardSkeleton/>);
            expect(container).toMatchSnapshot();
        });
    });

    // ------------------------------------------------------------------ //
    //  Content rendering                                                   //
    // ------------------------------------------------------------------ //

    describe("content", () => {
        it("renders the worker name", () => {
            renderCard({profile: mockWorker(1)});
            expect(screen.getByText("Worker 1")).toBeInTheDocument();
        });

        it("renders the avatar fallback initials when no avatar_url", () => {
            renderCard({profile: mockWorker(1)});
            expect(screen.getByText("W1")).toBeInTheDocument();
        });

        it("renders trade badges", () => {
            renderCard({profile: mockWorker(1)});
            expect(screen.getByText("Plumbing")).toBeInTheDocument();
            expect(screen.getByText("Electrical")).toBeInTheDocument();
        });

        it("renders no trade badges when trade_categories is empty", () => {
            renderCard({profile: mockWorker(1, {trade_categories: []})});
            expect(screen.queryByText("Plumbing")).not.toBeInTheDocument();
        });

        it("renders the hourly rate formatted to two decimals", () => {
            renderCard({profile: mockWorker(1, {hourly_rate: "75"})});
            expect(screen.getByText("$75.00/hr")).toBeInTheDocument();
        });

        it("does not render hourly rate when null", () => {
            renderCard({profile: mockWorker(1, {hourly_rate: null})});
            expect(screen.queryByText(/\/hr/)).not.toBeInTheDocument();
        });

        it("renders the service radius", () => {
            renderCard({profile: mockWorker(1, {service_radius_km: 20})});
            expect(screen.getByText("20 km radius")).toBeInTheDocument();
        });

        it("renders the bio when present", () => {
            renderCard({profile: mockWorker(1)});
            expect(screen.getByText(/experienced plumber/i)).toBeInTheDocument();
        });

        it("does not render a bio paragraph when bio is null", () => {
            renderCard({profile: mockWorker(1, {bio: null})});
            expect(screen.queryByText(/experienced plumber/i)).not.toBeInTheDocument();
        });

        it("renders 'New' when the worker has no rating yet", () => {
            renderCard({profile: mockWorker(1, {average_rating: null, review_count: 0})});
            expect(screen.getByText("New")).toBeInTheDocument();
        });

        it("renders the real average rating and review count once the worker has reviews", () => {
            renderCard({profile: mockWorker(1, {average_rating: "4.50", review_count: 12})});
            expect(screen.getByText("4.5 (12)")).toBeInTheDocument();
            expect(screen.queryByText("New")).not.toBeInTheDocument();
        });

        it("renders years of experience when present", () => {
            renderCard({profile: mockWorker(1, {years_of_experience: 5})});
            expect(screen.getByText(/5 yrs exp/i)).toBeInTheDocument();
        });

        it("does not render years of experience when null", () => {
            renderCard({profile: mockWorker(1, {years_of_experience: null})});
            expect(screen.queryByText(/yrs exp/i)).not.toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------ //
    //  Verified badge                                                      //
    // ------------------------------------------------------------------ //

    describe("verified badge", () => {
        it("shows the verified badge when is_verified is true", () => {
            renderCard({profile: mockWorker(1, {is_verified: true})});
            expect(screen.getByLabelText("Verified worker")).toBeInTheDocument();
        });

        it("does not show the verified badge when is_verified is false", () => {
            renderCard({profile: mockWorker(1, {is_verified: false})});
            expect(screen.queryByLabelText("Verified worker")).not.toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------ //
    //  Availability indicator                                              //
    // ------------------------------------------------------------------ //

    describe("availability indicator", () => {
        it('shows "Available" when is_available is true', () => {
            renderCard({profile: mockWorker(1, {is_available: true})});
            expect(screen.getByText("Available")).toBeInTheDocument();
        });

        it('shows "Unavailable" when is_available is false', () => {
            renderCard({profile: mockWorker(1, {is_available: false})});
            expect(screen.getByText("Unavailable")).toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------ //
    //  Distance                                                             //
    // ------------------------------------------------------------------ //

    describe("cover image", () => {
        it("shows the first portfolio photo as a cover when search returned one", () => {
            renderCard({profile: mockWorker(1, {cover_image_url: "https://cdn.example.com/work.jpg"})});
            expect(screen.getByTestId("worker-card-cover")).toHaveAttribute("src", "https://cdn.example.com/work.jpg");
        });

        it("has no cover when the worker has no portfolio photos", () => {
            renderCard({profile: mockWorker(1, {cover_image_url: null})});
            expect(screen.queryByTestId("worker-card-cover")).not.toBeInTheDocument();
        });
    });

    describe("distance", () => {
        it("shows distance when provided", () => {
            renderCard({profile: mockWorker(1), distance_km: 2.3});
            expect(screen.getByText("2.3 km away")).toBeInTheDocument();
        });

        it("rounds distance to one decimal place", () => {
            renderCard({profile: mockWorker(1), distance_km: 2.349});
            expect(screen.getByText("2.3 km away")).toBeInTheDocument();
        });

        it("does not show distance when not provided", () => {
            renderCard({profile: mockWorker(1)});
            expect(screen.queryByText(/km away/i)).not.toBeInTheDocument();
        });

        it("shows distance of 0 when explicitly provided as 0", () => {
            renderCard({profile: mockWorker(1), distance_km: 0});
            expect(screen.getByText("0.0 km away")).toBeInTheDocument();
        });

        it("uses the distance_km returned on the profile by geo searches", () => {
            renderCard({profile: mockWorker(1, {distance_km: 4.26})});
            expect(screen.getByText("4.3 km away")).toBeInTheDocument();
        });

        it("hides distance when the profile's distance_km is null (non-geo search)", () => {
            renderCard({profile: mockWorker(1, {distance_km: null})});
            expect(screen.queryByText(/km away/i)).not.toBeInTheDocument();
        });

        it("prefers an explicit distance_km prop over the profile's", () => {
            renderCard({profile: mockWorker(1, {distance_km: 9}), distance_km: 1.5});
            expect(screen.getByText("1.5 km away")).toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------ //
    //  Link / navigation                                                   //
    // ------------------------------------------------------------------ //

    describe("navigation", () => {
        it("links to /workers/{id}", () => {
            renderCard({profile: mockWorker(7)});
            expect(screen.getByRole("link")).toHaveAttribute("href", "/workers/7");
        });
    });

    // ------------------------------------------------------------------ //
    //  Accessibility                                                       //
    // ------------------------------------------------------------------ //

    describe("accessibility", () => {
        it("has role article", () => {
            renderCard({profile: mockWorker(1)});
            expect(screen.getByRole("article")).toBeInTheDocument();
        });

        it("has an aria-label including the worker's name", () => {
            renderCard({profile: mockWorker(1)});
            expect(screen.getByRole("article")).toHaveAttribute(
                "aria-label",
                "Worker profile for Worker 1"
            );
        });

        it("skeleton has role status for screen reader loading announcement", () => {
            render(<WorkerCardSkeleton/>);
            expect(screen.getByRole("status")).toBeInTheDocument();
        });
    });
});
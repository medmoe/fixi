import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";

import {AdminAnalyticsPage} from "../AdminAnalyticsPage";
import {useAnalyticsDashboard} from "../../hooks/useAnalyticsDashboard";

vi.mock("../../components/NotificationDeliveryCard", () => ({NotificationDeliveryCard: () => <div data-testid="notification-delivery-card"/>}));
vi.mock("../../hooks/useAnalyticsDashboard", () => ({useAnalyticsDashboard: vi.fn()}));
vi.mock("@/features/worker/hooks/useLocalizedTradeName", () => ({
    useLocalizedTradeName: () => (trade: any) => trade?.display_name ?? "",
}));
vi.mock("../../components/AnalyticsFilterBar", () => ({AnalyticsFilterBar: () => <div data-testid="filter-bar"/>}));
vi.mock("../../components/AnalyticsOverviewCards", () => ({AnalyticsOverviewCards: () => <div data-testid="overview-cards"/>}));
vi.mock("../../components/DailyTrendChart", () => ({DailyTrendChart: () => <div data-testid="daily-trend"/>}));
vi.mock("../../components/ConversionFunnelChart", () => ({ConversionFunnelChart: () => <div data-testid="funnel-chart"/>}));
vi.mock("../../components/AnalyticsBreakdownList", () => ({
    AnalyticsBreakdownList: ({rows}: any) => <div data-testid="breakdown-list">{rows.length} rows</div>,
}));

const mockUseDashboard = vi.mocked(useAnalyticsDashboard);

const mockOverview = {jobs_posted: 1, applications_submitted: 1, applications_accepted: 0, jobs_completed: 0, acceptance_rate: 0, completion_rate: 0, daily: []};
const mockBreakdown = {
    by_trade_category: [{trade_category_id: 1, display_name: "Plumbing", display_name_ar: null, display_name_fr: null, job_count: 2}],
    by_location: [{location: "Algiers", job_count: 2}],
};
const mockFunnel = {posted: 1, applied: 0, accepted: 0, completed: 0};

describe("AdminAnalyticsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseDashboard.mockReturnValue({
            filters: {}, updateFilters: vi.fn(), overview: mockOverview, breakdown: mockBreakdown, funnel: mockFunnel,
            isLoading: false, isError: false,
        } as any);
    });

    it("shows a loading message while loading", () => {
        mockUseDashboard.mockReturnValue({filters: {}, updateFilters: vi.fn(), overview: undefined, breakdown: undefined, funnel: undefined, isLoading: true, isError: false} as any);
        render(<AdminAnalyticsPage/>);
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("shows an error message when a query fails", () => {
        mockUseDashboard.mockReturnValue({filters: {}, updateFilters: vi.fn(), overview: undefined, breakdown: undefined, funnel: undefined, isLoading: false, isError: true} as any);
        render(<AdminAnalyticsPage/>);
        expect(screen.getByText("Something went wrong loading analytics. Please try again.")).toBeInTheDocument();
    });

    it("always shows the notification delivery card, even while analytics are loading or failing", () => {
        mockUseDashboard.mockReturnValue({filters: {}, updateFilters: vi.fn(), overview: undefined, breakdown: undefined, funnel: undefined, isLoading: false, isError: true} as any);
        render(<AdminAnalyticsPage/>);
        expect(screen.getByTestId("notification-delivery-card")).toBeInTheDocument();
    });

    it("renders the overview cards and daily trend once loaded", () => {
        render(<AdminAnalyticsPage/>);
        expect(screen.getByTestId("overview-cards")).toBeInTheDocument();
        expect(screen.getByTestId("daily-trend")).toBeInTheDocument();
    });

    it("renders the funnel chart", () => {
        render(<AdminAnalyticsPage/>);
        expect(screen.getByTestId("funnel-chart")).toBeInTheDocument();
    });

    it("renders both breakdown lists", () => {
        render(<AdminAnalyticsPage/>);
        expect(screen.getAllByTestId("breakdown-list")).toHaveLength(2);
    });
});

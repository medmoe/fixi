// TitleField.test.tsx
import {describe, it, expect} from "vitest";
import {render, screen, act} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useForm, FormProvider} from "react-hook-form";
import {TitleField} from "../TitleField";

const Wrapper = ({defaultValues = {}}: { defaultValues?: Record<string, unknown> }) => {
    const methods = useForm({defaultValues});
    return (
        <FormProvider {...methods}>
            <form>
                <TitleField/>
            </form>
        </FormProvider>
    );
};

describe("TitleField", () => {

    describe("rendering", () => {
        it("renders the label", () => {
            render(<Wrapper/>);
            expect(screen.getByLabelText("Job Title")).toBeInTheDocument();
        });

        it("renders the placeholder", () => {
            render(<Wrapper/>);
            expect(screen.getByPlaceholderText(/fix leaking kitchen sink/i)).toBeInTheDocument();
        });

        it("renders the character counter at 0 by default", () => {
            render(<Wrapper/>);
            expect(screen.getByText("0/255 chars")).toBeInTheDocument();
        });

        it("renders with a pre-filled default value", () => {
            render(<Wrapper defaultValues={{title: "Fix sink"}}/>);
            expect(screen.getByDisplayValue("Fix sink")).toBeInTheDocument();
        });
    });

    describe("character counter", () => {
        it("updates the counter as the user types", async () => {
            render(<Wrapper/>);
            const input = screen.getByLabelText("Job Title");
            await act(async () => await userEvent.type(input, "Hello"));
            expect(screen.getByText("5/255 chars")).toBeInTheDocument();
        });

        it("shows counter in normal style when under the limit", () => {
            render(<Wrapper defaultValues={{title: "Short title"}}/>);
            const counter = screen.getByText("11/255 chars");
            expect(counter).toHaveClass("text-muted-foreground");
            expect(counter).not.toHaveClass("text-destructive");
        });

        it("shows counter in destructive style when over 255 characters", async () => {
            render(<Wrapper defaultValues={{title: "a".repeat(256)}}/>);
            const counter = screen.getByText("256/255 chars");
            expect(counter).toHaveClass("text-destructive");
            expect(counter).toHaveClass("font-bold");
        });

        it("shows counter in normal style at exactly 255 characters", () => {
            render(<Wrapper defaultValues={{title: "a".repeat(255)}}/>);
            const counter = screen.getByText("255/255 chars");
            expect(counter).toHaveClass("text-muted-foreground");
            expect(counter).not.toHaveClass("text-destructive");
        });
    });

    describe("accessibility", () => {
        it("has aria-live polite on the counter", () => {
            render(<Wrapper/>);
            const counter = screen.getByText("0/255 chars");
            expect(counter).toHaveAttribute("aria-live", "polite");
        });

        it("input has correct aria-label", () => {
            render(<Wrapper/>);
            expect(screen.getByRole("textbox", {name: "Job Title"})).toBeInTheDocument();
        });

        it("label is associated with the input via htmlFor", () => {
            render(<Wrapper/>);
            const input = screen.getByLabelText("Job Title");
            expect(input).toHaveAttribute("id", "job-title");
        });
    });

    describe("user interaction", () => {
        it("accepts user input", async () => {
            render(<Wrapper/>);
            const input = screen.getByLabelText("Job Title");
            await act(async () => await userEvent.type(input, "Fix leaking sink"));
            expect(input).toHaveValue("Fix leaking sink");
        });

        it("clears correctly when content is deleted", async () => {
            render(<Wrapper defaultValues={{title: "Fix sink"}}/>);
            const input = screen.getByLabelText("Job Title");
            await act(async () => await userEvent.clear(input));
            expect(screen.getByText("0/255 chars")).toBeInTheDocument();
        });
    });
});
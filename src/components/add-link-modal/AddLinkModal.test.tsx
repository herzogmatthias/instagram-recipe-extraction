import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import matchers from "@testing-library/jest-dom/matchers";
import { AddLinkModal } from "./AddLinkModal";
import { describe, it, jest } from "@jest/globals";

expect.extend(matchers);

describe("AddLinkModal", () => {
  const defaultProps = () => ({
    open: true,
    onOpenChange: jest.fn(),
    onSubmit: jest.fn(async (_payload: { url: string; username: string }) => {
      // no-op
    }),
  });

  it("renders the input and submit button", () => {
    render(<AddLinkModal {...defaultProps()} />);

    expect(screen.getByTestId("instagram-url-input")).toBeInTheDocument();
    expect(
      screen.getByTestId("instagram-username-input")
    ).toBeInTheDocument();
    expect(screen.getByTestId("submit-instagram-url")).toBeInTheDocument();
  });

  it("shows validation error when submitting empty form", async () => {
    render(<AddLinkModal {...defaultProps()} />);

    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(
      await screen.findByText("Please paste an Instagram post URL.")
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Enter the creator's Instagram username.")
    ).toBeInTheDocument();
  });

  it("shows validation error for non-Instagram URL", async () => {
    render(<AddLinkModal {...defaultProps()} />);

    fireEvent.change(screen.getByTestId("instagram-url-input"), {
      target: { value: "https://example.com/post" },
    });
    fireEvent.change(screen.getByTestId("instagram-username-input"), {
      target: { value: "chefbot" },
    });
    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(
      await screen.findByText(
        "Enter a valid Instagram post, reel, or IGTV link."
      )
    ).toBeInTheDocument();
  });

  it("shows validation error for invalid username", async () => {
    render(<AddLinkModal {...defaultProps()} />);

    fireEvent.change(screen.getByTestId("instagram-url-input"), {
      target: { value: "https://www.instagram.com/reel/test/" },
    });
    fireEvent.change(screen.getByTestId("instagram-username-input"), {
      target: { value: "invalid user!" },
    });
    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(
      await screen.findByText(
        "Usernames can include letters, numbers, periods, and underscores."
      )
    ).toBeInTheDocument();
  });

  it("invokes onSubmit with trimmed URL and closes on success", async () => {
    const props = defaultProps();
    const submitSpy = jest.fn(async (_payload: { url: string; username: string }) => {
      // no-op
    });
    props.onSubmit = submitSpy;

    render(<AddLinkModal {...props} />);

    fireEvent.change(screen.getByTestId("instagram-url-input"), {
      target: { value: "  https://www.instagram.com/p/test/  " },
    });
    fireEvent.change(screen.getByTestId("instagram-username-input"), {
      target: { value: "  chefbot  " },
    });
    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
    expect(submitSpy).toHaveBeenCalledWith({
      url: "https://www.instagram.com/p/test/",
      username: "chefbot",
    });
    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false));
  });

  it("displays error message when submission fails", async () => {
    const props = defaultProps();
    const error = new Error("Server unavailable");
    props.onSubmit = jest.fn(async (_payload: { url: string; username: string }) => {
      throw error;
    });

    render(<AddLinkModal {...props} />);

    fireEvent.change(screen.getByTestId("instagram-url-input"), {
      target: { value: "https://www.instagram.com/reel/test/" },
    });
    fireEvent.change(screen.getByTestId("instagram-username-input"), {
      target: { value: "chefbot" },
    });
    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(await screen.findByText("Server unavailable")).toBeInTheDocument();
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

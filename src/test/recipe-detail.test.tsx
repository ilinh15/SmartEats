import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "@/App";

describe("recipe detail pages", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders stored recipe information from the route id", async () => {
    window.history.pushState({}, "", "/recipes/chocolate-lava-cake");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /chocolate lava cake/i })).toBeInTheDocument();
    expect(screen.getByText(/rich dessert with a soft sponge exterior/i)).toBeInTheDocument();
    expect(screen.getByText("Dark chocolate")).toBeInTheDocument();
    expect(screen.getByText(/bake in greased ramekins at 200 c for 12 minutes/i)).toBeInTheDocument();
  });

  it("shows the not found page for an invalid recipe id", async () => {
    window.history.pushState({}, "", "/recipes/not-a-real-recipe");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByText(/oops! page not found/i)).toBeInTheDocument();
  });

  it("returns to the home screen when the browser goes back", async () => {
    window.history.pushState({}, "", "/");
    window.history.pushState({}, "", "/recipes/acai-smoothie-bowl");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /acai smoothie bowl/i })).toBeInTheDocument();

    act(() => {
      window.history.back();
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /nearby food/i })).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/");
  });
});

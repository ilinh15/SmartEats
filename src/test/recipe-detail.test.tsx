import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "@/App";

describe("recipe detail pages", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("renders stored recipe information from the legacy route id", async () => {
    window.history.pushState({}, "", "/recipes/chocolate-lava-cake");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /chocolate lava cake/i })).toBeInTheDocument();
    expect(screen.getByText(/rich dessert with a soft sponge exterior/i)).toBeInTheDocument();
    expect(screen.getByText("Dark chocolate")).toBeInTheDocument();
    expect(screen.getByText(/bake in greased ramekins at 200 c for 12 minutes/i)).toBeInTheDocument();
  });

  it("renders cooking recommendation details from the recommendation repository", async () => {
    window.history.pushState({}, "", "/recipes/tamago-sando");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /tamago sando/i })).toBeInTheDocument();
    expect(screen.getByText(/creamy japanese egg salad/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Japanese$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Breakfast$/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Japanese mayo")).toBeInTheDocument();
    expect(screen.getByText(/sandwich the egg filling between the bread/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save tamago sando to favorites/i })).toBeInTheDocument();
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
      expect(screen.getByRole("heading", { name: /recommend to cook today/i })).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/");
  });
});

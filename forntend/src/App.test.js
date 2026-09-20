import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the attendance authentication screen", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", {
      name: /personal attendance tracking system/i,
    }),
  ).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Login" }).getAttribute("aria-selected")).toBe(
    "true",
  );
});

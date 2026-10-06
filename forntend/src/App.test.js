import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the public attendance landing page", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", {
      name: /personal attendance tracking system/i,
    }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: /try demo/i })).toBeTruthy();
  expect(screen.queryByLabelText("Login and registration form")).toBeNull();
});

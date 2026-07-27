import { expect, test } from "@playwright/test";
import { capturePageErrors } from "./helpers";

test("public preview renders its core product navigation", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  await page.goto("/");

  await expect(page.getByText("Hashgacha", { exact: true }).first()).toBeVisible();
  if ((page.viewportSize()?.width ?? 1280) <= 760) {
    await page.locator(".menu-btn").click();
  }
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole("button", { name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("button", { name: "Students" }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("button", { name: "Gradebook" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("login has accessible fields and rejects invalid credentials", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email address").fill("invalid@example.com");
  await page.getByLabel("Password").fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".form-error")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("protected application routes redirect to login", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
});

import { expect, type Page } from "@playwright/test";

export type TestRole = "principal" | "rebbi" | "mashpia";

const credentialNames: Record<TestRole, [string, string]> = {
  principal: ["E2E_PRINCIPAL_EMAIL", "E2E_PRINCIPAL_PASSWORD"],
  rebbi: ["E2E_REBBI_EMAIL", "E2E_REBBI_PASSWORD"],
  mashpia: ["E2E_MASHPIA_EMAIL", "E2E_MASHPIA_PASSWORD"],
};

export function credentialsFor(role: TestRole) {
  const [emailName, passwordName] = credentialNames[role];
  const email = process.env[emailName];
  const password = process.env[passwordName];
  return email && password ? { email, password } : null;
}

export async function signIn(
  page: Page,
  credentials: { email: string; password: string },
) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app(?:$|[/?#])/);
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
}

export function capturePageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

import { expect, test } from "@playwright/test";
import {
  capturePageErrors,
  credentialsFor,
  signIn,
  type TestRole,
} from "./helpers";

const roleCases: {
  role: TestRole;
  visible: string[];
  hidden?: string[];
}[] = [
  {
    role: "principal",
    visible: [
      "Dashboard",
      "Attendance",
      "Students",
      "Gradebook",
      "Administration",
    ],
  },
  {
    role: "rebbi",
    visible: ["Dashboard", "Attendance", "Students", "Gradebook", "Administration"],
    hidden: ["Staff"],
  },
  {
    role: "mashpia",
    visible: ["Dashboard", "Students", "Mentoring", "Reports", "Messages"],
    hidden: ["Attendance", "Gradebook"],
  },
];

for (const { role, visible, hidden = [] } of roleCases) {
  test(`${role} sees only the appropriate workspace`, async ({ page }) => {
    const credentials = credentialsFor(role);
    test.skip(!credentials, `Set disposable E2E_${role.toUpperCase()} credentials.`);

    const pageErrors = capturePageErrors(page);
    await signIn(page, credentials!);
    const navigation = page.getByRole("navigation", {
      name: "Primary navigation",
    });

    for (const item of visible) {
      await expect(
        navigation.getByRole("button", { name: item, exact: true }),
      ).toBeVisible();
    }
    for (const item of hidden) {
      await expect(
        navigation.getByRole("button", { name: item, exact: true }),
      ).toHaveCount(0);
    }

    await navigation.getByRole("button", { name: "Students" }).click();
    await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}

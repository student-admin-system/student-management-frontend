import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="اسم المستخدم"]', 'admin');
  await page.fill('input[type="password"]', 'AdminPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/');
}

test.describe('Critical User Flows E2E', () => {
  test('1. Authentication Flow: redirects to login and logs in with Admin credentials', async ({ page }) => {
    // Navigate to root
    await page.goto('/');

    // If redirected to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2:has-text("تسجيل الدخول")')).toBeVisible();

    // Fill in credentials
    await page.fill('input[placeholder="اسم المستخدم"]', 'admin');
    await page.fill('input[type="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.getByRole('heading', { name: /مرحباً بك/ })).toBeVisible();
    await expect(page.locator('text=الإجراءات السريعة')).toBeVisible();
  });

  test('2. Student Management: creates a new student and verifies student list', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to students page
    await page.goto('/students');
    await expect(page.getByRole('heading', { name: 'سجل الطلاب' })).toBeVisible();

    // Click Add Student
    await page.click('text=تسجيل طالب جديد');
    await expect(page).toHaveURL(/.*students\/new/);
    await expect(page.getByRole('heading', { name: 'تسجيل طالب جديد' })).toBeVisible();

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const testStudentName = `طالب تجريبي ${randomNum}`;
    const testPhone = `010${randomNum}5678`;

    // Fill student form using placeholder selectors
    await page.fill('input[placeholder="مثال: أحمد محمد علي محمود"]', testStudentName);
    await page.fill('input[placeholder="مثال: 01012345678"]', testPhone);
    await page.fill('input[placeholder="مثال: 01098765432"]', '01112345678');

    // Submit form with exact button text
    await page.click('button:has-text("حفظ وتسجيل الطالب")');

    // Should redirect to student profile or list
    await page.waitForURL(/.*students/);
    await page.goto('/students');
    await expect(page.locator(`text=${testStudentName}`)).toBeVisible({ timeout: 15000 });
  });

  test('3. Attendance Flow: verifies streamlined attendance and billing controls', async ({ page }) => {
    await loginAsAdmin(page);

    // Go to attendance page
    await page.goto('/attendance');
    await expect(page.getByRole('heading', { name: 'تسجيل الحضور اليومي' })).toBeVisible();

    // Verify presence of date and level selectors and search
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('input[placeholder*="ابحث برقم الطالب"]')).toBeVisible();
  });

  test('4. Billing & Payments Flow: visits payments and subscription recording screens', async ({ page }) => {
    await loginAsAdmin(page);

    // Payments page
    await page.goto('/payments');
    await expect(page.getByRole('heading', { name: 'تسجيل المدفوعات' })).toBeVisible();
  });

  test('5. Reports: verifies reports navigation and renders without errors', async ({ page }) => {
    await loginAsAdmin(page);

    // Attendance report
    await page.goto('/reports/attendance');
    await expect(page.getByRole('heading', { name: 'تقرير الحضور اليومي' })).toBeVisible();

    // Collections report
    await page.goto('/reports/collections');
    await expect(page.getByRole('heading', { name: 'تقرير التحصيلات اليومية' })).toBeVisible();

    // Debtors report
    await page.goto('/reports/debtors');
    await expect(page.getByRole('heading', { name: 'قائمة المدينين (المتأخرات المالية)' })).toBeVisible();

    // Financial summary report
    await page.goto('/reports/financial');
    await expect(page.getByRole('heading', { name: 'الملخص المالي الشهري' })).toBeVisible();
  });

  test('6. Student Advanced Filtering: filters students by status and resets filters', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/students');
    await expect(page.getByRole('heading', { name: 'سجل الطلاب' })).toBeVisible();

    // Filter by Active Status
    const statusSelect = page.locator('select:has-text("الطلاب النشطون فقط")');
    await statusSelect.selectOption('ACTIVE');

    // Reset filter button should appear
    const resetButton = page.locator('button:has-text("إعادة ضبط التصفية")');
    await expect(resetButton).toBeVisible();

    // Click reset
    await resetButton.click();
    await expect(resetButton).not.toBeVisible();
  });
});

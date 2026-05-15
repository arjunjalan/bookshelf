import { test, expect } from '@playwright/test'

const API_URL = process.env.API_URL || 'http://localhost:8000'
const PASSWORD = 'TestPass123!'

const MOCK_BOOK = {
  title: 'Dune',
  author: 'Frank Herbert',
  isbn: '9780441013593',
  cover_url: null,
  description: 'A science fiction epic set on the desert planet Arrakis.',
  page_count: 412,
  published_date: '1965-01-01',
}

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.com`
}

async function registerViaUI(page) {
  const email = uniqueEmail()
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('/books')
  return email
}

async function getToken(request, email) {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email, password: PASSWORD },
  })
  const data = await res.json()
  return data.access_token
}

async function createBook(request, token, bookData, logStatus = 'reading') {
  const bookRes = await request.post(`${API_URL}/books`, {
    headers: { Authorization: `Bearer ${token}` },
    data: bookData,
  })
  const book = await bookRes.json()
  await request.post(`${API_URL}/reading-logs`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { book_id: book.id, status: logStatus },
  })
  return book
}

test.describe('Add book', () => {
  test('search → select result → set status → confirm in reading list', async ({ page }) => {
    await registerViaUI(page)

    await page.route('**/metadata/search**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_BOOK]),
      })
    })

    await page.goto('/books/add')

    await page.getByLabel('Search for a book').fill('Dune')
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page.getByText('Frank Herbert').first()).toBeVisible()
    await page.getByText('Frank Herbert').first().click()

    await expect(page.getByLabel('Title')).toHaveValue('Dune')
    await expect(page.getByLabel('Author')).toHaveValue('Frank Herbert')

    await page.getByLabel('Status').selectOption('read')
    await page.getByRole('button', { name: 'Add book' }).click()

    await expect(page).toHaveURL(/\/books\/[0-9a-f-]+$/)
    await expect(page.getByRole('heading', { name: 'Dune' })).toBeVisible()
    await expect(page.getByText('412 pages')).toBeVisible()
    await expect(page.getByText('Published 1965')).toBeVisible()

    await page.goto('/books')
    await page.getByRole('button', { name: 'Read', exact: true }).click()
    await expect(page.getByText('Dune')).toBeVisible()
  })
})

test.describe('Book detail', () => {
  test('update rating and notes → verify persisted on reload', async ({ page, request }) => {
    const email = await registerViaUI(page)
    const token = await getToken(request, email)
    const book = await createBook(request, token, { title: 'Detail Test Book', author: 'Detail Author' }, 'reading')

    await page.goto(`/books/${book.id}`)
    await expect(page.getByRole('heading', { name: 'Detail Test Book' })).toBeVisible()

    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Status').selectOption('read')
    await page.getByRole('button', { name: '★' }).nth(3).click()
    await page.getByLabel('Notes').fill('A persisted note')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(page.getByText('A persisted note')).toBeVisible()

    await page.reload()
    await expect(page.getByText('A persisted note')).toBeVisible()
  })
})

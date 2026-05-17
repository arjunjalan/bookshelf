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
      const url = new URL(route.request().url())
      if (url.searchParams.get('paginated') === 'true') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [MOCK_BOOK],
            total: 1,
            offset: 0,
            limit: 25,
            has_more: false,
          }),
        })
        return
      }

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
    await expect(page.getByText('Published')).toBeVisible()
    await expect(page.getByText('1965')).toBeVisible()

    await page.goto('/books')
    await page.getByRole('button', { name: 'Read', exact: true }).click()
    await expect(page.getByText('Dune')).toBeVisible()
  })

  test('full search load more appends results before selection', async ({ page }) => {
    await registerViaUI(page)

    const books = Array.from({ length: 30 }, (_, i) => ({
      title: `Search Book ${i + 1}`,
      author: `Search Author ${i + 1}`,
      isbn: `97800000000${i + 1}`,
      cover_url: null,
      description: `Description ${i + 1}`,
      page_count: 100 + i + 1,
      published_date: '2026-01-01',
    }))

    await page.route('**/metadata/search**', (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('paginated') !== 'true') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
        return
      }

      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? 25)
      const pageBooks = books.slice(offset, offset + limit)
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: pageBooks,
          total: books.length,
          offset,
          limit,
          has_more: offset + limit < books.length,
        }),
      })
    })

    await page.goto('/books/add')
    await page.getByLabel('Search for a book').fill('Search')
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page.getByText('Search Book 25')).toBeVisible()
    await expect(page.getByText('Search Book 26')).not.toBeVisible()
    await expect(page.getByText('Showing 25 of 30 results for "Search"')).toBeVisible()

    await page.getByRole('button', { name: 'Load more' }).click()

    await expect(page.getByText('Search Book 26')).toBeVisible()
    await expect(page.getByText('Showing 30 of 30 results for "Search"')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Load more' })).not.toBeVisible()

    await page.getByText('Search Author 30').click()
    await expect(page.getByLabel('Title')).toHaveValue('Search Book 30')
    await expect(page.getByLabel('Author')).toHaveValue('Search Author 30')
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
    await page.getByRole('button', { name: '4 stars' }).click()
    await page.getByLabel('Notes').fill('A persisted note')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(page.getByText('A persisted note')).toBeVisible()

    await page.reload()
    await expect(page.getByText('A persisted note')).toBeVisible()
  })
})

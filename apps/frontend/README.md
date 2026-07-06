Selamat datang di aplikasi TanStack Start baru Anda!

# Memulai

Untuk menjalankan aplikasi ini:

```bash
pnpm install
pnpm dev
```

# Build untuk Produksi

Untuk build aplikasi ini untuk produksi:

```bash
pnpm build
```

## Pengujian

Proyek ini menggunakan [Vitest](https://vitest.dev/) untuk pengujian. Anda dapat menjalankan tes dengan:

```bash
pnpm test
```

## Styling

Proyek ini menggunakan [Tailwind CSS](https://tailwindcss.com/) untuk styling.

### Menghapus Tailwind CSS

Jika Anda tidak ingin menggunakan Tailwind CSS:

1. Hapus halaman demo di `src/routes/demo/`
2. Ganti impor Tailwind di `src/styles.css` dengan style Anda sendiri
3. Hapus `tailwindcss()` dari array plugins di `vite.config.ts`
4. Uninstall paket: `pnpm add @tailwindcss/vite tailwindcss --dev`

## Linting & Formatting

Proyek ini menggunakan [eslint](https://eslint.org/) dan [prettier](https://prettier.io/) untuk linting dan formatting. Eslint dikonfigurasi menggunakan [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). Skrip berikut tersedia:

```bash
pnpm lint
pnpm format
pnpm check
```

## Routing

Proyek ini menggunakan [TanStack Router](https://tanstack.com/router) dengan routing berbasis file. Route dikelola sebagai file di `src/routes`.

### Menambahkan Route

Untuk menambahkan route baru ke aplikasi Anda, cukup tambahkan file baru di direktori `./src/routes`.

TanStack akan secara otomatis menghasilkan konten file route untuk Anda.

Sekarang setelah Anda memiliki dua route, Anda dapat menggunakan komponen `Link` untuk navigasi di antaranya.

### Menambahkan Link

Untuk menggunakan navigasi SPA (Single Page Application), Anda perlu mengimpor komponen `Link` dari `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Kemudian di mana saja dalam JSX Anda dapat menggunakannya seperti ini:

```tsx
<Link to="/about">Tentang</Link>
```

Ini akan membuat link yang akan menavigasi ke route `/about`.

Informasi lebih lanjut tentang komponen `Link` dapat ditemukan di [dokumentasi Link](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Menggunakan Layout

Dalam setup File Based Routing, layout berada di `src/routes/__root.tsx`. Apa pun yang Anda tambahkan ke route root akan muncul di semua route. Konten route akan muncul di JSX di mana Anda merender `{children}` dalam `shellComponent`.

Berikut adalah contoh layout yang menyertakan header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Aplikasi Saya' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Beranda</Link>
            <Link to="/about">Tentang</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

Informasi lebih lanjut tentang layout dapat ditemukan di [dokumentasi Layouts](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start menyediakan server functions yang memungkinkan Anda menulis kode server-side yang terintegrasi mulus dengan komponen klien Anda.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Gunakan dalam komponen
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Waktu server: {time}</div>
}
```

## API Routes

Anda dapat membuat API route dengan menggunakan properti `server` dalam definisi route Anda:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Halo, Dunia!' }),
    },
  },
})
```

## Data Fetching

Ada beberapa cara untuk mengambil data dalam aplikasi Anda. Anda dapat menggunakan TanStack Query untuk mengambil data dari server. Tetapi Anda juga dapat menggunakan fungsi `loader` yang dibangun ke dalam TanStack Router untuk memuat data untuk route sebelum dirender.

Contoh:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loader secara dramatis menyederhanakan logika data fetching Anda. Lihat informasi lebih lanjut di [dokumentasi Loader](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# File Demo

File dengan prefix `demo` dapat dihapus dengan aman. Mereka ada untuk memberikan titik awal agar Anda dapat bermain dengan fitur yang Anda instal.

# Pelajari Lebih Lanjut

Anda dapat mempelajari lebih lanjut tentang semua yang ditawarkan TanStack di [dokumentasi TanStack](https://tanstack.com).

Untuk dokumentasi spesifik TanStack Start, kunjungi [TanStack Start](https://tanstack.com/start).

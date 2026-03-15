import './globals.css'

export const metadata = {
  title: 'Lift Tracker',
  description: 'Suivi muscu entre potes',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}

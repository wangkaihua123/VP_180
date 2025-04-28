import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Sidebar from '../components/Sidebar'

export default function App({ Component, pageProps }: AppProps) {
  console.log('App component loaded!');
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#eee' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, background: '#fafcff', border: '3px solid #0af', overflow: 'auto' }}>
        <div style={{ padding: 24 }}>
          <Component {...pageProps} />
        </div>
      </div>
    </div>
  )
} 
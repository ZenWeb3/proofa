'use client'

import Footer from '@/common/footer'
import Header from '@/common/navbar'
import Link from 'next/link'
import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function NotFound() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true })
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-black">
      
      {/* Navbar */}
      <Header />

      {/* Main content */}
      <main className="py-10 flex items-center justify-center px-4">
        <div className="text-center">
          <h1
            className="text-9xl font-extrabold text-white mb-4"
            data-aos="fade-down"
          >
            404
          </h1>

          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-6"
            data-aos="fade-up"
          >
            Page Not Found
          </h2>

          <p
            className="text-lg text-neutral-400 mb-8"
            data-aos="fade-up"
            data-aos-delay="100"
          >
            Oops! The page you are looking for does not exist or has been moved.
          </p>

          <Link
            href="/"
            className="inline-block bg-[#3B0E97] hover:bg-[#310C7D] text-white font-semibold py-3 px-6 rounded-full transition transform hover:scale-105"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            Go Back Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

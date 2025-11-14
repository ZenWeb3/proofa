'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import PhoneImage from "../../public/images/proofa-phone.svg"
import Link from 'next/link'

export default function About() {
  return (
    <section id="about" className="py-10 px-4 sm:px-6 lg:px-8 bg-black">

      <div className="max-w-7xl mx-auto text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Image (appears second on mobile, first on desktop) */}
          <div 
            data-aos="fade-left" 
            className="relative order-2 lg:order-1"
          >
            <Image 
              src={PhoneImage} 
              alt="Proofa Phone Image" 
              className="mx-auto w-[90%]"
            />
          </div>

          {/* Content (appears first on mobile, second on desktop) */}
          <div 
            data-aos="fade-right" 
            className="space-y-6 order-1 lg:order-2"
          >
            {/* Tag */}
            <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-full px-4 py-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: "#3B0E97" }}
              ></div>
              <span className="text-sm text-neutral-400">About Proofa</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight text-white">
              What is Proofa?
            </h2>

            {/* Description */}
            <p className="text-lg text-neutral-300 leading-relaxed">
              Proofa is a Telegram-based decentralized platform that allows creators 
              to register their creative work on Story Protocol. Verify your assets 
              instantly and transfer them to any external wallet at any time.
            </p>

            {/* Features */}
            <ul className="space-y-3">
              {['Instant Verification', 'Telegram Integration', 'Wallet Transfer'].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  
                  <div 
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: "#3B0E97" }}
                  >
                    <span className="text-xs text-white">✓</span>
                  </div>

                  <span className="text-white font-medium">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <Link href="https://t.me/proofabot" target="_blank" rel="noopener noreferrer">
            <Button 
              className="text-white font-semibold rounded-full mt-4"
              style={{ 
                backgroundColor: "#3B0E97",
                color: "white"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#310C7D"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3B0E97"}
            >
              Get Started Now
            </Button>
</Link>
          </div>

        </div>
      </div>

    </section>
  )
}

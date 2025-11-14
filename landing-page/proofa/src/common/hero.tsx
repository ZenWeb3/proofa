'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import heroImage from "../../public/images/proofa heroimage.svg"
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-20">
     
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div data-aos="fade-up">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight text-balance">
            Proofa-
            <span className="text-[#979797]"> Turning Creativity Into Verified Assets</span>
          </h1>
        </div>

        <p data-aos="fade-up" data-aos-delay="100" className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          Register your creative work on Story Protocol directly from Telegram. Get instant verification and transfer assets to any external wallet at any time.
        </p>

        <div data-aos="fade-up" data-aos-delay="200" className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="https://t.me/proofabot" target="_blank" rel="noopener noreferrer">
          <Button className="bg-[#3B0E97] cursor-pointer text-background font-semibold rounded-full px-8 py-6 text-lg flex items-center gap-2">
            Start Verifying 
          </Button>
        </Link>
        </div>

        {/* Hero Image */}
        <div data-aos="zoom-in" data-aos-delay="300" className="mt-16 relative">
            <Image src={heroImage} alt="Proofa Hero Image" className="mx-auto w-full max-w-4xl " />
        </div>
      </div>
    </section>
  )
}

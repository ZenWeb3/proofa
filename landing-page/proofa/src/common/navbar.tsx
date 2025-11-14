'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import logo from "../../public/images/logo.svg";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-transparent backdrop-blur-md  py-5" >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
         
          <div className="flex items-center gap-2">
            <Image src={logo} alt="Proofa Logo" className='w-40 h-40' />
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition">
              Home
            </Link>
            <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground transition">
              About
            </Link>
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition">
              Features
            </Link>
          </nav>

          
         <Link href="https://t.me/proofabot" target="_blank" rel="noopener noreferrer">
          <Button className="bg-[#3B0E97] text-background font-semibold rounded-full">
            Get Started 
          </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

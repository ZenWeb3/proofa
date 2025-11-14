'use client'

import Link from 'next/link'
import Image from 'next/image'
import logo from "../../public/images/logo.svg";

export default function Footer() {
  return (
    <footer className=" lg:mt-10 border-t border-neutral-700 bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          
         
          <div>
            <div className="flex items-center gap-2 mb-4">
             <Image src={logo} alt="Proofa Logo" className='w-32 h-32' />
            </div>
            <p className="text-sm text-neutral-400">
              Turning creativity into verified assets on Story Protocol.
            </p>
          </div>

          {/* Links */}
          {[
            { title: 'Product', links: ['Features', 'Pricing', 'Security'] },
            { title: 'Company', links: ['About', 'Blog', 'Contact'] },
            { title: 'Resources', links: ['Docs', 'API', 'Help'] },
          ].map((section, i) => (
            <div key={i}>
              <h4 className="font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link 
                      href="#" 
                      className="text-sm text-neutral-400 hover:text-white transition"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-neutral-700 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-neutral-400">
              © 2025 Proofa. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="" className="text-sm text-neutral-400 hover:text-white transition">
                Privacy
              </Link>
              <Link href="" className="text-sm text-neutral-400 hover:text-white transition">
                Terms
              </Link>
              <Link href="" className="text-sm text-neutral-400 hover:text-white transition">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

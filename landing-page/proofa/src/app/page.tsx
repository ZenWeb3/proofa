"use client"

import Image from "next/image";
import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/common/navbar";
import Hero from "@/common/hero";
import About from "@/common/about";
import Features from "@/common/features";
import Footer from "@/common/footer";


export default function Home() {
  useEffect(() => {
  AOS.init({ duration: 1000 });
}, []);

  return (
    
    <div className="bg-black min-h-screen">
      <Header />
      <Hero />
      <About />
      <Features />
      <Footer />
    </div>
  );
}

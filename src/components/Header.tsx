"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/50 text-blue-iec py-2">
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo Institut Ecocitoyen du Pays du Mont Blanc"
            width={120}
            height={40}
            className="h-auto"
            sizes="(max-width: 768px) 80px, 140px"
          />
          <h1 className="text-2xl font-bold hidden md:block">
            <span className="text-blue-iec">Institut Ecocitoyen</span>
            <br />
            <span className="text-green-iec text-xl font-serif relative -top-2">
              Pays du Mont Blanc
            </span>
          </h1>
          <h1 className="text-l font-bold md:hidden">
            Institut Ecocitoyen du Pays du Mont Blanc
          </h1>
        </Link>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Menu</span>
        </Button>

        {/* Desktop navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-4">
            <li>
              <Link href="/#missions" className="hover:underline">
                Missions
              </Link>
            </li>
            <li>
              <Link href="/projets" className="hover:underline">
                Projets
              </Link>
            </li>
            <li>
              <Link href="/actualites" className="hover:underline">
                Actualités
              </Link>
            </li>
            <li>
              <Link
                href="/etre-acteur"
                className={`px-4 py-2 rounded-md font-semibold transition duration-300 bg-blue-iec text-white hover:bg-blue-700`}
              >
                Être Acteur
              </Link>
            </li>
          </ul>
        </nav>

        {/* Mobile navigation */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-md md:hidden">
            <nav className="container py-8">
              <ul className="flex flex-col space-y-4">
                <li>
                  <Link
                    href="/#missions"
                    className="block hover:underline"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Missions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/projets"
                    className="block hover:underline"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Projets
                  </Link>
                </li>
                <li>
                  <Link
                    href="/actualites"
                    className="block hover:underline"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Actualités
                  </Link>
                </li>
                <li>
                  <Link
                    href="/comment-aider"
                    className={`block px-4 py-4 rounded-md font-semibold transition duration-300 bg-blue-iec text-white hover:bg-blue-700 w-full text-center`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Nous Aider
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

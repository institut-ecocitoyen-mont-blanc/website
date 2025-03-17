import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white py-8">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <h3 className="text-xl font-semibold mb-2">
            Institut Ecocitoyen du Pays du Mont Blanc
          </h3>
          <p>Ensemble pour un environnement sain</p>
          <div className="flex space-x-4  pt-4">
            <Link
              href="https://www.facebook.com/people/Institut-Écocitoyen-Pays-du-Mont-Blanc/61570992711918/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors"
            >
              <span className="sr-only">Facebook</span>
              <Facebook className="w-6 h-6" />
            </Link>
            <Link
              href="https://www.instagram.com/institut_ecocitoyen_du_pays_mb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors"
            >
              <span className="sr-only">Instagram</span>
              <Instagram className="w-6 h-6" />
            </Link>
            <Link
              href="https://www.youtube.com/@IECPMB"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors"
            >
              <span className="sr-only">Youtube</span>
              <Youtube className="w-6 h-6" />
            </Link>
            <Link
              href="https://www.linkedin.com/company/institut-ecocitoyen-pays-du-mont-blanc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors"
            >
              <span className="sr-only">LinkedIn</span>
              <Linkedin className="w-6 h-6" />
            </Link>
          </div>
        </div>
        <nav>
          <ul className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
            <li>
              <Link href="/a-propos" className="hover:underline">
                À propos
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className="hover:underline">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link
                href="/politique-de-confidentialite"
                className="hover:underline"
              >
                Politique de confidentialité
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

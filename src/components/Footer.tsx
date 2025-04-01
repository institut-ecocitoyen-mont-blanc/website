import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { load } from "outstatic/server";

export default async function Footer() {
  const { partenaires } = await getData();

  return (
    <footer className="bg-blue-iec text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
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

        {/* Partners Section */}
        <div className="border-t border-gray-700 pt-6 mt-6">
          <h4 className="text-center text-lg font-medium mb-4">
            Avec le soutien de
          </h4>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
            {partenaires.map((partner, index) => (
              <div
                key={index}
                className="bg-white/10 p-3 rounded-lg hover:bg-white/15 transition-colors"
              >
                <Image
                  src={partner.image || "/placeholder.svg"}
                  alt={partner.title}
                  width={120}
                  height={60}
                  className="h-12 w-auto object-contain max-w-30"
                />
                <span className="sr-only">{partner.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

async function getData() {
  const db = await load();
  const partenaires = (await db
    .find({ collection: "partenaires" }, ["title", "content", "image"])
    .sort({ publishedAt: 1 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .toArray()) as any[] as {
    title: string;
    content: string;
    image: string;
  }[];

  return { partenaires };
}

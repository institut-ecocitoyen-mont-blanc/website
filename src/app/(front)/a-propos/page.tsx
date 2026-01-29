import Image from "next/image";
import Link from "next/link";
import {
  History,
  Handshake,
  Mail,
  MapPin,
  Facebook,
  Linkedin,
  Instagram,
  ArrowRight,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDocumentBySlug, load } from "outstatic/server";
import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify);

export default async function AboutPage() {
  const { page, partenaires } = await getData();
  const content = page.content
    .split("---")
    .map((x) => x.trim())
    .filter(Boolean);

  return (
    <main className="grow">
      <section className="py-16 pt-32 bg-linear-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8 text-center">{content[0]}</h1>

          {/* Histoire/Origine */}
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-6 h-6 text-blue-iec" />
              <h2 className="text-2xl font-semibold">Histoire et Origine</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div
                className="text-gray-600 mb markdown"
                dangerouslySetInnerHTML={{
                  __html: processor.processSync(content[1]).value,
                }}
              ></div>
              <Image
                src={page.image || "/logo.png"}
                alt="Histoire de l'institut"
                width={500}
                height={300}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>

          {/* Organisation/Fonctionnement */}
          {/* <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-6 h-6 text-blue-iec" />
              <h2 className="text-2xl font-semibold">
                Organisation et Fonctionnement
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">
                    Le Conseil d’administration
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Des représentants de chaque collège prennent les décisions.
                    Ils sont dotés de voix décisionnelles, sauf les
                    collectivités et les experts, qui eux ont un rôle
                    consultatif.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">L’Agora</h3>
                  <p className="text-gray-600 mb-4">
                    Un conseil dédié à tous les habitants, résidents secondaires
                    et touristes qui souhaitent s’engager dans des actions de
                    sensibilisation, intégrer des protocoles de sciences
                    participatives, partager des idées et transmettre les
                    informations entre l’Institut et la population.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">
                    Le Conseil Scientifique
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Des chercheurs de la recherche publique, chargés de
                    conseiller sur les études à mener, vulgariser les résultats,
                    transformer les questions locales en problématiques
                    scientifiques et proposer des études pour tenter d’y
                    répondre.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div> */}

          {/* Partenaires */}
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Handshake className="w-6 h-6 text-blue-iec" />
              <h2 className="text-2xl font-semibold">Nos Partenaires</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {partenaires.map((partner, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Link
                        href={partner.lien}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Image
                          src={partner.image || "/logo.png"}
                          alt={partner.title}
                          width={100}
                          height={50}
                          className="object-contain"
                        />
                      </Link>
                      <div>
                        <Link
                          href={partner.lien}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <h3 className="font-semibold mb-1">
                            {partner.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-600">
                          {partner.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Contacts/Réseaux */}
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-6 h-6 text-blue-iec" />
              <h2 className="text-2xl font-semibold">Contacts et Réseaux</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4">Nous Contacter</h3>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <span>contact@institut-pmb.fr</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <span>
                    648 Rue des prés caton
                    <br />
                    74190 Passy
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Suivez-nous</h3>
                <div className="flex gap-4">
                  <Link
                    href="https://www.facebook.com/people/Institut-Écocitoyen-Pays-du-Mont-Blanc/61570992711918/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Facebook className="w-6 h-6" />
                    <span className="sr-only">Facebook</span>
                  </Link>
                  <Link
                    href="https://www.instagram.com/institut_ecocitoyen_du_pays_mb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Instagram className="w-6 h-6" />
                    <span className="sr-only">Instagram</span>
                  </Link>
                  <Link
                    href="https://www.youtube.com/@IECPMB"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Youtube className="w-6 h-6" />
                    <span className="sr-only">YouTube</span>
                  </Link>
                  <Link
                    href="https://www.linkedin.com/company/institut-ecocitoyen-pays-du-mont-blanc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Linkedin className="w-6 h-6" />
                    <span className="sr-only">LinkedIn</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-blue-50 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">{content[2]}</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">{content[3]}</p>
            <Link href="/etre-acteur">
              <Button size="lg" className="gap-2">
                Comment Agir
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

async function getData() {
  const page = getDocumentBySlug("static-pages", "a-propos", [
    "content",
    "image",
  ])!;

  const db = await load();
  const partenaires = await db
    .find({ collection: "partenaires" }, ["title", "content", "image", "lien"])
    .sort({ publishedAt: 1 })
    .toArray();

  return { page, partenaires };
}

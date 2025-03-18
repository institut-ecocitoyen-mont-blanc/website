/* eslint-disable react/no-unescaped-entities */
import Image from "next/image";
import Link from "next/link";
import {
  History,
  Users,
  Handshake,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Linkedin,
  Instagram,
  ArrowRight,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const partners = [
  {
    name: "Université de Paris",
    logo: "/placeholder.svg?height=100&width=200",
    description: "Collaboration sur des projets de recherche environnementale",
  },
  {
    name: "Airparif",
    logo: "/placeholder.svg?height=100&width=200",
    description: "Partenariat pour la surveillance de la qualité de l'air",
  },
  {
    name: "Agence de l'Eau",
    logo: "/placeholder.svg?height=100&width=200",
    description: "Soutien technique et financier pour les projets liés à l'eau",
  },
  {
    name: "Santé Publique France",
    logo: "/placeholder.svg?height=100&width=200",
    description: "Collaboration sur les études d'impact sanitaire",
  },
];

export default function AboutPage() {
  return (
    <main className="grow">
      <section className="py-16 pt-32 bg-linear-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8 text-center">
            À Propos de l'Institut
          </h1>

          {/* Histoire/Origine */}
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-6 h-6 text-blue-iec" />
              <h2 className="text-2xl font-semibold">Histoire et Origine</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-gray-600 mb-4">
                  Fondé en 2015, l'Institut Ecocitoyen du Pays du Mont Blanc est
                  né de la volonté commune de citoyens, de scientifiques et
                  d'élus locaux de répondre aux préoccupations croissantes
                  concernant la qualité de l'air et ses impacts sur la santé
                  dans la vallée de l'Arve.
                </p>
                <p className="text-gray-600">
                  Notre institut s'est progressivement développé pour devenir un
                  acteur majeur de la recherche environnementale et de la
                  sensibilisation aux enjeux de santé publique liés aux
                  pollutions.
                </p>
              </div>
              <Image
                src="/placeholder.svg?height=300&width=500"
                alt="Histoire de l'institut"
                width={500}
                height={300}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>

          {/* Organisation/Fonctionnement */}
          <div className="mb-16">
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
                    Conseil d'Administration
                  </h3>
                  <p className="text-gray-600">
                    Composé de 12 membres élus, le conseil d'administration
                    définit les orientations stratégiques de l'institut.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">
                    Équipe Scientifique
                  </h3>
                  <p className="text-gray-600">
                    Notre équipe de chercheurs et techniciens mène les études et
                    analyses sur le terrain et en laboratoire.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">Comité Citoyen</h3>
                  <p className="text-gray-600">
                    Un groupe de citoyens engagés participe à la définition des
                    priorités et au suivi des projets.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Partenaires */}
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Handshake className="w-6 h-6 text-blue-iec" />
              <h2 className="text-2xl font-semibold">Nos Partenaires</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {partners.map((partner, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Image
                        src={partner.logo || "/placeholder.svg"}
                        alt={partner.name}
                        width={100}
                        height={50}
                        className="object-contain"
                      />
                      <div>
                        <h3 className="font-semibold mb-1">{partner.name}</h3>
                        <p className="text-sm text-gray-600">
                          {partner.description}
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
                  <span>contact@institut-ecocitoyen-pmb.fr</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <span>+33 (0)4 50 XX XX XX</span>
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
            <h2 className="text-2xl font-semibold mb-4">
              Rejoignez-nous dans notre mission
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Votre soutien est essentiel pour continuer notre travail de
              recherche et de sensibilisation. Découvrez comment vous pouvez
              contribuer à notre cause.
            </p>
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

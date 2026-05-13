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
  Users,
  Microscope,
  School,
  HeartPulse,
  Wrench,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSingletonBySlug, load } from "outstatic/server";
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

const colleges = [
  {
    title: "Habitants",
    icon: Users,
    vote: "Droit de vote",
    duration: "3 ans",
    roles: [
      "Représenter l’ensemble des habitants, dans la diversité des communes et des profils.",
      "Écouter les attentes des habitants et faire remonter les préoccupations du territoire.",
      "Restituer une information scientifique validée par l’IEC.",
      "Faire participer la population aux protocoles de sciences participatives.",
    ],
  },
  {
    title: "Scientifiques",
    icon: Microscope,
    vote: "Droit de vote",
    duration: "3 ans",
    roles: [
      "Représenter les chercheuses et chercheurs membres de l’Institut.",
      "Aider à identifier les questions scientifiques pouvant être traitées par l’IEC.",
      "Développer une connaissance scientifique indépendante sur les impacts des pollutions sur la santé.",
    ],
  },
  {
    title: "Jeunes",
    icon: School,
    vote: "Droit de vote",
    duration: "2 ans",
    roles: [
      "Sensibiliser les établissements scolaires et les jeunes du territoire.",
      "Relayer sur les réseaux sociaux l’information scientifique validée par l’Institut Écocitoyen.",
    ],
  },
  {
    title: "Praticiens de santé",
    icon: HeartPulse,
    vote: "Droit de vote",
    duration: "3 ans",
    roles: [
      "Représenter les praticiens de santé médicaux et paramédicaux, hors médecines parallèles ou douces.",
      "Informer le public, les décideurs et les professionnels à partir de la littérature scientifique.",
      "Mettre en place des études locales et partager de façon transparente les connaissances sur les impacts sanitaires des polluants.",
    ],
  },
  {
    title: "Experts",
    icon: Wrench,
    vote: "Sans droit de vote",
    voteClassName: "bg-gray-100 text-gray-700",
    duration: "3 ans",
    roles: [
      "Apporter des connaissances techniques liées à leur domaine d’expertise ou à des études privées issues de laboratoires industriels ou agricoles.",
      "Éclairer l’applicabilité des données scientifiques au contexte local par un avis technique.",
    ],
  },
  {
    title: "Entreprises",
    icon: Building2,
    vote: "Droit de vote",
    duration: "3 ans",
    roles: [
      "Promouvoir la diminution des pollutions et les projets pour la santé et la nature en entreprise.",
      "Représenter les entreprises et en engager de nouvelles dans l’IEC.",
      "Faciliter une communication transparente en partageant les données et études utiles à la connaissance scientifique.",
    ],
  },
  {
    title: "Associations",
    icon: Handshake,
    vote: "Droit de vote",
    duration: "3 ans",
    roles: [
      "Représenter les associations adhérentes et encourager l’engagement d’associations locales dans l’IEC.",
      "Relayer les actions et documents officiels de l’Institut auprès des citoyens adhérents ou accueillis par les associations.",
    ],
  },
];

const sharedResponsibilities = [
  "Participer à la vie de l’association : événements, réunions inter-collèges, conseil d’administration et assemblées générales.",
  "Représenter les intérêts et opinions diverses des personnes du collège, et non une opinion personnelle.",
  "Prendre connaissance des comptes rendus et des informations transmises par l’Institut.",
  "Respecter la charte et le règlement intérieur.",
];

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
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-6 h-6 text-blue-iec" />
              <h2 className="text-2xl font-semibold">
                Organisation et Fonctionnement
              </h2>
            </div>
            <div className="mb-8 max-w-3xl text-gray-600">
              Chaque collège porte une voix spécifique du territoire et
              contribue à transformer les préoccupations locales en actions,
              études et informations partagées.
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {colleges.map((college) => {
                const Icon = college.icon;

                return (
                  <Card key={college.title} className="rounded-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 rounded-full bg-blue-iec/10 p-3 text-blue-iec">
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold">
                              {college.title}
                            </h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                college.voteClassName ??
                                "bg-green-iec/10 text-green-iec"
                              }`}
                            >
                              {college.vote}
                            </span>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                              Mandat {college.duration}
                            </span>
                          </div>
                          <ul className="space-y-2 text-sm leading-6 text-gray-600">
                            {college.roles.map((role) => (
                              <li key={role} className="flex gap-2">
                                <span
                                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-iec"
                                  aria-hidden="true"
                                />
                                <span>{role}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="mt-6 rounded-lg border bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold">
                Droits et devoirs de tous les membres
              </h3>
              <ul className="grid gap-3 text-sm leading-6 text-gray-600 md:grid-cols-2">
                {sharedResponsibilities.map((responsibility) => (
                  <li key={responsibility} className="flex gap-2">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-iec"
                      aria-hidden="true"
                    />
                    <span>{responsibility}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

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
  const page = getSingletonBySlug("a-propos", ["content", "image"])!;

  const db = await load();
  const partenaires = await db
    .find({ collection: "partenaires" }, ["title", "content", "image", "lien"])
    .sort({ publishedAt: 1 })
    .toArray();

  return { page, partenaires };
}

import {
  VoteIcon as Volunteer,
  DollarSign,
  Megaphone,
  Users,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import Link from "next/link";

const helpOptions = [
  {
    title: "Devenir Bénévole",
    description:
      "Donnez de votre temps et de vos compétences pour soutenir nos projets et nos actions sur le terrain.",
    icon: <Volunteer className="w-12 h-12 text-blue-600" />,
    action: (
      <Link
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
        href="/projets"
      >
        En savoir plus
      </Link>
    ),
  },
  {
    title: "Faire un Don",
    description:
      "Votre soutien financier nous aide à mener des études indépendantes et à sensibiliser le public.",
    icon: <DollarSign className="w-12 h-12 text-green-600" />,
    action: (
      <Link
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
        href="https://www.helloasso.com/associations/institut-ecocitoyen-de-recherche-et-d-action-environnementale-du-pays-du-mont-blanc"
      >
        Adhérer
      </Link>
    ),
  },
  {
    title: "Partager nos Informations",
    description:
      "Aidez-nous à diffuser nos messages en partageant nos publications sur les réseaux sociaux.",
    icon: <Megaphone className="w-12 h-12 text-yellow-600" />,
    action: (
      <div className="flex space-x-4  pt-4">
        <Link
          href="https://www.facebook.com/people/Institut-Écocitoyen-Pays-du-Mont-Blanc/61570992711918/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 transition-colors"
        >
          <span className="sr-only">Facebook</span>
          <Facebook className="w-6 h-6" />
        </Link>
        <Link
          href="https://www.instagram.com/institut_ecocitoyen_du_pays_mb"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 transition-colors"
        >
          <span className="sr-only">Instagram</span>
          <Instagram className="w-6 h-6" />
        </Link>
        <Link
          href="https://www.youtube.com/@IECPMB"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 transition-colors"
        >
          <span className="sr-only">YouTube</span>
          <Youtube className="w-6 h-6" />
        </Link>
        <Link
          href="https://www.linkedin.com/company/institut-ecocitoyen-pays-du-mont-blanc"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 transition-colors"
        >
          <span className="sr-only">LinkedIn</span>
          <Linkedin className="w-6 h-6" />
        </Link>
      </div>
    ),
  },
  {
    title: "Adhérer à l'Association",
    description:
      "Devenez membre de notre association pour participer activement à nos décisions et actions.",
    icon: <Users className="w-12 h-12 text-purple-600" />,
    action: (
      <Link
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
        href="https://www.helloasso.com/associations/institut-ecocitoyen-de-recherche-et-d-action-environnementale-du-pays-du-mont-blanc"
      >
        Adhérer
      </Link>
    ),
  },
];

export default function HowToHelpPage() {
  return (
    <main className="grow">
      <section className="py-16 pt-32 bg-gray-100">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Comment Agir</h1>
          <p className="text-xl text-center mb-12">
            Ensemble, nous pouvons faire la différence pour notre environnement
            et notre santé. Voici comment vous pouvez nous aider :
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {helpOptions.map((option, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center"
              >
                <div className="mb-4">{option.icon}</div>
                <h2 className="text-2xl font-semibold mb-2">{option.title}</h2>
                <p className="text-gray-600 mb-4">{option.description}</p>
                {option.action}
              </div>
            ))}
          </div>
        </div>

        <div className="container mt-16 mb-16">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-6 h-6 text-blue-600" />
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
      </section>
    </main>
  );
}

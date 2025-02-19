import {
  VoteIcon as Volunteer,
  DollarSign,
  Megaphone,
  Users,
} from "lucide-react";

const helpOptions = [
  {
    title: "Devenir Bénévole",
    description:
      "Donnez de votre temps et de vos compétences pour soutenir nos projets et nos actions sur le terrain.",
    icon: <Volunteer className="w-12 h-12 text-blue-600" />,
    action: "En savoir plus",
  },
  {
    title: "Faire un Don",
    description:
      "Votre soutien financier nous aide à mener des études indépendantes et à sensibiliser le public.",
    icon: <DollarSign className="w-12 h-12 text-green-600" />,
    action: "Faire un don",
  },
  {
    title: "Partager nos Informations",
    description:
      "Aidez-nous à diffuser nos messages en partageant nos publications sur les réseaux sociaux.",
    icon: <Megaphone className="w-12 h-12 text-yellow-600" />,
    action: "Partager",
  },
  {
    title: "Adhérer à l'Association",
    description:
      "Devenez membre de notre association pour participer activement à nos décisions et actions.",
    icon: <Users className="w-12 h-12 text-purple-600" />,
    action: "Adhérer",
  },
];

export default function HowToHelpPage() {
  return (
    <main className="flex-grow">
      <section className="py-16 pt-32 bg-gray-100">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Comment Aider</h1>
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
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300">
                  {option.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

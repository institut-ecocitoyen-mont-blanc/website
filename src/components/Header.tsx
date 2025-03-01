import Link from "next/link";

export default function Header() {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 ${"bg-white/50 backdrop-blur-md border-b border-white/50 text-blue-900 py-2"}`}
    >
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link href="/">
          <h1 className="text-2xl font-bold">
            Institut Ecocitoyen du Pays du Mont Blanc
          </h1>
        </Link>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/#objectifs" className="hover:underline">
                Objectifs
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
                className={`px-4 py-2 rounded-md font-semibold transition duration-300 bg-blue-900 text-white hover:bg-blue-700`}
              >
                Être Acteur
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

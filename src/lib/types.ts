export type ProjectCategory =
  | "Air"
  | "Eau"
  | "Sol"
  | "Santé"
  | "Science Participative";
export type ActualiteCategory = "Air" | "Eau" | "Sol" | "Santé" | "Événement";

export type NewsItem = {
  kind: "actualite" | "evenement" | "presse";
  slug: string;
  title: string;
  description?: string;
  image?: string;
  publishedAt: Date;
  dateEvenement: Date | null;
  categories: ActualiteCategory[];
  lien?: string;
  slugProjet?: string;
};

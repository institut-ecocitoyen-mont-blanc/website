const frenchDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

export function formatFrenchDate(date: Date): string {
  return frenchDateFormatter.format(date);
}

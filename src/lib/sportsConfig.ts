import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import { Sport } from "@/types/registration"

function toCategoryType(rosterSize: number): Sport["categories"][number]["type"] {
  if (rosterSize === 2) return "ganda"
  if (rosterSize >= 4) return "tim"
  return "individu"
}

export const sportsConfig: Sport[] = SPORTS_CATALOG.map((sport) => ({
  id: sport.id,
  name: sport.name,
  categories: sport.categories.map((category) => ({
    id: category.id,
    label: category.name,
    name: category.name,
    type: toCategoryType(category.rosterSize),
    quota: 0,
  })),
}))

import type { Idea } from '../../types'
import { IDEAS_LOCAL } from './local'
import { IDEAS_FREELANCE } from './freelance'
import { IDEAS_TECH } from './tech'
import { IDEAS_COMERCIO } from './comercio'
import { IDEAS_TECNICO } from './tecnico'
import { IDEAS_EDUCACION } from './educacion'
import { IDEAS_CONTENIDO } from './contenido'
import { IDEAS_ESCALA } from './escala'

export const IDEAS: Idea[] = [
  ...IDEAS_LOCAL,
  ...IDEAS_FREELANCE,
  ...IDEAS_TECH,
  ...IDEAS_COMERCIO,
  ...IDEAS_TECNICO,
  ...IDEAS_EDUCACION,
  ...IDEAS_CONTENIDO,
  ...IDEAS_ESCALA,
]

export const ideaPorId = Object.fromEntries(IDEAS.map((i) => [i.id, i])) as Record<string, Idea>

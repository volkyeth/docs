import * as fs from 'fs'
import { dirname } from 'path'
import * as path from 'path'
import { fileURLToPath } from 'url'

import { XMLParser } from 'fast-xml-parser'

import config from '../next.config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml')
const lockfilePath = path.join(__dirname, '..', 'route-lockfile.txt')

async function main() {
  const parser = new XMLParser()

  const d = parser.parse(fs.readFileSync(sitemapPath, 'utf-8'))

  const routes = d.urlset.url.map((url) => url.loc.replace(process.env.SITE_URL || `https://thegraph.com/docs`, ``))

  const redirectsPointingToNonExistingStuff = []

  const redirects = await config.redirects()

  for (const redirect of redirects) {
    if (routes.includes(redirect.destination) === false) {
      redirectsPointingToNonExistingStuff.push(redirect)
    }
    routes.push(`${redirect.source} -> ${redirect.destination}`)
  }

  if (redirectsPointingToNonExistingStuff.length) {
    console.error(
      `The following routes do not point to a route:\n\n` +
        redirectsPointingToNonExistingStuff.map((redirect) => `- "${redirect.source}" -> "${redirect.destination}"`) +
        `\n`
    )
    throw new Error('Redirect pointing to nothing.')
  }

  fs.writeFileSync(lockfilePath, routes.sort().join(`\n`) + `\n`)
}

main()

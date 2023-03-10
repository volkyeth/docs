import { NextSeoProps } from 'next-seo'
import { Heading } from 'nextra'
import { Context, createContext } from 'react'

export type Frontmatter = {
  title?: string
  navTitle?: string
  description?: string
  socialImage?: string
  seo?: NextSeoProps
}

export type DocumentContextProps = {
  frontMatter: Frontmatter
  headings: Heading[]
  markOutlineItem: (id: string, inOrAboveView: boolean) => void
  highlightedOutlineItemId: string | null
}

export const DocumentContext = createContext(null) as Context<DocumentContextProps | null>

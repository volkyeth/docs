import merge from 'lodash/merge'
import { NextSeo, NextSeoProps } from 'next-seo'
import { NextraThemeLayoutProps } from 'nextra'
import { MDXProvider } from 'nextra/mdx'
import { useCallback, useMemo } from 'react'
import { useSet } from 'react-use'
import { ThemeUIStyleObject } from 'theme-ui'

import { Divider, DividerProps, Flex, Spacing } from '@edgeandnode/components'

import {
  Blockquote,
  CodeBlock,
  CodeInline,
  Difficulty,
  EditPageLink,
  Heading,
  Image,
  LinkInline,
  ListOrdered,
  ListUnordered,
  Paragraph,
  Table,
  VideoEmbed,
} from '@/components'
import { useI18n } from '@/i18n'
import { DocumentContext, MDXLayoutNav, MDXLayoutOutline, MDXLayoutPagination, NavContext } from '@/layout'
import { getNavItems, NavItemGroup } from '@/navigation'

const mdxComponents = {
  blockquote: Blockquote,
  pre: CodeBlock,
  code: CodeInline,
  hr: (props: DividerProps) => <Divider sx={{ my: Spacing['32px'] }} {...props} />,
  h1: Heading.H1,
  h2: Heading.H2,
  h3: Heading.H3,
  h4: Heading.H4,
  h5: Heading.H5,
  h6: Heading.H6,
  img: Image,
  a: LinkInline,
  ol: ListOrdered,
  ul: ListUnordered,
  p: Paragraph,
  table: Table,
  VideoEmbed,
  Difficulty,
}

const mdxStyles: ThemeUIStyleObject = {
  overflowWrap: 'break-word',
  'img + em': {
    mt: Spacing['16px'],
    display: 'block',
    textAlign: 'center',
  },
}

export function MDXLayout({ children, pageOpts }: NextraThemeLayoutProps) {
  const { frontMatter, headings, filePath } = pageOpts
  const { pathWithoutLocale, locale } = useI18n()
  const navItems = getNavItems(locale as any, pageOpts.pageMap)
  // Compute some values for the `NavContext`
  const { previousPage, currentPage, nextPage, currentGroup } = useMemo(() => {
    let previousPage = null
    let currentPage = null
    let nextPage = null
    let currentGroup = null
    const pageNavItems = navItems.flatMap((navItem) => {
      if ('children' in navItem) {
        return navItem.children.filter((childNavItem) => {
          if ('path' in childNavItem) {
            if (childNavItem.path === pathWithoutLocale) {
              currentGroup = navItem
            }
            return true
          }
          return false
        })
      }
      if ('path' in navItem) {
        return [navItem]
      }
      return []
    })
    let pageNavItemIndex = 0
    for (const pageNavItem of pageNavItems) {
      if (pageNavItem.path === pathWithoutLocale) {
        previousPage = pageNavItems[pageNavItemIndex - 1] ?? null
        currentPage = pageNavItems[pageNavItemIndex] ?? null
        nextPage = pageNavItems[pageNavItemIndex + 1] ?? null
      }
      pageNavItemIndex++
    }
    return {
      previousPage,
      currentPage,
      nextPage,
      currentGroup: currentGroup as NavItemGroup | null,
    }
  }, [navItems, pathWithoutLocale])

  // Provide `markOutlineItem` to the `DocumentContext` so child `Heading` components can mark outline items as "in or above view" or not
  const [
    ,
    { add: markOutlineItemAsInOrAboveView, remove: markOutlineItemAsNotInOrAboveView, has: outlineItemIsInOrAboveView },
  ] = useSet(new Set<string>([]))

  const markOutlineItem = useCallback(
    (id: string, inOrAboveView: boolean) => {
      if (inOrAboveView) {
        markOutlineItemAsInOrAboveView(id)
      } else {
        markOutlineItemAsNotInOrAboveView(id)
      }
    },
    [markOutlineItemAsInOrAboveView, markOutlineItemAsNotInOrAboveView]
  )

  // Compute `highlightedOutlineItemId` for the `DocumentContext` based on outline items that have been marked as "in or above view"
  const highlightedOutlineItemId = useMemo(() => {
    let _highlightedOutlineItemId = null
    for (const heading of headings) {
      if (heading.depth <= 3 && outlineItemIsInOrAboveView(heading.id)) {
        _highlightedOutlineItemId = heading.id
      }
    }
    return _highlightedOutlineItemId
  }, [headings, outlineItemIsInOrAboveView])

  let seo: NextSeoProps = {
    title: `${frontMatter.title ? `${frontMatter.title} - ` : ''}The Graph Docs`,
  }
  if (frontMatter.description) {
    seo.description = frontMatter.description
  }
  if (frontMatter.socialImage) {
    seo.openGraph = {
      images: [{ url: frontMatter.socialImage }],
    }
  }
  if (frontMatter.seo) {
    seo = merge(seo, frontMatter.seo)
  }

  return (
    <NavContext.Provider value={{ filePath, navItems, previousPage, currentPage, nextPage, currentGroup }}>
      <DocumentContext.Provider value={{ frontMatter, headings, markOutlineItem, highlightedOutlineItemId }}>
        <NextSeo {...seo} />

        <div
          sx={{
            display: ['flex', null, null, 'grid'],
            gridTemplateColumns: '244px auto 216px',
            flexDirection: 'column',
          }}
        >
          <div
            sx={{
              display: ['none', null, null, 'block'],
              mt: 'calc(-1 * var(--gds-header-height) * var(--gds-header-fixed))',
              marginInlineStart: '-8px',
              marginInlineEnd: '24px',
            }}
          >
            <MDXLayoutNav />
          </div>

          <div
            sx={{
              pt: [null, null, null, Spacing['32px']],
              pb: Spacing['64px'],
            }}
          >
            <div sx={{ display: [null, null, null, 'none'], mb: Spacing['32px'] }}>
              <MDXLayoutNav mobile />
            </div>

            <article className="graph-docs-content" sx={mdxStyles}>
              {currentGroup ? (
                <div className="graph-docs-current-group" sx={{ display: 'none' }}>
                  {currentGroup.title}
                </div>
              ) : null}
              {frontMatter.title ? <Heading.H1>{frontMatter.title}</Heading.H1> : null}
              <MDXProvider components={mdxComponents}>{children}</MDXProvider>
            </article>

            <Flex.Row sx={{ display: [null, null, null, 'none'], mt: Spacing['48px'] }}>
              <EditPageLink mobile />
            </Flex.Row>

            <div sx={{ mt: Spacing['64px'] }}>
              <MDXLayoutPagination />
            </div>
          </div>

          <div
            sx={{
              display: ['none', null, null, 'block'],
              mt: 'calc(-1 * var(--gds-header-height) * var(--gds-header-fixed))',
              marginInlineStart: '40px',
              marginInlineEnd: '-8px',
            }}
          >
            <MDXLayoutOutline />
          </div>
        </div>
      </DocumentContext.Provider>
    </NavContext.Provider>
  )
}

import { Folder, MdxFile, PageOpts } from 'nextra'

import { defaultLocale } from '@edgeandnode/components'

import { AppLocale } from '@/i18n'
import { Frontmatter } from '@/layout'

import { navigation } from './navigation'
import { NavItem, NavItemDefinition, NavItemPage, NavItemPromise } from './types'

const navItemsPromiseByLocale: { [key in AppLocale]?: NavItem[] } = {}

export const getNavItems = (locale: AppLocale = defaultLocale, pageMap: PageOpts['pageMap']): NavItem[] => {
  let navItemsPromise = navItemsPromiseByLocale[locale]

  if (!navItemsPromise) {
    const filteredPageMap =
      pageMap
        .find((pageItem): pageItem is Folder => 'name' in pageItem && pageItem.name === locale)
        ?.children.flatMap((o) => (o.kind === 'Folder' ? o.children : o.kind === 'Meta' ? [] : [o])) || []
    const definitions = navigation(locale)

    navItemsPromise = (() => {
      const handleDefinition = (definition: NavItemDefinition, parentPath?: string): NavItemPromise => {
        if ('divider' in definition || 'heading' in definition) {
          return definition
        }
        const path = `${parentPath ?? ''}/${definition.slug}`
        const children: NavItemPromise[] = []
        const isGroup = 'children' in definition
        if (isGroup) {
          for (const childDefinition of definition.children) {
            children.push(handleDefinition(childDefinition, path))
          }
        }
        return (() => {
          let title = definition.title
          if (!isGroup) {
            const frontMatter = filteredPageMap.find(
              (o): o is MdxFile<Frontmatter> => o.kind === 'MdxPage' && o.route === `/${locale}${path}`
            )?.frontMatter
            if (frontMatter) {
              title = frontMatter.navTitle ?? frontMatter.title
            }
          }
          title = title ?? '[MISSING TITLE]'
          const handledDefinition = {
            ...definition,
            title,
            path,
          }
          if (isGroup) {
            return {
              ...handledDefinition,
              children,
            }
          }
          return handledDefinition
        })()
      }

      const promises: NavItemPromise[] = []
      for (const definition of definitions) {
        promises.push(handleDefinition(definition))
      }

      const handlePromise = (promise: NavItemPromise): NavItem | null => {
        const item = promise
        if (item === null) {
          return null
        }
        if ('children' in item) {
          const children: NavItemPage[] = []
          for (const childPromise of item.children) {
            const child = handlePromise(childPromise)
            if (child !== null) {
              children.push(child as NavItemPage)
            }
          }
          return {
            ...item,
            children,
          }
        }
        return item
      }

      const items: (NavItem | null)[] = []
      for (const promise of promises) {
        items.push(handlePromise(promise))
      }

      let lastFilteredItem = null as NavItem | null
      const filteredItems: NavItem[] = items.filter((item) => {
        // Item is a page that doesn't exist in that locale
        if (item === null) {
          return false
        }
        // Item is a group with no existing pages in that locale
        if ('children' in item && item.children.length === 0) {
          return false
        }
        // Item is a divider that directly follows another divider due to missing pages/groups
        if ('divider' in item && lastFilteredItem !== null && 'divider' in lastFilteredItem) {
          return false
        }
        lastFilteredItem = item
        return true
      }) as NavItem[]

      // If the filtered items start with a divider due to missing pages/groups, remove it
      if (filteredItems.length > 0 && 'divider' in filteredItems[0]) {
        filteredItems.shift()
      }

      // If the filtered items end with a divider or a heading due to missing pages/groups, remove it
      if (lastFilteredItem && ('divider' in lastFilteredItem || 'heading' in lastFilteredItem)) {
        filteredItems.pop()
      }

      return filteredItems
    })()

    navItemsPromiseByLocale[locale] = navItemsPromise
  }

  return navItemsPromise
}

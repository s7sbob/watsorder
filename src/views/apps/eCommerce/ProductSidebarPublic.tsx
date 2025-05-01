import React from 'react'
import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Typography
} from '@mui/material'
import { useMediaQuery, Theme } from '@mui/material'

const drawerWidth = 240

interface Props {
  isMobileOpen: boolean
  onClose: () => void
  categories: string[]
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  sortBy: 'newest' | 'priceAsc' | 'priceDesc'
  onSortBy: (sort: 'newest' | 'priceAsc' | 'priceDesc') => void
  priceRange: 'All' | '0-50' | '50-100' | '100-200' | '200-99999'
  onPriceRange: (r: 'All' | '0-50' | '50-100' | '100-200' | '200-99999') => void
}

const ProductSidebarPublic: React.FC<Props> = ({
  isMobileOpen,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortBy,
  priceRange,
  onPriceRange
}) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'))

  return (
    <Drawer
      variant={lgUp ? 'permanent' : 'temporary'}
      open={isMobileOpen}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box'
        }
      }}
    >
      <List>
        {/* Category */}
        <Typography variant="subtitle2" sx={{ px: 2, pt: 2 }}>
          Filter by Category
        </Typography>
        {categories.map(cat => (
          <ListItemButton
            key={cat}
            selected={selectedCategory === cat}
            onClick={() => onSelectCategory(cat)}
          >
            <ListItemText primary={cat} />
          </ListItemButton>
        ))}
        <Divider />

        {/* Sort */}
        <Typography variant="subtitle2" sx={{ px: 2, pt: 2 }}>
          Sort By
        </Typography>
        <ListItemButton selected={sortBy === 'newest'} onClick={() => onSortBy('newest')}>
          <ListItemText primary="Newest" />
        </ListItemButton>
        <ListItemButton selected={sortBy === 'priceAsc'} onClick={() => onSortBy('priceAsc')}>
          <ListItemText primary="Price: Low–High" />
        </ListItemButton>
        <ListItemButton selected={sortBy === 'priceDesc'} onClick={() => onSortBy('priceDesc')}>
          <ListItemText primary="Price: High–Low" />
        </ListItemButton>
        <Divider />

        {/* Price Range */}
        <Typography variant="subtitle2" sx={{ px: 2, pt: 2 }}>
          By Pricing
        </Typography>
        {(['All', '0-50', '50-100', '100-200', '200-99999'] as const).map(r => (
          <ListItemButton
            key={r}
            selected={priceRange === r}
            onClick={() => onPriceRange(r)}
          >
            <ListItemText
              primary={r === 'All' ? 'All' : `${r.split('-').join(' – ')}`}
            />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  )
}

export default ProductSidebarPublic

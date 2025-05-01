// src/views/pages/ProductTableList.tsx
import React, { useState, useEffect } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Toolbar,
  IconButton,
  Tooltip,
  Typography,
  Avatar,
  TextField,
  InputAdornment,
  Paper,
  FormControlLabel
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'
import { IconFilter, IconSearch, IconTrash, IconDotsVertical } from '@tabler/icons-react'
import axiosServices from 'src/utils/axios'
import CustomSwitch from 'src/components/forms/theme-elements/CustomSwitch'

interface Product {
  id: number
  name: string
  price: number
  photo: string | null
  created: string
  status: 'InStock' | 'Out of Stock'
}

type Order = 'asc' | 'desc'

interface HeadCell {
  id: keyof Product | 'action'
  label: string
  numeric: boolean
}

const headCells: readonly HeadCell[] = [
  { id: 'name', label: 'Product', numeric: false },
  { id: 'created', label: 'Date', numeric: false },
  { id: 'status', label: 'Status', numeric: false },
  { id: 'price', label: 'Price', numeric: true },
  { id: 'action', label: 'Action', numeric: false }
]

// comparators
function descendingComparator<T>(a: T, b: T, key: keyof T) {
  return b[key] < a[key] ? -1 : b[key] > a[key] ? 1 : 0
}

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key
): (a: { [P in Key]: any }, b: { [P in Key]: any }) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy)
}

function stableSort<T>(array: T[], comparator: (a: T, b: T) => number) {
  const stabilized = array.map((el, idx) => [el, idx] as [T, number])
  stabilized.sort((a, b) => {
    const cmp = comparator(a[0], b[0])
    return cmp !== 0 ? cmp : a[1] - b[1]
  })
  return stabilized.map(el => el[0])
}

interface EnhancedTableProps {
  numSelected: number
  onRequestSort: (e: React.MouseEvent, prop: keyof Product) => void
  onSelectAllClick: (e: React.ChangeEvent<HTMLInputElement>) => void
  order: Order
  orderBy: keyof Product
  rowCount: number
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { order, orderBy, onRequestSort } = props
  const createSortHandler = (property: keyof Product) => (e: React.MouseEvent) => {
    onRequestSort(e, property)
  }

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          {/* you can add a checkbox here */}
        </TableCell>
        {headCells.map(headCell => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            {headCell.id !== 'action' ? (
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={createSortHandler(headCell.id as keyof Product)}
              >
                {headCell.label}
                {orderBy === headCell.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            ) : (
              headCell.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )
}

interface ToolbarProps {
  numSelected: number
  search: string
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const EnhancedTableToolbar: React.FC<ToolbarProps> = ({ numSelected, search, onSearch }) => {
  return (
    <Toolbar
      sx={{
        pl: 2,
        pr: 1,
        ...(numSelected > 0 && {
          bgcolor: theme =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity)
        })
      }}
    >
      {numSelected > 0 ? (
        <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1">
          {numSelected} selected
        </Typography>
      ) : (
        <Box sx={{ flex: '1 1 100%' }}>
          <TextField
            placeholder="Search Product"
            size="small"
            value={search}
            onChange={onSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size="1.1rem" />
                </InputAdornment>
              )
            }}
            fullWidth
          />
        </Box>
      )}

      {numSelected > 0 ? (
        <Tooltip title="Delete">
          <IconButton>
            <IconTrash />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Filter list">
          <IconButton>
            <IconFilter />
          </IconButton>
        </Tooltip>
      )}
    </Toolbar>
  )
}

interface Props {
  storeName: string
  onToggleSidebar: () => void
}

const ProductTableList: React.FC<Props> = ({ storeName }) => {
  const [order, setOrder] = useState<Order>('asc')
  const [orderBy, setOrderBy] = useState<keyof Product>('name')
  const [selected, setSelected] = useState<readonly string[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [dense, setDense] = useState(false)
  const [rows, setRows] = useState<Product[]>([])
  const [search, setSearch] = useState('')

  // fetch products
  useEffect(() => {
    axiosServices
      .get<Product[]>(`/api/public/ecommerce/${encodeURIComponent(storeName)}/products`)
      .then(res => {
        // assume API returns created & status too; if not you’ll need to map or extend here
        setRows(
          res.data.map(p => ({
            ...p,
            created: new Date().toISOString(),
            status: 'InStock'
          }))
        )
      })
  }, [storeName])

  const handleRequestSort = (
    _e: React.MouseEvent,
    property: keyof Product
  ) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleSelectAllClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(rows.map(r => r.name))
      return
    }
    setSelected([])
  }

  const handleClick = (_e: React.MouseEvent, name: string) => {
    const selectedIndex = selected.indexOf(name)
    let newSelected: readonly string[] = []
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name)
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1))
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1))
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      )
    }
    setSelected(newSelected)
  }

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage)
  }
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }
  const isSelected = (name: string) => selected.indexOf(name) !== -1
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0

  const filteredRows = rows.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const theme = useTheme()
  const borderColor = theme.palette.divider

  return (
    <Box>
      <EnhancedTableToolbar
        numSelected={selected.length}
        search={search}
        onSearch={handleSearch}
      />

      <Paper
        variant="outlined"
        sx={{ mx: 2, mt: 1, border: `1px solid ${borderColor}` }}
      >
        <TableContainer>
          <Table size={dense ? 'small' : 'medium'}>
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={filteredRows.length}
            />
            <TableBody>
              {stableSort(filteredRows, getComparator(order, orderBy))
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, idx) => {
                  const isItemSelected = isSelected(row.name)
                  const labelId = `enhanced-table-checkbox-${idx}`
                  const photoFile = row.photo
                    ? row.photo.split(/[/\\]/).pop()!
                    : null
                  const photoUrl = photoFile
                    ? `/product-images/${photoFile}`
                    : undefined

                  return (
                    <TableRow
                      hover
                      onClick={e => handleClick(e, row.name)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={row.id}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox" />

                      <TableCell component="th" id={labelId} scope="row">
                        <Box display="flex" alignItems="center">
                          <Avatar
                            src={photoUrl}
                            sx={{ width: 56, height: 56 }}
                          />
                          <Box ml={2}>
                            <Typography fontWeight={600}>
                              {row.name}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography>
                          {new Date(row.created).toLocaleDateString()}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography>
                          {row.status}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={600}>
                          ${row.price}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Tooltip title="More">
                          <IconButton size="small">
                            <IconDotsVertical />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              {emptyRows > 0 && (
                <TableRow style={{ height: (dense ? 33 : 53) * emptyRows }}>
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Box ml={2} mt={1}>
        <FormControlLabel
          control={
            <CustomSwitch
              checked={dense}
              onChange={(_: any, v: boolean | ((prevState: boolean) => boolean)) => setDense(v)}
            />
          }
          label="Dense padding"
        />
      </Box>
    </Box>
  )
}

export default ProductTableList

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';

// mui imports
import { ListItemIcon, styled, ListItemText,  ListItemButton } from '@mui/material';
import { useSelector } from 'src/store/Store';

// custom imports

// plugins
import { IconChevronDown } from '@tabler/icons-react';
import { AppState } from 'src/store/Store';

type NavGroupProps = {
  [x: string]: any;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: any;
};

interface NavCollapseProps {
  menu: NavGroupProps;
  level: number;
  pathWithoutLastPart: any;
  pathDirect: any;
  hideMenu: any;
  onClick: any;
}

// FC Component For Dropdown Menu
const NavCollapse = ({ menu, level, pathWithoutLastPart }: NavCollapseProps) => {
  const Icon = menu.icon;
  const theme = useTheme();
  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);
  const customizer = useSelector((state: AppState) => state.customizer);
  const menuIcon =
    level > 1 ? <Icon stroke={1.5} size="1rem" /> : <Icon stroke={1.5} size="1.1rem" />;

  React.useEffect(() => {
    setOpen(false);
    menu.children.forEach((item: any) => {
      if (item.href === pathname) {
        setOpen(true);
      }
    });
  }, [pathname, menu.children]);

  const ListItemStyled = styled(ListItemButton)(() => ({
    width: 'auto',
    padding: '5px 10px',
    position: 'relative',
    flexGrow: 'unset',
    gap: '10px',
    borderRadius: `${customizer.borderRadius}px`,
    whiteSpace: 'nowrap',
    color: open || pathname.includes(menu.href) || level < 1 ? 'white' : theme.palette.text.secondary,
    backgroundColor: open || pathname.includes(menu.href) ? theme.palette.primary.main : '',

    '&:hover': {
      backgroundColor:
        open || pathname.includes(menu.href)
          ? theme.palette.primary.main
          : theme.palette.primary.light,
    },
    '&:hover > .SubNav': { display: 'block' },
  }));


  const listItemProps: {
    component: string;
  } = {
    component: 'li',
  };

  // If Menu has Children

  return (
    <React.Fragment key={menu.id}>
      <ListItemStyled
        {...listItemProps}
        selected={pathWithoutLastPart === menu.href}
        className={open ? 'selected' : ''}
      >
        <ListItemIcon
          sx={{
            minWidth: 'auto',
            p: '3px 0',
            color: 'inherit',
          }}
        >
          {menuIcon}
        </ListItemIcon>
        <ListItemText color="inherit" sx={{ mr: 'auto' }}>
          {menu.title}
        </ListItemText>
        <IconChevronDown size="1rem" />

      </ListItemStyled>
    </React.Fragment>
  );
};

export default NavCollapse;

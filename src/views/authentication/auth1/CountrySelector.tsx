import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import { countries, CountryType } from 'src/data/Countries';
import { useTranslation } from 'react-i18next';

interface Props {
  onChange: (country: CountryType) => void;
  label?: string;
  showSearch?: boolean;
}

const CountrySelector: React.FC<Props> = ({ onChange, label, showSearch = true }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [openList, setOpenList] = useState(false);
  // تعيين الافتراضي إلى مصر، إذا لم توجد مصر نستخدم أول دولة في القائمة
  const egypt = countries.find((c) => c.code === 'EG') || countries[0];
  const [selectedCountry, setSelectedCountry] = useState<CountryType>(egypt);

  // عند تحميل المكون نقوم بتعيين مصر كافتراضي وإبلاغ الدالة onChange
  useEffect(() => {
    setSelectedCountry(egypt);
    onChange(egypt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [egypt]);

  const filteredCountries = countries.filter((country) =>
    country.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCountry = (country: CountryType) => {
    setSelectedCountry(country);
    setOpenList(false);
    onChange(country);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {label && (
        <Box component="span" sx={{ mb: 1, fontWeight: 500, display: 'block' }}>
          {t('countrySelector.label')}
        </Box>
      )}
      <Button
        variant="outlined"
        onClick={() => setOpenList(!openList)}
        sx={{ minWidth: '150px' }}
      >
        <img
          src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
          srcSet={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png 2x`}
          alt={selectedCountry.label}
          style={{ width: 20, marginRight: 8 }}
        />
        {selectedCountry.label}
      </Button>
      {openList && (
        <Box
          sx={{
            position: 'absolute',
            zIndex: 999,
            width: '100%',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            p: 1,
            borderRadius: 1,
          }}
        >
          {showSearch && (
            <>
              <TextField
                fullWidth
                placeholder={t('countrySelector.search') as string}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Divider sx={{ mb: 1 }} />
            </>
          )}

          <List sx={{ maxHeight: 250, overflowY: 'auto' }}>
            {filteredCountries.map((country) => (
              <ListItemButton
                key={country.code}
                onClick={() => handleSelectCountry(country)}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <img
                        src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                        srcSet={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png 2x`}
                        alt={country.label}
                        style={{ width: 20, marginRight: 8 }}
                      />
                      {country.label} (+{country.phone})
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default CountrySelector;

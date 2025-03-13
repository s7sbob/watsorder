// src/components/forms/phone/CountryPhoneSelector.tsx

import React, { useState } from 'react';
import {
  Box,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
  Button,
} from '@mui/material';

// استورد الواجهة + المصفوفة من ملف Countries.ts
import { countries, CountryType } from 'src/data/Countries';

interface Props {
  /**
   * دالة تُستدعى عند كل تغيير في الرقم الكامل (يشمل كود الدولة).
   * مثال: +20123456789
   */
  onChange: (fullPhone: string) => void;

  /**
   * الكود الافتراضي للدولة (مثل "+20" أو "+966").
   * سنحوّله من "+20" إلى "20" للمقارنة مع CountryType.phone.
   */
  defaultCountryCode?: string;

  /** عنوان يظهر فوق الحقل */
  label?: string;

  /** النص النائب (placeholder) للرقم المحلي */
  placeholder?: string;

  /** هل نعرض حقل البحث في قائمة الدول؟ */
  showSearch?: boolean;
}

/**
 * مكوّن يتيح اختيار الدولة من قائمة منسدلة (مع العلم من flagcdn.com)،
 * ثم إدخال الرقم المحلي. يعيد لك الرقم الكامل في onChange.
 */
const CountryPhoneSelector: React.FC<Props> = ({
  onChange,
  defaultCountryCode = '+20',
  label = 'Phone Number',
  placeholder = 'Enter your phone number',
  showSearch = true,
}) => {
  // حقل البحث داخل قائمة الدول
  const [search, setSearch] = useState('');
  // هل القائمة المنسدلة مفتوحة
  const [openList, setOpenList] = useState(false);
  // الرقم المحلي الذي يكتبه المستخدم
  const [localNumber, setLocalNumber] = useState('');

  // نزيل علامة '+' من الـ defaultCountryCode كي نطابقه مع phone في countries
  const numericCode = defaultCountryCode.replace('+', '');
  // ابحث عن الدولة الافتراضية من خلال حقل phone
  const defaultCountry = countries.find((c) => c.phone === numericCode);

  // إن لم نجد الدولة الافتراضية، نختار أول دولة في القائمة
  const [selectedCountry, setSelectedCountry] = useState<CountryType>(
    defaultCountry || countries[0]
  );

  // ترشيح الدول بناءً على البحث في الاسم (label)
  const filteredCountries = countries.filter((country) =>
    country.label.toLowerCase().includes(search.toLowerCase())
  );

  // دالة لحساب الرقم الكامل وإبلاغه للخارج
  const updateFullPhone = (country: CountryType, localNum: string) => {
    // إزالة الأصفار الزائدة من بداية الرقم
    const trimmed = localNum.replace(/^0+/, '');
    const full = `+${country.phone}${trimmed}`; 
    onChange(full);
  };

  // عند اختيار دولة من القائمة
  const handleSelectCountry = (country: CountryType) => {
    setSelectedCountry(country);
    setOpenList(false);
    // إعادة الحساب بالرقم الحالي
    updateFullPhone(country, localNumber);
  };

  // عند تغيير الرقم المحلي
  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalNumber(val);
    updateFullPhone(selectedCountry, val);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* العنوان label */}
      {label && (
        <Typography >
          {label}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {/* زر لفتح القائمة المنسدلة */}
        <Button
          variant="outlined"
          onClick={() => setOpenList(!openList)}
          sx={{ mr: 1, minWidth: '130px' }}
        >
          {/* عرض العلم من flagcdn + كود الدولة */}
          <img
            src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png 2x`}
            alt={selectedCountry.label}
            style={{ width: 20, marginRight: 8 }}
          />
          +{selectedCountry.phone}
        </Button>

        {/* حقل إدخال الرقم المحلي */}
        <TextField
          fullWidth
          placeholder={placeholder}
          value={localNumber}
          onChange={handleLocalNumberChange}
        />
      </Box>

      {/* القائمة المنسدلة لاختيار دولة أخرى */}
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
                placeholder="Search country..."
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
                {/* العلم + اسم الدولة + الكود */}
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

export default CountryPhoneSelector;

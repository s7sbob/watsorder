// src/layouts/BlankLayout.tsx
import { Outlet } from 'react-router-dom'
import Language from '../full/vertical/header/Language'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { AppState } from 'src/store/Store'
import { useEffect } from 'react'
export default function BlankLayout() {
  const lang = useSelector((s: AppState) => s.customizer.isLanguage)
  const { i18n } = useTranslation()

  useEffect(() => {
    i18n.changeLanguage(lang)
  }, [lang, i18n])


  return (
    <>
      <Language />      {/* now blank pages get your <Language/> logic too */}
      <Outlet />
    </>
  )
}

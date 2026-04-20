import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
// import dayjs from 'dayjs'
import {create} from 'zustand'
import {persist} from "zustand/middleware";

import i18next from '@pc/locales'

export type LocaleType = 'zh-CN' | 'en-US'

const localeMap = {
    'zh-CN': zhCN,
    'en-US': enUS
}
interface LocaleState {
    locale: LocaleType
    antdLocale: typeof zhCN | typeof enUS
    changeLocale: (locale: LocaleType) => void
}
export const useLocaleStore = create<LocaleState>()(
    persist(
        (set) => ({
            locale: (i18next.language as LocaleType) || 'zh-CN',
            antdLocale: i18next.language === 'zh-CN' ? zhCN : enUS,
            changeLocale: (locale: LocaleType) => {
                i18next.changeLanguage(locale)

                dayjs.locale(locale === 'zh-CN' ? 'zh-cn' : 'en')

                set({
                    locale,
                    antdLocale: localeMap[locale]
                })
            }
        }),
        {
            name: 'app-locale'
        }
    )
)

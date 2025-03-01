// src/utils/cookieHelpers.ts

export function getCookie(name: string): string | null {
    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (let c of ca) {
      let cookie = c.trim()
      if (cookie.startsWith(nameEQ)) {
        return cookie.substring(nameEQ.length)
      }
    }
    return null
  }
  
  export function setCookie(name: string, value: string, days = 1) {
    // days=1 => افتراضي يوم واحد؛ عدِّل كما تشاء
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    const expires = 'expires=' + date.toUTCString()
    document.cookie = `${name}=${value}; ${expires}; path=/`
  }
  
  export function deleteCookie(name: string) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
  }
  
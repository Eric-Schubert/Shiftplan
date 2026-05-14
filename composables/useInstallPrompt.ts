




const STORAGE_KEY = 'schichtplaner_installBannerDismissed'


const deferredPrompt = ref<any>(null)
const isInstallable = ref(false)
const isIOS = ref(false)
const isVisible = ref(false)

export function useInstallPrompt() {
  function init() {
    if (!import.meta.client) return


    if (localStorage.getItem(STORAGE_KEY)) return
    if (window.matchMedia('(display-mode: standalone)').matches) return


    const ua = navigator.userAgent
    isIOS.value = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream

    if (isIOS.value) {

      isVisible.value = true
      return
    }


    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault()
      deferredPrompt.value = e
      isInstallable.value = true
      isVisible.value = true
    })


    window.addEventListener('appinstalled', () => {
      isVisible.value = false
      deferredPrompt.value = null
    })
  }

  async function install() {
    if (!deferredPrompt.value) return
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      isVisible.value = false
    }
    deferredPrompt.value = null
  }

  function dismiss() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    isVisible.value = false
  }

  return {
    isVisible: computed(() => isVisible.value),
    isInstallable: computed(() => isInstallable.value),
    isIOS: computed(() => isIOS.value),
    init,
    install,
    dismiss,
  }
}

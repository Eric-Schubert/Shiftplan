export {}

declare module 'vue' {
  export interface GlobalComponents {
    PrimeButton: typeof import('primevue/button')['default']
    PrimeCheckbox: typeof import('primevue/checkbox')['default']
    PrimeColumn: typeof import('primevue/column')['default']
    PrimeDataTable: typeof import('primevue/datatable')['default']
    PrimeDialog: typeof import('primevue/dialog')['default']
    PrimeInputNumber: typeof import('primevue/inputnumber')['default']
    PrimeInputText: typeof import('primevue/inputtext')['default']
    PrimeProgressSpinner: typeof import('primevue/progressspinner')['default']
    PrimeSelect: typeof import('primevue/select')['default']
    PrimeTab: typeof import('primevue/tab')['default']
    PrimeTabList: typeof import('primevue/tablist')['default']
    PrimeTabPanel: typeof import('primevue/tabpanel')['default']
    PrimeTabPanels: typeof import('primevue/tabpanels')['default']
    PrimeTabs: typeof import('primevue/tabs')['default']
    PrimeTag: typeof import('primevue/tag')['default']
    PrimeTextarea: typeof import('primevue/textarea')['default']
    RouterLink: typeof import('vue-router')['RouterLink']
    RouterView: typeof import('vue-router')['RouterView']
  }
}

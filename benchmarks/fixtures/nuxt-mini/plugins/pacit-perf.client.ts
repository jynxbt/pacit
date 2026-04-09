export default defineNuxtPlugin(() => {
  const mark = (name: string) => {
    if (typeof (window as any).__pacitMark === 'function') {
      (window as any).__pacitMark(name)
    }
  }
  return {
    provide: { pacitMark: mark },
  }
})

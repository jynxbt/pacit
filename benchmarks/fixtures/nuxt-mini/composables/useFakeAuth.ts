export function useFakeAuth() {
  const isAuthenticated = ref(false)
  const user = ref<{ id: string; name: string } | null>(null)

  onMounted(() => {
    // Simulate a quick auth check
    setTimeout(() => {
      isAuthenticated.value = true
      user.value = { id: '1', name: 'bench-user' }
    }, 10)
  })

  return { isAuthenticated, user }
}

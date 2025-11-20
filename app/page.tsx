import { redirect } from 'next/navigation'

export default async function Home() {
  // Redirect to a popular restaurant (replace with homepage/restaurant listing page when built)
  redirect('/r/econo-pizza-1009')
}

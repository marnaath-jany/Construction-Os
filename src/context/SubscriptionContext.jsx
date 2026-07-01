import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { useAuth } from './AuthContext'

const SubscriptionContext = createContext()

const PLAN_LIMITS = {
  free:     { projects: 1,        members: 3,         label: 'Free' },
  starter:  { projects: 5,        members: 10,        label: 'Starter' },
  pro:      { projects: 20,       members: 50,        label: 'Pro' },
  business: { projects: Infinity, members: Infinity,  label: 'Business' },
}

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchSubscription()
    else { setSubscription(null); setLoading(false) }
  }, [user])

  async function fetchSubscription() {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!data) {
      await supabase.from('subscriptions').insert([{ user_id: user.id, plan: 'free', status: 'active' }])
      setSubscription({ plan: 'free', status: 'active' })
    } else {
      setSubscription(data)
    }
    setLoading(false)
  }

  async function upgradePlan(plan, transactionId, txRef) {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const { data } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan,
        flw_transaction_id: transactionId,
        flw_tx_ref: txRef,
        status: 'active',
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single()

    setSubscription(data)
  }

  const plan = subscription?.plan || 'free'
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

  function canCreateProject(currentCount) {
    return currentCount < limits.projects
  }

  function canAddMember(currentCount) {
    return currentCount < limits.members
  }

  return (
    <SubscriptionContext.Provider value={{
      subscription, plan, limits, loading,
      canCreateProject, canAddMember,
      upgradePlan, refetch: fetchSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() { return useContext(SubscriptionContext) }